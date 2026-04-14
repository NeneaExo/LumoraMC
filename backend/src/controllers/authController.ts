// ===== src/controllers/authController.ts =====

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbRun, dbGet, dbAll } from "../models/database";
import { User, PublicUser, JWTPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function toPublicUser(user: User): PublicUser {
  const { password_hash, ...publicUser } = user;
  return publicUser;
}

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, password, email, role } = req.body;

    if (!username || !password) {
      res
        .status(400)
        .json({
          success: false,
          message: "Username și parola sunt obligatorii",
        });
      return;
    }

    if (password.length < 6) {
      res
        .status(400)
        .json({
          success: false,
          message: "Parola trebuie să aibă minim 6 caractere",
        });
      return;
    }

    const existing = await dbGet("SELECT id FROM users WHERE username = ?", [
      username,
    ]);
    if (existing) {
      res
        .status(409)
        .json({ success: false, message: "Username-ul este deja folosit" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const countRow = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM users",
    );
    const userCount = countRow?.count ?? 0;
    const assignedRole = userCount === 0 ? "admin" : role || "player";

    const result = await dbRun(
      `INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?)`,
      [username, password_hash, assignedRole, email || null],
    );

    if (["admin", "moderator", "helper"].includes(assignedRole)) {
      await dbRun("INSERT OR IGNORE INTO staff_status (user_id) VALUES (?)", [
        result.lastID,
      ]);
    }

    const user = await dbGet<User>("SELECT * FROM users WHERE id = ?", [
      result.lastID,
    ]);
    if (!user) {
      res
        .status(500)
        .json({ success: false, message: "Eroare la crearea contului" });
      return;
    }

    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    res.status(201).json({
      success: true,
      message: "Cont creat cu succes",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res
        .status(400)
        .json({
          success: false,
          message: "Username și parola sunt obligatorii",
        });
      return;
    }

    const user = await dbGet<User>("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "Username sau parola incorectă" });
      return;
    }

    if (!user.password_hash) {
      console.error("password_hash is null/undefined for user:", username);
      res
        .status(500)
        .json({ success: false, message: "Eroare internă server" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res
        .status(401)
        .json({ success: false, message: "Username sau parola incorectă" });
      return;
    }

    await dbRun("UPDATE users SET last_login = datetime('now') WHERE id = ?", [
      user.id,
    ]);

    await dbRun(
      `INSERT INTO staff_status (user_id, online_panel, last_seen) VALUES (?, 1, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET online_panel = 1, last_seen = datetime('now')`,
      [user.id],
    );

    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    res.json({
      success: true,
      message: "Autentificare reușită",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    if (req.user) {
      await dbRun(
        `UPDATE staff_status SET online_panel = 0, last_seen = datetime('now') WHERE user_id = ?`,
        [req.user.userId],
      );
    }
    res.json({ success: true, message: "Deconectat cu succes" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/auth/me
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await dbGet<User>("SELECT * FROM users WHERE id = ?", [
      req.user!.userId,
    ]);

    if (!user) {
      res.status(404).json({ success: false, message: "Utilizator negăsit" });
      return;
    }

    res.json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/auth/users — lista utilizatori (admin)
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await dbAll(
      `SELECT u.id, u.username, u.role, u.email, u.discord_id, u.created_at, u.last_login,
              ss.online_minecraft, ss.online_panel, ss.last_seen
       FROM users u
       LEFT JOIN staff_status ss ON u.id = ss.user_id
       ORDER BY u.created_at DESC`,
    );
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// PUT /api/auth/users/:id/role — schimba rol (admin)
export async function updateUserRole(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ["admin", "moderator", "helper", "player"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, message: "Rol invalid" });
      return;
    }

    if (parseInt(id) === req.user!.userId) {
      res
        .status(403)
        .json({ success: false, message: "Nu îți poți schimba propriul rol" });
      return;
    }

    await dbRun("UPDATE users SET role = ? WHERE id = ?", [role, id]);

    if (["admin", "moderator", "helper"].includes(role)) {
      await dbRun("INSERT OR IGNORE INTO staff_status (user_id) VALUES (?)", [
        id,
      ]);
    }

    res.json({ success: true, message: "Rol actualizat" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/auth/staff — lista staff (admin/mod/helper)
export async function getStaff(req: Request, res: Response): Promise<void> {
  try {
    const staff = await dbAll(
      `SELECT u.id, u.username, u.role,
              COALESCE(ss.online_panel, 0) as online,
              ss.last_seen
       FROM users u
       LEFT JOIN staff_status ss ON u.id = ss.user_id
       WHERE u.role IN ('admin', 'moderator', 'helper')
       ORDER BY CASE u.role
         WHEN 'admin' THEN 1
         WHEN 'moderator' THEN 2
         WHEN 'helper' THEN 3
         ELSE 4
       END, u.username ASC`,
    );
    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/auth/stats — statistici generale
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const totalRow = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM users",
    );
    const newRow = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-24 hours')",
    );
    const bannedRow = await dbGet<{ count: number }>(
      `SELECT COUNT(DISTINCT target_username) as count FROM moderation_actions WHERE type = 'ban'`,
    );

    res.json({
      success: true,
      total_players: totalRow?.count ?? 0,
      new_players_24h: newRow?.count ?? 0,
      banned_count: bannedRow?.count ?? 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}
