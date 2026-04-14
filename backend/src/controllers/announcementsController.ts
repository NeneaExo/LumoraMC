// ===== src/controllers/announcementsController.ts =====

import { Request, Response } from "express";
import { dbRun, dbGet, dbAll } from "../models/database";
import { wsBroadcast } from "../websocket/wsServer";

interface AnnouncementRow {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  sections?: string;
  author: string;
  author_id: number;
  pinned: number;
  created_at: string;
  updated_at: string;
}

function mapAnn(row: AnnouncementRow) {
  return {
    ...row,
    author_username: row.author,
    pinned: row.pinned === 1 || (row.pinned as any) === true,
  };
}

export async function getAnnouncements(req: Request, res: Response): Promise<void> {
  try {
    const rows = await dbAll<AnnouncementRow>(
      `SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC`
    );
    res.json({ success: true, announcements: rows.map(mapAnn) });
  } catch (error) {
    console.error("getAnnouncements error:", error);
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

export async function getAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const row = await dbGet<AnnouncementRow>("SELECT * FROM announcements WHERE id = ?", [req.params.id]);
    if (!row) { res.status(404).json({ success: false, message: "Anunț negăsit" }); return; }
    res.json({ success: true, announcement: mapAnn(row) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const { title, content, pinned = false, image_url = null, sections = null } = req.body;
    if (!title || !content) { res.status(400).json({ success: false, message: "Titlu și conținut obligatorii" }); return; }
    const sectionsJson = sections ? (typeof sections === "string" ? sections : JSON.stringify(sections)) : null;
    const result = await dbRun(
      `INSERT INTO announcements (title, content, image_url, sections, pinned, author, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), content.trim(), image_url, sectionsJson, pinned ? 1 : 0, req.user!.username, req.user!.userId]
    );
    const row = await dbGet<AnnouncementRow>("SELECT * FROM announcements WHERE id = ?", [result.lastID]);
    const announcement = row ? mapAnn(row) : null;
    wsBroadcast("announcement:new", announcement);
    res.status(201).json({ success: true, message: "Anunț creat", announcement });
  } catch (error) {
    console.error("createAnnouncement error:", error);
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

export async function updateAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const row = await dbGet<AnnouncementRow>("SELECT * FROM announcements WHERE id = ?", [req.params.id]);
    if (!row) { res.status(404).json({ success: false, message: "Anunț negăsit" }); return; }
    if (req.user!.role !== "admin" && row.author_id !== req.user!.userId) { res.status(403).json({ success: false, message: "Nu poți edita anunțul altcuiva" }); return; }
    const { title, content, pinned, image_url, sections } = req.body;
    const sectionsJson = sections !== undefined ? (typeof sections === "string" ? sections : JSON.stringify(sections)) : null;
    await dbRun(
      `UPDATE announcements SET title=COALESCE(?,title), content=COALESCE(?,content), image_url=COALESCE(?,image_url), sections=COALESCE(?,sections), pinned=COALESCE(?,pinned), updated_at=datetime('now') WHERE id=?`,
      [title||null, content||null, image_url!==undefined?image_url:null, sectionsJson, pinned!==undefined?(pinned?1:0):null, req.params.id]
    );
    const updated = await dbGet<AnnouncementRow>("SELECT * FROM announcements WHERE id = ?", [req.params.id]);
    const announcement = updated ? mapAnn(updated) : null;
    wsBroadcast("announcement:updated", announcement);
    res.json({ success: true, message: "Anunț actualizat", announcement });
  } catch (error) {
    console.error("updateAnnouncement error:", error);
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

export async function deleteAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const row = await dbGet<AnnouncementRow>("SELECT * FROM announcements WHERE id = ?", [req.params.id]);
    if (!row) { res.status(404).json({ success: false, message: "Anunț negăsit" }); return; }
    if (req.user!.role !== "admin" && row.author_id !== req.user!.userId) { res.status(403).json({ success: false, message: "Nu poți șterge anunțul altcuiva" }); return; }
    await dbRun("DELETE FROM announcements WHERE id = ?", [req.params.id]);
    wsBroadcast("announcement:deleted", { id: req.params.id });
    res.json({ success: true, message: "Anunț șters" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}
