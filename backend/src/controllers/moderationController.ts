// ===== src/controllers/moderationController.ts =====

import { Request, Response } from "express";
import { dbRun, dbGet, dbAll } from "../models/database";
import { ModerationAction } from "../types";
import { wsBroadcast } from "../websocket/wsServer";

// GET /api/moderation — lista actiuni
export async function getActions(req: Request, res: Response): Promise<void> {
  try {
    const { type, target, page = 1, limit = 30 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = "SELECT * FROM moderation_actions WHERE 1=1";
    const params: unknown[] = [];

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }
    if (target) {
      query += " AND target_username LIKE ?";
      params.push(`%${target}%`);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const actions = await dbAll<ModerationAction>(query, params);
    const countRow = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM moderation_actions",
    );
    const total = countRow?.count ?? 0;

    res.json({ success: true, actions, total });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/moderation — staff efectueaza actiune din panel
export async function createAction(req: Request, res: Response): Promise<void> {
  try {
    const { type, target_username, target_uuid, reason, duration } = req.body;

    if (!type || !target_username || !reason) {
      res
        .status(400)
        .json({ success: false, message: "Tip, target și motiv obligatorii" });
      return;
    }

    const result = await dbRun(
      `INSERT INTO moderation_actions (type, target_username, target_uuid, performed_by, performed_by_id, reason, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        target_username,
        target_uuid || null,
        req.user!.username,
        req.user!.userId,
        reason,
        duration || null,
      ],
    );

    const action = await dbGet<ModerationAction>(
      "SELECT * FROM moderation_actions WHERE id = ?",
      [result.lastID],
    );

    wsBroadcast("moderation:action", action);

    res
      .status(201)
      .json({ success: true, message: "Acțiune înregistrată", action });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/moderation/player/:username
export async function getPlayerHistory(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actions = await dbAll<ModerationAction>(
      `SELECT * FROM moderation_actions WHERE target_username = ? COLLATE NOCASE ORDER BY created_at DESC`,
      [req.params.username],
    );
    res.json({ success: true, actions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/moderation/recent — ultimele 10 actiuni pentru dashboard
export async function getRecentActions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actions = await dbAll<ModerationAction>(
      `SELECT * FROM moderation_actions ORDER BY created_at DESC LIMIT 10`,
    );
    res.json({ success: true, actions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}
