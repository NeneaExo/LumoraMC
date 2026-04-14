// ===== src/controllers/minecraftController.ts =====
// Endpoint-uri apelate de plugin-ul Minecraft

import { Request, Response } from "express";
import { getDb } from "../models/database";
import { wsBroadcast } from "../websocket/wsServer";

// POST /api/minecraft/players/sync
// Plugin-ul trimite lista completa de jucatori online
export function syncPlayers(req: Request, res: Response): void {
  try {
    const { players } = req.body;

    if (!Array.isArray(players)) {
      res.status(400).json({ success: false, message: "Format invalid" });
      return;
    }

    const db = getDb();

    // Seteaza toti offline mai intai
    db.prepare(
      "UPDATE minecraft_players SET online = 0, ping = NULL, world = NULL, joined_at = NULL",
    ).run();

    // Upsert fiecare jucator online
    const upsert = db.prepare(`
      INSERT INTO minecraft_players (uuid, username, online, ip, world, ping, joined_at, last_seen)
      VALUES (?, ?, 1, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(uuid) DO UPDATE SET
        username = excluded.username,
        online = 1,
        ip = excluded.ip,
        world = excluded.world,
        ping = excluded.ping,
        joined_at = excluded.joined_at,
        last_seen = datetime('now')
    `);

    const transaction = db.transaction(() => {
      for (const p of players) {
        upsert.run(
          p.uuid,
          p.username,
          p.ip || null,
          p.world || null,
          p.ping || null,
          p.joinedAt || null,
        );
      }
    });

    transaction();

    // Broadcasteaza la toti clientii WebSocket
    wsBroadcast("minecraft:players_update", { players, count: players.length });

    res.json({ success: true, synced: players.length });
  } catch (error) {
    console.error("Sync players error:", error);
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/minecraft/players/:uuid/join
// Jucator s-a conectat
export function playerJoin(req: Request, res: Response): void {
  try {
    const { uuid } = req.params;
    const { username, ip, world } = req.body;

    const db = getDb();
    db.prepare(
      `
      INSERT INTO minecraft_players (uuid, username, online, ip, world, joined_at, last_seen)
      VALUES (?, ?, 1, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(uuid) DO UPDATE SET
        username = ?,
        online = 1,
        ip = ?,
        world = ?,
        joined_at = datetime('now'),
        last_seen = datetime('now')
    `,
    ).run(
      uuid,
      username,
      ip || null,
      world || null,
      username,
      ip || null,
      world || null,
    );

    const onlineCount = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM minecraft_players WHERE online = 1",
        )
        .get() as { count: number }
    ).count;

    wsBroadcast("minecraft:player_join", { uuid, username, onlineCount });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/minecraft/players/:uuid/quit
// Jucator a iesit
export function playerQuit(req: Request, res: Response): void {
  try {
    const { uuid } = req.params;
    const { playtime } = req.body; // minute petrecute in sesiunea aceasta

    const db = getDb();
    db.prepare(
      `
      UPDATE minecraft_players SET
        online = 0,
        ping = NULL,
        world = NULL,
        joined_at = NULL,
        last_seen = datetime('now'),
        total_playtime = total_playtime + ?
      WHERE uuid = ?
    `,
    ).run(playtime || 0, uuid);

    const player = db
      .prepare("SELECT username FROM minecraft_players WHERE uuid = ?")
      .get(uuid) as { username: string } | undefined;
    const onlineCount = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM minecraft_players WHERE online = 1",
        )
        .get() as { count: number }
    ).count;

    wsBroadcast("minecraft:player_quit", {
      uuid,
      username: player?.username,
      onlineCount,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/minecraft/stats
// Plugin trimite statistici server la fiecare minut
export function updateServerStats(req: Request, res: Response): void {
  try {
    const { players_online, players_max, tps, ram_used, ram_max, uptime } =
      req.body;

    const db = getDb();
    db.prepare(
      `
      INSERT INTO server_stats (players_online, players_max, tps, ram_used, ram_max, uptime)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      players_online || 0,
      players_max || 500,
      tps || 20.0,
      ram_used || 0,
      ram_max || 4096,
      uptime || 0,
    );

    // Pastreaza doar ultimele 24 ore de stats
    db.prepare(
      `
      DELETE FROM server_stats
      WHERE recorded_at < datetime('now', '-24 hours')
    `,
    ).run();

    wsBroadcast("server:stats_update", {
      players_online,
      players_max,
      tps,
      ram_used,
      ram_max,
      uptime,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/minecraft/staff/:username/status
// Plugin anunta cand un staff member se conecteaza/deconecteaza pe MC
export function updateStaffStatus(req: Request, res: Response): void {
  try {
    const { username } = req.params;
    const { online, world } = req.body;

    const db = getDb();

    // Gaseste userul dupa username
    const user = db
      .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
      .get(username) as { id: number } | undefined;

    if (!user) {
      res.status(404).json({ success: false, message: "Staff member negăsit" });
      return;
    }

    db.prepare(
      `
      INSERT INTO staff_status (user_id, online_minecraft, last_seen, current_world)
      VALUES (?, ?, datetime('now'), ?)
      ON CONFLICT(user_id) DO UPDATE SET
        online_minecraft = ?,
        last_seen = datetime('now'),
        current_world = ?
    `,
    ).run(
      user.id,
      online ? 1 : 0,
      world || null,
      online ? 1 : 0,
      world || null,
    );

    // Trimite update la toti clientii
    const staffList = db
      .prepare(
        `
      SELECT u.id, u.username, u.role, ss.online_minecraft, ss.online_panel, ss.last_seen, ss.current_world
      FROM users u
      JOIN staff_status ss ON u.id = ss.user_id
      WHERE u.role IN ('admin', 'moderator', 'helper')
      ORDER BY u.role, u.username
    `,
      )
      .all();

    wsBroadcast("staff:status_update", staffList);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/minecraft/players — lista jucatori online
export function getOnlinePlayers(req: Request, res: Response): void {
  try {
    const db = getDb();
    const players = db
      .prepare(
        `
      SELECT uuid, username, world, ping, joined_at, total_playtime
      FROM minecraft_players
      WHERE online = 1
      ORDER BY joined_at ASC
    `,
      )
      .all();

    const total = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM minecraft_players WHERE online = 1",
        )
        .get() as { count: number }
    ).count;

    res.json({ success: true, players, total });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/minecraft/stats/history — grafic 24h
export function getStatsHistory(req: Request, res: Response): void {
  try {
    const db = getDb();
    const stats = db
      .prepare(
        `
      SELECT
        strftime('%H', recorded_at) as hour,
        AVG(players_online) as avg_players,
        MAX(players_online) as max_players,
        AVG(tps) as avg_tps,
        recorded_at
      FROM server_stats
      WHERE recorded_at > datetime('now', '-24 hours')
      GROUP BY strftime('%H', recorded_at)
      ORDER BY recorded_at ASC
    `,
      )
      .all();

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/minecraft/staff — lista staff cu status
export function getStaffStatus(req: Request, res: Response): void {
  try {
    const db = getDb();
    const staff = db
      .prepare(
        `
      SELECT u.id, u.username, u.role, u.avatar,
             ss.online_minecraft, ss.online_panel, ss.last_seen, ss.current_world
      FROM users u
      LEFT JOIN staff_status ss ON u.id = ss.user_id
      WHERE u.role IN ('admin', 'moderator', 'helper')
      ORDER BY
        CASE u.role WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END,
        ss.online_minecraft DESC,
        u.username ASC
    `,
      )
      .all();

    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/minecraft/moderation — plugin raporteaza o actiune de moderare
export function reportModerationAction(req: Request, res: Response): void {
  try {
    const {
      type,
      target_username,
      target_uuid,
      performed_by,
      reason,
      duration,
    } = req.body;

    if (!type || !target_username || !performed_by || !reason) {
      res
        .status(400)
        .json({ success: false, message: "Câmpuri obligatorii lipsă" });
      return;
    }

    const db = getDb();

    // Gaseste staff-ul
    const staffUser = db
      .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
      .get(performed_by) as { id: number } | undefined;
    const staffId = staffUser?.id || 0;

    // Calculeaza expires_at daca are durata
    let expiresAt = null;
    if (duration && duration !== "permanent") {
      const match = duration.match(/^(\d+)(d|h|m)$/);
      if (match) {
        const amount = parseInt(match[1]);
        const unit =
          match[2] === "d" ? "days" : match[2] === "h" ? "hours" : "minutes";
        expiresAt = `datetime('now', '+${amount} ${unit}')`;
      }
    }

    db.prepare(
      `
      INSERT INTO moderation_actions (type, target_username, target_uuid, performed_by, performed_by_id, reason, duration, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ${expiresAt || "NULL"})
    `,
    ).run(
      type,
      target_username,
      target_uuid || null,
      performed_by,
      staffId,
      reason,
      duration || null,
    );

    // Actualizeaza status ban/mute pe jucatorul MC
    if (type === "ban") {
      db.prepare(
        "UPDATE minecraft_players SET is_banned = 1 WHERE uuid = ? OR username = ?",
      ).run(target_uuid || "", target_username);
    } else if (type === "unban") {
      db.prepare(
        "UPDATE minecraft_players SET is_banned = 0 WHERE uuid = ? OR username = ?",
      ).run(target_uuid || "", target_username);
    } else if (type === "mute") {
      db.prepare(
        "UPDATE minecraft_players SET is_muted = 1 WHERE uuid = ? OR username = ?",
      ).run(target_uuid || "", target_username);
    } else if (type === "unmute") {
      db.prepare(
        "UPDATE minecraft_players SET is_muted = 0 WHERE uuid = ? OR username = ?",
      ).run(target_uuid || "", target_username);
    }

    wsBroadcast("moderation:action", {
      type,
      target_username,
      performed_by,
      reason,
    });

    res.status(201).json({ success: true, message: "Acțiune înregistrată" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}
