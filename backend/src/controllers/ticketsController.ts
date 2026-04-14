// ===== src/controllers/ticketsController.ts =====

import { Request, Response } from "express";
import { dbRun, dbGet, dbAll } from "../models/database";
import { Ticket, TicketReply } from "../types";
import { wsBroadcast } from "../websocket/wsServer";

// GET /api/tickets
export async function getTickets(req: Request, res: Response): Promise<void> {
  try {
    const { status, priority, category, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = "SELECT * FROM tickets WHERE 1=1";
    const params: unknown[] = [];

    if (status) { query += " AND status = ?"; params.push(status); }
    if (priority) { query += " AND priority = ?"; params.push(priority); }
    if (category) { query += " AND category = ?"; params.push(category); }

    if (req.user!.role === "player") {
      query += " AND created_by_id = ?";
      params.push(req.user!.userId);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const tickets = await dbAll<Ticket>(query, params);
    const countRow = await dbGet<{ count: number }>("SELECT COUNT(*) as count FROM tickets");
    const total = countRow?.count ?? 0;

    res.json({ success: true, tickets, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/tickets/:id
export async function getTicket(req: Request, res: Response): Promise<void> {
  try {
    const ticket = await dbGet<Ticket>("SELECT * FROM tickets WHERE id = ?", [req.params.id]);
    if (!ticket) {
      res.status(404).json({ success: false, message: "Ticket negăsit" });
      return;
    }

    if (req.user!.role === "player" && ticket.created_by_id !== req.user!.userId) {
      res.status(403).json({ success: false, message: "Acces interzis" });
      return;
    }

    const replies = await dbAll<TicketReply>(
      "SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC",
      [req.params.id]
    );

    res.json({ success: true, ticket, replies });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/tickets
export async function createTicket(req: Request, res: Response): Promise<void> {
  try {
    // acceptă atât 'content' cât și 'description' (frontend folosește description)
    const { title, content, description, category = "support", priority = "medium" } = req.body;
    const body = content || description || "";

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, message: "Titlul este obligatoriu" });
      return;
    }

    const result = await dbRun(
      `INSERT INTO tickets (title, content, category, priority, created_by, created_by_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [title.trim(), body.trim(), category, priority, req.user!.username, req.user!.userId]
    );

    const ticket = await dbGet<Ticket>("SELECT * FROM tickets WHERE id = ?", [result.lastID]);
    wsBroadcast("ticket:new", ticket);
    res.status(201).json({ success: true, message: "Ticket creat", ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// PUT /api/tickets/:id
export async function updateTicket(req: Request, res: Response): Promise<void> {
  try {
    const ticket = await dbGet<Ticket>("SELECT * FROM tickets WHERE id = ?", [req.params.id]);
    if (!ticket) {
      res.status(404).json({ success: false, message: "Ticket negăsit" });
      return;
    }

    const { status, priority, assigned_to_id } = req.body;

    let assignedUsername = ticket.assigned_to;
    if (assigned_to_id) {
      const staff = await dbGet<{ username: string }>("SELECT username FROM users WHERE id = ?", [assigned_to_id]);
      assignedUsername = staff?.username;
    }

    await dbRun(
      `UPDATE tickets SET
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        assigned_to = ?,
        assigned_to_id = ?,
        updated_at = datetime('now'),
        closed_at = CASE WHEN ? = 'closed' THEN datetime('now') ELSE closed_at END
       WHERE id = ?`,
      [status || null, priority || null, assignedUsername || null, assigned_to_id || null, status || null, req.params.id]
    );

    const updated = await dbGet<Ticket>("SELECT * FROM tickets WHERE id = ?", [req.params.id]);
    wsBroadcast("ticket:updated", updated);
    res.json({ success: true, message: "Ticket actualizat", ticket: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/tickets/:id/reply
export async function replyToTicket(req: Request, res: Response): Promise<void> {
  try {
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ success: false, message: "Conținut obligatoriu" });
      return;
    }

    const ticket = await dbGet<Ticket>("SELECT * FROM tickets WHERE id = ?", [req.params.id]);
    if (!ticket) {
      res.status(404).json({ success: false, message: "Ticket negăsit" });
      return;
    }

    if (ticket.status === "closed" && req.user!.role === "player") {
      res.status(403).json({ success: false, message: "Ticket-ul este închis" });
      return;
    }

    // Ensure author_role column exists (migration safety)
    try {
      await dbRun("ALTER TABLE ticket_replies ADD COLUMN author_role TEXT DEFAULT 'player'");
    } catch (_) {
      // Column already exists — ignore
    }

    const result = await dbRun(
      `INSERT INTO ticket_replies (ticket_id, content, author, author_id, author_role) VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, content.trim(), req.user!.username, req.user!.userId, req.user!.role]
    );

    await dbRun("UPDATE tickets SET updated_at = datetime('now') WHERE id = ?", [req.params.id]);

    const reply = await dbGet<TicketReply>("SELECT * FROM ticket_replies WHERE id = ?", [result.lastID]);
    wsBroadcast("ticket:reply", { ticketId: req.params.id, reply });
    res.status(201).json({ success: true, message: "Răspuns adăugat", reply });
  } catch (error) {
    console.error("replyToTicket error:", error);
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// DELETE /api/tickets/:id (admin only)
export async function deleteTicket(req: Request, res: Response): Promise<void> {
  try {
    await dbRun("DELETE FROM tickets WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Ticket șters" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}
