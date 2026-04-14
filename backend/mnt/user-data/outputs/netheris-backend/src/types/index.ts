// ===== src/types/index.ts =====
// Toate tipurile folosite în backend

export type UserRole = "admin" | "moderator" | "helper" | "player";

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  email?: string;
  discord_id?: string;
  avatar?: string;
  created_at: string;
  last_login?: string;
}

export interface PublicUser {
  id: number;
  username: string;
  role: UserRole;
  email?: string;
  discord_id?: string;
  avatar?: string;
  created_at: string;
  last_login?: string;
}

// Staff online status (actualizat de Minecraft plugin)
export interface StaffStatus {
  id: number;
  user_id: number;
  username: string;
  role: UserRole;
  online_minecraft: boolean; // online pe serverul MC
  online_panel: boolean;     // online pe panel
  last_seen: string;
  current_world?: string;
}

// Jucatori Minecraft (trimisi de plugin)
export interface MinecraftPlayer {
  id: number;
  uuid: string;
  username: string;
  online: boolean;
  ip?: string;
  world?: string;
  ping?: number;
  joined_at?: string;
  last_seen: string;
  total_playtime: number; // minute
  is_banned: boolean;
  is_muted: boolean;
}

// Actiuni moderare
export type ActionType = "ban" | "mute" | "kick" | "warn" | "unban" | "unmute";

export interface ModerationAction {
  id: number;
  type: ActionType;
  target_username: string;
  target_uuid?: string;
  performed_by: string; // username staff
  performed_by_id: number;
  reason: string;
  duration?: string; // ex: "7d", "permanent"
  expires_at?: string;
  created_at: string;
  active: boolean;
}

// Tickete
export type TicketStatus = "open" | "in-progress" | "closed";
export type TicketPriority = "low" | "medium" | "high";
export type TicketCategory = "bug" | "appeal" | "complaint" | "support" | "donation" | "other";

export interface Ticket {
  id: number;
  title: string;
  content: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: string; // username
  created_by_id: number;
  assigned_to?: string; // staff username
  assigned_to_id?: number;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface TicketReply {
  id: number;
  ticket_id: number;
  content: string;
  author: string;
  author_id: number;
  author_role: UserRole;
  created_at: string;
}

// Regulament
export interface Rule {
  id: number;
  order_index: number;
  category: string;
  title: string;
  content: string;
  severity: "info" | "warning" | "severe"; // gravitatea incalcarii
  created_by: string;
  created_by_id: number;
  updated_at: string;
  active: boolean;
}

// Anunturi
export interface Announcement {
  id: number;
  title: string;
  content: string;
  author: string;
  author_id: number;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

// Statistici server (trimise de plugin)
export interface ServerStats {
  id: number;
  players_online: number;
  players_max: number;
  tps: number; // ticks per second
  ram_used: number; // MB
  ram_max: number;
  uptime: number; // secunde
  recorded_at: string;
}

// JWT Payload
export interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
}

// Express Request extins cu user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
