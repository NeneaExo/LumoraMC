// ===== src/api.ts =====
// Helper centralizat pentru toate request-urile catre backend

const BASE_URL = "http://localhost:3001/api";

function getToken(): string | null {
  return localStorage.getItem("netheris_token");
}

export function setToken(token: string): void {
  localStorage.setItem("netheris_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("netheris_token");
  localStorage.removeItem("netheris_user");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Eroare server");
  }

  return data;
}

// ==================== AUTH ====================
export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ success: boolean; token: string; user: User }>(
        "POST", "/auth/login", { username, password }, false
      ),
    me: () => request<{ success: boolean; user: User }>("GET", "/auth/me"),
    logout: () => request("POST", "/auth/logout"),
    getUsers: () => request<{ success: boolean; users: User[] }>("GET", "/auth/users"),
    updateRole: (id: number, role: string) =>
      request("PUT", `/auth/users/${id}/role`, { role }),
  },

  // ==================== RULES ====================
  rules: {
    getAll: () => request<{ success: boolean; rules: Rule[] }>("GET", "/rules", undefined, false),
    create: (data: Partial<Rule>) => request("POST", "/rules", data),
    update: (id: number, data: Partial<Rule>) => request("PUT", `/rules/${id}`, data),
    delete: (id: number) => request("DELETE", `/rules/${id}`),
    reorder: (ids: number[]) => request("PUT", "/rules/reorder", { ids }),
  },

  // ==================== ANNOUNCEMENTS ====================
  announcements: {
    getAll: () =>
      request<{ success: boolean; announcements: Announcement[] }>(
        "GET", "/announcements", undefined, false
      ),
    create: (data: Partial<Announcement>) => request("POST", "/announcements", data),
    update: (id: number, data: Partial<Announcement>) =>
      request("PUT", `/announcements/${id}`, data),
    delete: (id: number) => request("DELETE", `/announcements/${id}`),
  },

  // ==================== TICKETS ====================
  tickets: {
    getAll: () =>
      request<{ success: boolean; tickets: Ticket[] }>("GET", "/tickets"),
    getOne: (id: number) =>
      request<{ success: boolean; ticket: Ticket }>("GET", `/tickets/${id}`),
    create: (data: Partial<Ticket>) => request("POST", "/tickets", data),
    update: (id: number, data: Partial<Ticket>) =>
      request("PUT", `/tickets/${id}`, data),
    reply: (id: number, content: string) =>
      request("POST", `/tickets/${id}/reply`, { content }),
    delete: (id: number) => request("DELETE", `/tickets/${id}`),
  },

  // ==================== MODERATION ====================
  moderation: {
    getRecent: () =>
      request<{ success: boolean; actions: ModerationAction[] }>(
        "GET", "/moderation/recent"
      ),
    getAll: (params?: string) =>
      request<{ success: boolean; actions: ModerationAction[] }>(
        "GET", `/moderation${params ? `?${params}` : ""}`
      ),
    create: (data: Partial<ModerationAction>) =>
      request("POST", "/moderation", data),
  },

  // ==================== MINECRAFT ====================
  minecraft: {
    getOnlinePlayers: () =>
      request<{ success: boolean; players: MinecraftPlayer[] }>(
        "GET", "/minecraft/players"
      ),
    getStaff: () =>
      request<{ success: boolean; staff: StaffStatus[] }>(
        "GET", "/minecraft/staff"
      ),
    getStatsHistory: () =>
      request<{ success: boolean; stats: ServerStat[] }>(
        "GET", "/minecraft/stats/history"
      ),
  },
};

// ==================== TYPES ====================
export interface User {
  id: number;
  username: string;
  role: "admin" | "moderator" | "helper" | "player";
  email?: string;
  avatar?: string;
  created_at: string;
  last_login?: string;
}

export interface Rule {
  id: number;
  order_index: number;
  category: string;
  title: string;
  content: string;
  severity: "info" | "warning" | "severe";
  created_by: string;
  active: boolean;
}

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

export interface Ticket {
  id: number;
  title: string;
  content: string;
  category: string;
  status: "open" | "in-progress" | "closed";
  priority: "low" | "medium" | "high";
  created_by: string;
  created_by_id: number;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface ModerationAction {
  id: number;
  type: "ban" | "mute" | "kick" | "warn" | "unban" | "unmute";
  target_username: string;
  performed_by: string;
  reason: string;
  duration?: string;
  created_at: string;
}

export interface MinecraftPlayer {
  id: number;
  uuid: string;
  username: string;
  online: boolean;
  world?: string;
  ping?: number;
  joined_at?: string;
}

export interface StaffStatus {
  id: number;
  username: string;
  role: string;
  online_minecraft: boolean;
  online_panel: boolean;
  last_seen: string;
}

export interface ServerStat {
  id: number;
  players_online: number;
  tps: number;
  ram_used: number;
  recorded_at: string;
}
