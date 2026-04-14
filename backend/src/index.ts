// ===== src/index.ts =====
// Entry point — Express + WebSocket server

import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import dotenv from "dotenv";
import { getDb } from "./models/database";
import { initializeWebSocket, getConnectedCount } from "./websocket/wsServer";
import routes from "./routes";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ===== MIDDLEWARE =====
app.use(cors({
  origin: [FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ===== ROUTES =====
app.use("/api", routes);

// Health check
app.get("/health", (_req, res) => {
  const db = getDb();
  const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;

  res.json({
    status: "ok",
    server: "Netheris Panel API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    db: "connected",
    users: userCount,
    ws_clients: getConnectedCount(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Endpoint negăsit" });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ success: false, message: "Eroare internă server" });
});

// ===== START =====
const server = http.createServer(app);

// Initializeaza WebSocket
initializeWebSocket(server);

// Initializeaza DB
getDb();

server.listen(PORT, () => {
  console.log("");
  console.log("🔥 ================================");
  console.log(`🔥  NETHERIS PANEL BACKEND`);
  console.log("🔥 ================================");
  console.log(`🌐  API:       http://localhost:${PORT}/api`);
  console.log(`❤️   Health:   http://localhost:${PORT}/health`);
  console.log(`🔌  WS:        ws://localhost:${PORT}/ws`);
  console.log(`📦  DB:        ${process.env.DB_PATH || "./netheris.db"}`);
  console.log("🔥 ================================");
  console.log("");
});

export default app;
