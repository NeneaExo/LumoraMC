// ===== src/middleware/auth.ts =====
// Middleware autentificare JWT si verificare roluri

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWTPayload, UserRole } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Verifica token JWT
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Token lipsă sau invalid" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Token expirat sau invalid" });
  }
}

// Verifica ca userul are rolul necesar
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Neautentificat" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Acces interzis. Roluri necesare: ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

// Verifica API key pentru Minecraft plugin
export function authenticatePlugin(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.MINECRAFT_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    res.status(401).json({ success: false, message: "API key invalid" });
    return;
  }

  next();
}

// Helpers
export const isAdmin = requireRole("admin");
export const isStaff = requireRole("admin", "moderator", "helper");
export const isMod = requireRole("admin", "moderator");
