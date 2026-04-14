// ===== src/websocket/wsServer.ts =====
// WebSocket server pentru actualizari in timp real

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { JWTPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

interface AuthenticatedWebSocket extends WebSocket {
  user?: JWTPayload;
  isAlive?: boolean;
}

let wss: WebSocketServer;
const clients = new Set<AuthenticatedWebSocket>();

export function initializeWebSocket(server: import("http").Server): void {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    ws.isAlive = true;

    // Autentificare prin URL param: ws://localhost:3001/ws?token=xxx
    const url = new URL(req.url || "", "http://localhost");
    const token = url.searchParams.get("token");

    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
        ws.user = payload;
        console.log(`🔌 WS connected: ${payload.username} (${payload.role})`);
      } catch {
        console.log("🔌 WS connected: unauthenticated");
      }
    }

    clients.add(ws);

    // Trimite mesaj de bun venit cu date initiale
    ws.send(JSON.stringify({
      event: "connected",
      data: { message: "Conectat la Netheris Panel WS", timestamp: new Date().toISOString() },
    }));

    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleClientMessage(ws, msg);
      } catch {
        // Ignore invalid JSON
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      if (ws.user) {
        console.log(`🔌 WS disconnected: ${ws.user.username}`);
      }
    });

    ws.on("error", () => {
      clients.delete(ws);
    });
  });

  // Ping la fiecare 30s pentru a detecta conexiuni moarte
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as AuthenticatedWebSocket;
      if (!client.isAlive) {
        clients.delete(client);
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  console.log("✅ WebSocket server initialized");
}

// Trimite mesaj catre toti clientii (sau doar cei autentificati)
export function wsBroadcast(event: string, data: unknown, requireAuth = false): void {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

  clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (requireAuth && !client.user) return;
    client.send(message);
  });
}

// Trimite mesaj doar catre admini
export function wsBroadcastAdmin(event: string, data: unknown): void {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

  clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (!client.user || client.user.role !== "admin") return;
    client.send(message);
  });
}

// Trimite mesaj catre un user specific
export function wsSendToUser(userId: number, event: string, data: unknown): void {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

  clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (!client.user || client.user.userId !== userId) return;
    client.send(message);
  });
}

function handleClientMessage(ws: AuthenticatedWebSocket, msg: { event: string; data?: unknown }): void {
  switch (msg.event) {
    case "ping":
      ws.send(JSON.stringify({ event: "pong", data: null }));
      break;
    default:
      break;
  }
}

export function getConnectedCount(): number {
  return clients.size;
}
