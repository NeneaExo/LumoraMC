import { useState, useEffect, useRef, useCallback } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { removeToken } from "../api";
import { useTheme } from "../context/ThemeContext";
import {
  LayoutDashboard,
  Users,
  Shield,
  Ticket,
  Megaphone,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  Ban,
  VolumeX,
  AlertTriangle,
  TrendingUp,
  Star,
  Eye,
  Clock,
  Bell,
  Search,
  Menu,
  X,
  RefreshCw,
  Circle,
  Server,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Hash,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  Filter,
  Sun,
  Moon,
} from "lucide-react";
import "./styles/Dashboard.css";
import logo from "../assets/netheris-logo.png";

// ==================== CONFIG ====================
const API_BASE = "http://localhost:3001/api";
const WS_URL = "ws://localhost:3001/ws";

// ==================== TYPES ====================
type UserRole = "admin" | "moderator" | "helper" | "player";

interface StaffMember {
  id: number;
  username: string;
  role: UserRole;
  online: boolean;
  last_seen?: string;
}

interface RecentAction {
  id: number;
  action_type: "ban" | "mute" | "kick" | "warn";
  target_username: string;
  staff_username: string;
  reason: string;
  created_at: string;
}

interface TicketItem {
  id: number;
  title: string;
  username: string;
  created_by: string;
  created_by_id?: number;
  content?: string;
  description?: string;
  status: "open" | "in-progress" | "closed";
  priority: "low" | "medium" | "high";
  category: "support" | "complaint" | "unban";
  created_at: string;
}

interface AnnouncementSection {
  title: string;
  color: string;
  items: string[];
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  sections?: AnnouncementSection[] | string;
  author_username: string;
  created_at: string;
  pinned: boolean;
}

interface Rule {
  id: number;
  category: string;
  title: string;
  content: string;
  severity: "info" | "warning" | "severe";
  created_by: string;
  updated_at?: string;
}

interface LiveStats {
  players_online: number | null;
  players_max: number | null;
  tps: number | null;
}

interface DashStats {
  total_players: number;
  new_players_24h: number;
  banned_count: number;
  active_players?: number;
  monthly_votes?: number;
}

interface Session {
  id: number;
  player: string;
  ip: string;
  joined: string;
  world: string;
  ping: number;
}

// ==================== HELPERS ====================
const getToken = () => localStorage.getItem("netheris_token");

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    let msg = `API error: ${res.status}`;
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Acum";
  if (min < 60) return `Acum ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Acum ${h} ${h === 1 ? "oră" : "ore"}`;
  const d = Math.floor(h / 24);
  return `Acum ${d} ${d === 1 ? "zi" : "zile"}`;
};

const stat = (val: number | null | undefined, fallback = "—") =>
  val !== null && val !== undefined ? val.toLocaleString("ro-RO") : fallback;

// ==================== BADGE COMPONENTS ====================
const ActionBadge = ({ type }: { type: RecentAction["action_type"] }) => {
  const config = {
    ban: { icon: Ban, label: "BAN", className: "ban" },
    mute: { icon: VolumeX, label: "MUTE", className: "mute" },
    kick: { icon: LogOut, label: "KICK", className: "kick" },
    warn: { icon: AlertTriangle, label: "WARN", className: "warn" },
  };
  const { icon: Icon, label, className } = config[type] ?? config.warn;
  return (
    <span className={`dash-item-badge ${className}`}>
      <Icon size={10} />
      {label}
    </span>
  );
};

const RoleBadge = ({ role }: { role: UserRole }) => {
  const config = {
    admin: { label: "ADMIN", className: "role-admin" },
    moderator: { label: "MODERATOR", className: "role-mod" },
    helper: { label: "HELPER", className: "role-helper" },
    player: { label: "PLAYER", className: "role-player" },
  };
  const { label, className } = config[role] ?? config.player;
  return <span className={`role-badge ${className}`}>{label}</span>;
};

const TicketCategoryBadge = ({
  category,
}: {
  category: TicketItem["category"];
}) => {
  const config = {
    support: {
      icon: MessageSquare,
      label: "Suport",
      className: "priority-low",
    },
    complaint: {
      icon: AlertCircle,
      label: "Plângere",
      className: "priority-medium",
    },
    unban: { icon: RefreshCw, label: "Debanare", className: "priority-high" },
  };
  const { icon: Icon, label, className } = config[category] ?? config.support;
  return (
    <span
      className={`priority-badge ${className}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      <Icon size={10} />
      {label}
    </span>
  );
};

const TicketPriority = ({ priority }: { priority: TicketItem["priority"] }) => {
  const config = {
    high: { label: "Urgent", className: "priority-high" },
    medium: { label: "Mediu", className: "priority-medium" },
    low: { label: "Scăzut", className: "priority-low" },
  };
  const { label, className } = config[priority] ?? config.low;
  return <span className={`priority-badge ${className}`}>{label}</span>;
};

const TicketStatus = ({ status }: { status: TicketItem["status"] }) => {
  const config = {
    open: { label: "Deschis", className: "status-open" },
    "in-progress": { label: "În lucru", className: "status-progress" },
    closed: { label: "Rezolvat", className: "status-closed" },
  };
  const { label, className } = config[status] ?? config.open;
  return <span className={`status-badge ${className}`}>{label}</span>;
};


// ==================== TICKET TABLE ====================
const TicketTable = ({
  tickets,
  canManage,
  onStatusChange,
  onSelect,
}: {
  tickets: TicketItem[];
  canManage: boolean;
  onStatusChange: (id: number, status: TicketItem["status"]) => void;
  onSelect: (ticket: TicketItem) => void;
}) => {
  if (tickets.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", opacity: 0.5 }}>
        Nu există tickete
      </div>
    );
  }

  return (
    <div className="dash-table-wrapper">
      <table className="dash-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Titlu</th>
            <th>Jucător</th>
            <th>Categorie</th>
            <th>Prioritate</th>
            <th>Status</th>
            <th>Timp</th>
            <th>Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket, i) => (
            <motion.tr
              key={ticket.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <td className="dash-table-id">#{ticket.id}</td>
              <td>{ticket.title}</td>
              <td>{ticket.created_by || ticket.username}</td>
              <td>
                <TicketCategoryBadge category={ticket.category} />
              </td>
              <td>
                <TicketPriority priority={ticket.priority} />
              </td>
              <td>
                <TicketStatus status={ticket.status} />
              </td>
              <td>{timeAgo(ticket.created_at)}</td>
              <td>
                <div className="dash-action-btns">
                  <button
                    className="dash-btn-action view"
                    onClick={() => onSelect(ticket)}
                    title="Vizualizează ticket"
                  >
                    <MessageSquare size={13} /> Vizualizează
                  </button>
                  {canManage && ticket.status === "open" && (
                    <button
                      className="dash-btn-action inprogress"
                      onClick={() => onStatusChange(ticket.id, "in-progress")}
                      title="Preia ticket"
                    >
                      <PlayCircle size={13} /> Preia
                    </button>
                  )}
                  {canManage && ticket.status === "in-progress" && (
                    <button
                      className="dash-btn-action resolve"
                      onClick={() => onStatusChange(ticket.id, "closed")}
                      title="Marchează rezolvat"
                    >
                      <CheckCircle size={13} /> Rezolvat
                    </button>
                  )}
                  {canManage && ticket.status === "closed" && (
                    <button
                      className="dash-btn-action reopen"
                      onClick={() => onStatusChange(ticket.id, "open")}
                      title="Redeschide"
                    >
                      <RefreshCw size={13} /> Redeschide
                    </button>
                  )}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==================== SHARED WIZARD CONFIGS ====================

const SECTIONS: Record<
  string,
  { label: string; icon: string; subsections?: string[] }
> = {
  survival: { label: "Survival", icon: "⛏️", subsections: [] },
  minigames: {
    label: "Minigames",
    icon: "🎮",
    subsections: [
      "BedWars",
      "SkyWars",
      "SkyBlock",
      "PvP",
      "KitPvP",
      "Murder Mystery",
    ],
  },
  creative: { label: "Creative", icon: "🏗️", subsections: [] },
  lobby: { label: "Lobby / Hub", icon: "🏠", subsections: [] },
  discord: { label: "Discord", icon: "💬", subsections: [] },
  website: { label: "Website / Panel", icon: "🌐", subsections: [] },
};

// ── Shared sub-components for wizards ──
const WizardOverlay = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <motion.div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 1100,
      background: "rgba(0,0,0,0.78)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    {children}
  </motion.div>
);

const WizardCard = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) => (
  <motion.div
    style={{
      width: "min(600px, 100%)",
      background: "#0f0f0f",
      borderRadius: 18,
      border: "1px solid rgba(212,175,55,0.18)",
      overflow: "hidden",
      boxShadow: "0 30px 90px rgba(0,0,0,0.85)",
    }}
    initial={{ scale: 0.9, opacity: 0, y: 24 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{ scale: 0.9, opacity: 0, y: 24 }}
    transition={{ type: "spring", stiffness: 300, damping: 26 }}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

const WizardHeader = ({
  step,
  total,
  title,
  subtitle,
  color = "#d4af37",
  onClose,
}: {
  step: number;
  total: number;
  title: string;
  subtitle: string;
  color?: string;
  onClose: () => void;
}) => (
  <>
    <div
      style={{
        height: 3,
        background: `linear-gradient(90deg, ${color}, #d4af37)`,
      }}
    />
    <div
      style={{
        padding: "20px 24px 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: "#555",
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {subtitle} · PAS {step}/{total}
        </p>
        <h2
          style={{
            margin: "4px 0 0",
            fontSize: 18,
            color: "#fff",
            fontWeight: 700,
          }}
        >
          {title}
        </h2>
      </div>
      <button
        onClick={onClose}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#777",
          borderRadius: 8,
          width: 32,
          height: 32,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <X size={15} />
      </button>
    </div>
    <div style={{ padding: "12px 24px 0", display: "flex", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: i < step ? color : "rgba(255,255,255,0.08)",
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  </>
);

const WizardFooter = ({
  step,
  total,
  canNext,
  onBack,
  onNext,
  onSubmit,
  loading,
  accentColor = "#d4af37",
}: {
  step: number;
  total: number;
  canNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  loading: boolean;
  accentColor?: string;
}) => (
  <div
    style={{
      padding: "16px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      marginTop: 20,
    }}
  >
    <button
      onClick={onBack}
      style={{
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#888",
        borderRadius: 8,
        padding: "8px 18px",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {step > 1 ? "← Înapoi" : "Anulează"}
    </button>
    {step < total ? (
      <button
        disabled={!canNext}
        onClick={onNext}
        style={{
          background: `linear-gradient(135deg, ${accentColor}, #a07830)`,
          border: "none",
          color: "#000",
          borderRadius: 8,
          padding: "8px 22px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 700,
          opacity: canNext ? 1 : 0.35,
          transition: "opacity 0.15s",
        }}
      >
        Continuă →
      </button>
    ) : (
      <button
        disabled={loading || !canNext}
        onClick={onSubmit}
        style={{
          background: `linear-gradient(135deg, ${accentColor}, #a07830)`,
          border: "none",
          color: "#000",
          borderRadius: 8,
          padding: "8px 22px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 700,
          opacity: loading || !canNext ? 0.35 : 1,
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "opacity 0.15s",
        }}
      >
        {loading ? (
          <RefreshCw
            size={13}
            style={{ animation: "spin 1s linear infinite" }}
          />
        ) : (
          <Plus size={13} />
        )}
        {loading ? "Se trimite..." : "Trimite"}
      </button>
    )}
  </div>
);

const SectionGrid = ({
  section,
  setSection,
  subsection,
  setSubsection,
}: {
  section: string;
  setSection: (s: string) => void;
  subsection: string;
  setSubsection: (s: string) => void;
}) => {
  const selectedSection = section ? SECTIONS[section] : null;
  const hasSubsections = (selectedSection?.subsections?.length ?? 0) > 0;
  return (
    <>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}>
        Pe ce secțiune ai întâlnit problema?
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {Object.entries(SECTIONS).map(([key, s]) => (
          <button
            key={key}
            onClick={() => {
              setSection(key);
              setSubsection("");
            }}
            style={{
              background:
                section === key
                  ? "rgba(212,175,55,0.12)"
                  : "rgba(255,255,255,0.03)",
              border: `1.5px solid ${section === key ? "#d4af37" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 10,
              padding: "12px 10px",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: section === key ? "#d4af37" : "#ccc",
              }}
            >
              {s.label}
            </div>
          </button>
        ))}
      </div>
      {hasSubsections && section && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 11,
              color: "#666",
              fontWeight: 700,
              letterSpacing: 0.8,
            }}
          >
            SELECTEAZĂ MINIGAME-UL:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selectedSection?.subsections?.map((sub) => (
              <button
                key={sub}
                onClick={() => setSubsection(sub)}
                style={{
                  background:
                    subsection === sub
                      ? "rgba(212,175,55,0.15)"
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${subsection === sub ? "#d4af37" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 8,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: subsection === sub ? "#d4af37" : "#aaa",
                  transition: "all 0.15s",
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </>
  );
};

const DetailForm = ({
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  error,
  contextBadge,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  priority: TicketItem["priority"];
  setPriority: (v: TicketItem["priority"]) => void;
  error: string;
  contextBadge?: React.ReactNode;
}) => (
  <>
    {contextBadge && (
      <div
        style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}
      >
        {contextBadge}
      </div>
    )}
    <label className="dash-label">Titlu *</label>
    <input
      className="dash-input"
      placeholder="Descrie pe scurt problema..."
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      style={{ marginBottom: 12 }}
      autoFocus
    />
    <label className="dash-label">Descriere detaliată</label>
    <textarea
      className="dash-input dash-textarea"
      placeholder="Explică problema cu cât mai multe detalii..."
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      style={{ marginBottom: 12, minHeight: 90 }}
    />
    <label className="dash-label">Prioritate</label>
    <div style={{ display: "flex", gap: 8 }}>
      {(
        [
          ["low", "Scăzut", "#6b7280"],
          ["medium", "Mediu", "#f59e0b"],
          ["high", "Urgent", "#ef4444"],
        ] as const
      ).map(([val, lbl, col]) => (
        <button
          key={val}
          onClick={() => setPriority(val)}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
            cursor: "pointer",
            background:
              priority === val ? `${col}18` : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${priority === val ? col : "rgba(255,255,255,0.08)"}`,
            color: priority === val ? col : "#888",
            fontSize: 12,
            fontWeight: 700,
            transition: "all 0.15s",
          }}
        >
          {lbl}
        </button>
      ))}
    </div>
    {error && (
      <div className="dash-error" style={{ marginTop: 10 }}>
        {error}
      </div>
    )}
  </>
);

// ==================== TICKET WIZARD (Suport) ====================
const TICKET_TYPES = [
  {
    id: "general",
    label: "Probleme Generale",
    desc: "Probleme de gameplay, întrebări, cereri generale",
    icon: "⚠️",
    color: "#f59e0b",
    hasSections: true,
  },
  {
    id: "technical",
    label: "Probleme Tehnice",
    desc: "Bug-uri, erori, lag, probleme de conectare",
    icon: "🔧",
    color: "#3b82f6",
    hasSections: true,
  },
  {
    id: "payment",
    label: "Probleme cu Achiziții",
    desc: "Grade neaplicate, plăți eșuate, donații",
    icon: "💳",
    color: "#10b981",
    hasSections: false,
  },
  {
    id: "other",
    label: "Altceva",
    desc: "Orice problemă care nu se încadrează mai sus",
    icon: "📋",
    color: "#8b5cf6",
    hasSections: false,
  },
] as const;

const CreateTicketModal = ({
  onClose,
  onCreated,
  username,
}: {
  onClose: () => void;
  onCreated: (ticket: TicketItem) => void;
  username: string;
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [ticketType, setTicketType] = useState("");
  const [section, setSection] = useState("");
  const [subsection, setSubsection] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketItem["priority"]>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedType = TICKET_TYPES.find((t) => t.id === ticketType);
  const hasSubsections = section
    ? (SECTIONS[section]?.subsections?.length ?? 0) > 0
    : false;
  const totalSteps = selectedType?.hasSections ? 3 : 2;

  const canNext =
    step === 1
      ? !!ticketType
      : step === 2
        ? !!section && (!hasSubsections || !!subsection)
        : !!title.trim();

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Titlul este obligatoriu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const parts: string[] = [];
      if (section) parts.push(SECTIONS[section].label);
      if (subsection) parts.push(subsection);
      const finalTitle = parts.length
        ? `[${parts.join(" › ")}] ${title.trim()}`
        : title.trim();
      const data = await apiFetch("/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: finalTitle,
          description,
          priority,
          category: "support",
        }),
      });
      onCreated(
        data.ticket ?? {
          id: Date.now(),
          title: finalTitle,
          username,
          description,
          priority,
          category: "support" as const,
          status: "open" as const,
          created_at: new Date().toISOString(),
        },
      );
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare la trimitere.");
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ["Tipul problemei", "Secțiunea afectată", "Detalii"];
  const currentTitle = selectedType?.hasSections
    ? stepTitles[step - 1]
    : step === 1
      ? stepTitles[0]
      : stepTitles[2];

  return (
    <WizardOverlay onClose={onClose}>
      <WizardCard onClick={(e) => e.stopPropagation()}>
        <WizardHeader
          step={step}
          total={totalSteps}
          title={currentTitle}
          subtitle="TICHET NOU"
          color={selectedType?.color ?? "#d4af37"}
          onClose={onClose}
        />
        <div style={{ padding: "20px 24px 0", minHeight: 260 }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="t1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.16 }}
              >
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}>
                  Selectează tipul problemei cu care te confrunți:
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {TICKET_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTicketType(t.id)}
                      style={{
                        background:
                          ticketType === t.id
                            ? `${t.color}15`
                            : "rgba(255,255,255,0.03)",
                        border: `1.5px solid ${ticketType === t.id ? t.color : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 12,
                        padding: "14px 16px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 8 }}>
                        {t.icon}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: ticketType === t.id ? t.color : "#ddd",
                          marginBottom: 4,
                        }}
                      >
                        {t.label}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#666", lineHeight: 1.4 }}
                      >
                        {t.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {step === 2 && selectedType?.hasSections && (
              <motion.div
                key="t2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.16 }}
              >
                <SectionGrid
                  section={section}
                  setSection={setSection}
                  subsection={subsection}
                  setSubsection={setSubsection}
                />
              </motion.div>
            )}
            {((step === 3 && selectedType?.hasSections) ||
              (step === 2 && !selectedType?.hasSections)) && (
              <motion.div
                key="t3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.16 }}
              >
                <DetailForm
                  title={title}
                  setTitle={setTitle}
                  description={description}
                  setDescription={setDescription}
                  priority={priority}
                  setPriority={setPriority}
                  error={error}
                  contextBadge={
                    <>
                      <span
                        style={{
                          background: `${selectedType?.color}15`,
                          border: `1px solid ${selectedType?.color}40`,
                          color: selectedType?.color,
                          borderRadius: 6,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {selectedType?.icon} {selectedType?.label}
                      </span>
                      {section && (
                        <span
                          style={{
                            background: "rgba(212,175,55,0.08)",
                            border: "1px solid rgba(212,175,55,0.2)",
                            color: "#d4af37",
                            borderRadius: 6,
                            padding: "3px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {SECTIONS[section].icon} {SECTIONS[section].label}
                          {subsection ? ` › ${subsection}` : ""}
                        </span>
                      )}
                    </>
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <WizardFooter
          step={step}
          total={totalSteps}
          canNext={canNext}
          onBack={() =>
            step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : onClose()
          }
          onNext={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
          onSubmit={handleSubmit}
          loading={loading}
          accentColor={selectedType?.color ?? "#d4af37"}
        />
      </WizardCard>
    </WizardOverlay>
  );
};

// ==================== COMPLAINT WIZARD (Plângeri) ====================
const COMPLAINT_TYPES = [
  {
    id: "player",
    label: "Raportare Jucător",
    desc: "Hack, comportament toxic, limbaj vulgar, spam",
    icon: "👤",
    color: "#ef4444",
  },
  {
    id: "staff",
    label: "Raportare Staff",
    desc: "Abuz de putere, comportament neprofesional",
    icon: "🛡️",
    color: "#f59e0b",
  },
  {
    id: "donor",
    label: "Raportare Donator",
    desc: "Abuz de grad, comportament inadecvat al unui donator",
    icon: "💎",
    color: "#8b5cf6",
  },
  {
    id: "other",
    label: "Altceva",
    desc: "Orice altă plângere",
    icon: "📢",
    color: "#6b7280",
  },
] as const;

const REPORT_REASONS: Record<
  string,
  { label: string; icon: string; color: string }[]
> = {
  player: [
    { label: "Hack / Cheat", icon: "⚔️", color: "#ef4444" },
    { label: "Limbaj vulgar / Rasism", icon: "🤬", color: "#f97316" },
    { label: "Spam în chat", icon: "💬", color: "#f59e0b" },
    { label: "Grief / Distrugere", icon: "💣", color: "#a855f7" },
    { label: "Bug abuse", icon: "🐛", color: "#3b82f6" },
    { label: "Comportament toxic", icon: "☠️", color: "#6b7280" },
    { label: "Alt motiv", icon: "📝", color: "#6b7280" },
  ],
  staff: [
    { label: "Ban / Mute nejustificat", icon: "🔨", color: "#ef4444" },
    { label: "Comportament neprofesional", icon: "😤", color: "#f97316" },
    { label: "Favorizare jucători", icon: "⚖️", color: "#f59e0b" },
    { label: "Inactivitate", icon: "💤", color: "#6b7280" },
    { label: "Alt motiv", icon: "📝", color: "#6b7280" },
  ],
  donor: [
    { label: "Abuz de grad donator", icon: "💎", color: "#a855f7" },
    { label: "Comportament inadecvat", icon: "😡", color: "#f97316" },
    { label: "Intimidare jucători", icon: "👊", color: "#ef4444" },
    { label: "Alt motiv", icon: "📝", color: "#6b7280" },
  ],
  other: [],
};

const CreateComplaintModal = ({
  onClose,
  onCreated,
  username,
}: {
  onClose: () => void;
  onCreated: (ticket: TicketItem) => void;
  username: string;
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [complaintType, setComplaintType] = useState("");
  const [reportedPlayer, setReportedPlayer] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [section, setSection] = useState("");
  const [subsection, setSubsection] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketItem["priority"]>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedType = COMPLAINT_TYPES.find((t) => t.id === complaintType);
  const reasons = complaintType ? (REPORT_REASONS[complaintType] ?? []) : [];
  const needsSection = complaintType === "player" || complaintType === "staff";
  const hasSubsections = section
    ? (SECTIONS[section]?.subsections?.length ?? 0) > 0
    : false;
  const totalSteps = 3;

  const canNext =
    step === 1
      ? !!complaintType && !!reportedPlayer.trim() && !!reportReason
      : step === 2
        ? !needsSection || (!!section && (!hasSubsections || !!subsection))
        : !!description.trim();

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError("Descrierea este obligatorie.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const contextParts: string[] = [
        `${selectedType?.label}: ${reportedPlayer}`,
      ];
      if (reportReason) contextParts.push(reportReason);
      if (section)
        contextParts.push(
          SECTIONS[section].label + (subsection ? ` › ${subsection}` : ""),
        );
      const finalTitle = contextParts.join(" · ");
      const data = await apiFetch("/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: finalTitle,
          description,
          priority,
          category: "complaint",
        }),
      });
      onCreated(
        data.ticket ?? {
          id: Date.now(),
          title: finalTitle,
          username,
          description,
          priority,
          category: "complaint" as const,
          status: "open" as const,
          created_at: new Date().toISOString(),
        },
      );
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare la trimitere.");
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = [
    "Tipul plângerii",
    needsSection ? "Locul incidentului" : "Detalii",
    "Descriere",
  ];

  return (
    <WizardOverlay onClose={onClose}>
      <WizardCard onClick={(e) => e.stopPropagation()}>
        <WizardHeader
          step={step}
          total={totalSteps}
          title={stepTitles[step - 1]}
          subtitle="PLÂNGERE NOUĂ"
          color={selectedType?.color ?? "#ef4444"}
          onClose={onClose}
        />
        <div style={{ padding: "20px 24px 0", minHeight: 280 }}>
          <AnimatePresence mode="wait">
            {/* Step 1 — tip + jucator + motiv */}
            {step === 1 && (
              <motion.div
                key="c1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.16 }}
              >
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "#888" }}>
                  Ce tip de plângere dorești să depui?
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {COMPLAINT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setComplaintType(t.id);
                        setReportReason("");
                      }}
                      style={{
                        background:
                          complaintType === t.id
                            ? `${t.color}15`
                            : "rgba(255,255,255,0.03)",
                        border: `1.5px solid ${complaintType === t.id ? t.color : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 12,
                        padding: "12px 14px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 6 }}>
                        {t.icon}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: complaintType === t.id ? t.color : "#ddd",
                          marginBottom: 3,
                        }}
                      >
                        {t.label}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#666", lineHeight: 1.3 }}
                      >
                        {t.desc}
                      </div>
                    </button>
                  ))}
                </div>

                {complaintType && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <label className="dash-label">
                      {complaintType === "player"
                        ? "Nickname jucător raportat *"
                        : complaintType === "staff"
                          ? "Nickname staff raportat *"
                          : complaintType === "donor"
                            ? "Nickname donator raportat *"
                            : "Subiect *"}
                    </label>
                    <input
                      className="dash-input"
                      placeholder="ex: Steve123"
                      value={reportedPlayer}
                      onChange={(e) => setReportedPlayer(e.target.value)}
                      style={{ marginBottom: 12 }}
                      autoFocus
                    />

                    {reasons.length > 0 && (
                      <>
                        <label className="dash-label">
                          Motivul plângerii *
                        </label>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 8,
                          }}
                        >
                          {reasons.map((r) => {
                            const isSelected = reportReason === r.label;
                            return (
                              <button
                                key={r.label}
                                onClick={() => setReportReason(r.label)}
                                style={{
                                  background: isSelected
                                    ? `${r.color}18`
                                    : "rgba(255,255,255,0.03)",
                                  border: `1.5px solid ${isSelected ? r.color : "rgba(255,255,255,0.08)"}`,
                                  borderRadius: 10,
                                  padding: "10px 14px",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  transition: "all 0.15s",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 20,
                                    flexShrink: 0,
                                    filter: isSelected
                                      ? "none"
                                      : "grayscale(0.4) opacity(0.7)",
                                    transition: "filter 0.15s",
                                  }}
                                >
                                  {r.icon}
                                </span>
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    lineHeight: 1.3,
                                    color: isSelected ? r.color : "#bbb",
                                    transition: "color 0.15s",
                                  }}
                                >
                                  {r.label}
                                </span>
                                {isSelected && (
                                  <span
                                    style={{
                                      marginLeft: "auto",
                                      flexShrink: 0,
                                      width: 16,
                                      height: 16,
                                      borderRadius: "50%",
                                      background: r.color,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 9,
                                      color: "#000",
                                      fontWeight: 900,
                                    }}
                                  >
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 2 — sectiune (optional) sau direct form */}
            {step === 2 && needsSection && (
              <motion.div
                key="c2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.16 }}
              >
                <SectionGrid
                  section={section}
                  setSection={setSection}
                  subsection={subsection}
                  setSubsection={setSubsection}
                />
              </motion.div>
            )}
            {step === 2 && !needsSection && (
              <motion.div
                key="c2b"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.16 }}
              >
                <label className="dash-label">Descriere *</label>
                <textarea
                  className="dash-input dash-textarea"
                  placeholder="Descrie în detaliu ce s-a întâmplat..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ minHeight: 110, marginBottom: 12 }}
                  autoFocus
                />
                <div style={{ fontSize: 11, color: "#555", marginBottom: 12 }}>
                  💡 Include dovezi (screenshot-uri) dacă este posibil.
                </div>
                <label className="dash-label">Prioritate</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(
                    [
                      ["low", "Scăzut", "#6b7280"],
                      ["medium", "Mediu", "#f59e0b"],
                      ["high", "Urgent", "#ef4444"],
                    ] as const
                  ).map(([val, lbl, col]) => (
                    <button
                      key={val}
                      onClick={() => setPriority(val)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 8,
                        cursor: "pointer",
                        background:
                          priority === val
                            ? `${col}18`
                            : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${priority === val ? col : "rgba(255,255,255,0.08)"}`,
                        color: priority === val ? col : "#888",
                        fontSize: 12,
                        fontWeight: 700,
                        transition: "all 0.15s",
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {error && (
                  <div className="dash-error" style={{ marginTop: 10 }}>
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3 — descriere completa */}
            {step === 3 && (
              <motion.div
                key="c3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.16 }}
              >
                {/* summary badges */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      background: `${selectedType?.color}15`,
                      border: `1px solid ${selectedType?.color}40`,
                      color: selectedType?.color,
                      borderRadius: 6,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {selectedType?.icon} {reportedPlayer}
                  </span>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#aaa",
                      borderRadius: 6,
                      padding: "3px 10px",
                      fontSize: 11,
                    }}
                  >
                    {reportReason}
                  </span>
                  {section && (
                    <span
                      style={{
                        background: "rgba(212,175,55,0.08)",
                        border: "1px solid rgba(212,175,55,0.2)",
                        color: "#d4af37",
                        borderRadius: 6,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {SECTIONS[section].icon} {SECTIONS[section].label}
                      {subsection ? ` › ${subsection}` : ""}
                    </span>
                  )}
                </div>
                <label className="dash-label">Descrie ce s-a întâmplat *</label>
                <textarea
                  className="dash-input dash-textarea"
                  placeholder="Explică în detaliu incidentul. Include ora, contextul, martori dacă există..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ minHeight: 120, marginBottom: 12 }}
                  autoFocus
                />
                <div style={{ fontSize: 11, color: "#555", marginBottom: 12 }}>
                  💡 Include dovezi (screenshot-uri, înregistrări) dacă este
                  posibil.
                </div>
                <label className="dash-label">Prioritate</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(
                    [
                      ["low", "Scăzut", "#6b7280"],
                      ["medium", "Mediu", "#f59e0b"],
                      ["high", "Urgent", "#ef4444"],
                    ] as const
                  ).map(([val, lbl, col]) => (
                    <button
                      key={val}
                      onClick={() => setPriority(val)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 8,
                        cursor: "pointer",
                        background:
                          priority === val
                            ? `${col}18`
                            : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${priority === val ? col : "rgba(255,255,255,0.08)"}`,
                        color: priority === val ? col : "#888",
                        fontSize: 12,
                        fontWeight: 700,
                        transition: "all 0.15s",
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {error && (
                  <div className="dash-error" style={{ marginTop: 10 }}>
                    {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <WizardFooter
          step={step}
          total={totalSteps}
          canNext={canNext}
          onBack={() =>
            step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : onClose()
          }
          onNext={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
          onSubmit={handleSubmit}
          loading={loading}
          accentColor={selectedType?.color ?? "#ef4444"}
        />
      </WizardCard>
    </WizardOverlay>
  );
};

// ==================== UNBAN WIZARD (Cereri Debanare) ====================
const BAN_REASONS = [
  "Hack / Cheat",
  "Abuz de bug",
  "Comportament toxic",
  "Spam",
  "Limbaj vulgar / Rasism",
  "Grief / Distrugere",
  "Alt motiv",
];

const CreateUnbanModal = ({
  onClose,
  onCreated,
  username,
}: {
  onClose: () => void;
  onCreated: (ticket: TicketItem) => void;
  username: string;
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [bannedUsername, setBannedUsername] = useState(username);
  const [banReason, setBanReason] = useState("");
  const [unbanReason, setUnbanReason] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canNext =
    step === 1 ? !!bannedUsername.trim() && !!banReason : !!unbanReason.trim();

  const handleSubmit = async () => {
    if (!unbanReason.trim()) {
      setError("Motivul de debanare este obligatoriu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const finalTitle = `[Cerere Debanare] ${bannedUsername} · ${banReason}`;
      const fullDesc = `**Jucător:** ${bannedUsername}\n**Motivul banului:** ${banReason}\n**De ce merit unban:** ${unbanReason}${extraInfo ? `\n**Informații suplimentare:** ${extraInfo}` : ""}`;
      const data = await apiFetch("/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: finalTitle,
          description: fullDesc,
          priority: "medium",
          category: "unban",
        }),
      });
      onCreated(
        data.ticket ?? {
          id: Date.now(),
          title: finalTitle,
          username,
          description: fullDesc,
          priority: "medium" as const,
          category: "unban" as const,
          status: "open" as const,
          created_at: new Date().toISOString(),
        },
      );
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare la trimitere.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardOverlay onClose={onClose}>
      <WizardCard onClick={(e) => e.stopPropagation()}>
        <WizardHeader
          step={step}
          total={2}
          title={step === 1 ? "Informații ban" : "Motivul cererii"}
          subtitle="CERERE DEBANARE"
          color="#ef4444"
          onClose={onClose}
        />
        <div style={{ padding: "20px 24px 0", minHeight: 260 }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="u1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.16 }}
              >
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}>
                  Completează informațiile despre banul primit:
                </p>

                <label className="dash-label">Nickname-ul tău *</label>
                <input
                  className="dash-input"
                  placeholder="Nickname-ul de pe server..."
                  value={bannedUsername}
                  onChange={(e) => setBannedUsername(e.target.value)}
                  style={{ marginBottom: 14 }}
                  autoFocus
                />

                <label className="dash-label">Pentru ce ai primit ban? *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {BAN_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setBanReason(r)}
                      style={{
                        background:
                          banReason === r
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(255,255,255,0.04)",
                        border: `1px solid ${banReason === r ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                        borderRadius: 8,
                        padding: "6px 13px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        color: banReason === r ? "#ef4444" : "#999",
                        transition: "all 0.15s",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {banReason === "Alt motiv" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: 12 }}
                  >
                    <input
                      className="dash-input"
                      placeholder="Specifică motivul..."
                      value={extraInfo}
                      onChange={(e) => setExtraInfo(e.target.value)}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="u2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.16 }}
              >
                {/* summary */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444",
                      borderRadius: 6,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    🔨 {bannedUsername}
                  </span>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#aaa",
                      borderRadius: 6,
                      padding: "3px 10px",
                      fontSize: 11,
                    }}
                  >
                    {banReason}
                  </span>
                </div>

                <label className="dash-label">De ce meriți unban? *</label>
                <textarea
                  className="dash-input dash-textarea"
                  placeholder="Explică de ce crezi că meriți să fii debanat. Fii sincer și detaliat..."
                  value={unbanReason}
                  onChange={(e) => setUnbanReason(e.target.value)}
                  style={{ minHeight: 120, marginBottom: 12 }}
                  autoFocus
                />

                <label className="dash-label">
                  Informații suplimentare (opțional)
                </label>
                <input
                  className="dash-input"
                  placeholder="Ex: Nu am primit nicio avertizare înainte..."
                  value={extraInfo}
                  onChange={(e) => setExtraInfo(e.target.value)}
                />

                {error && (
                  <div className="dash-error" style={{ marginTop: 10 }}>
                    {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <WizardFooter
          step={step}
          total={2}
          canNext={canNext}
          onBack={() => (step > 1 ? setStep(1) : onClose())}
          onNext={() => setStep(2)}
          onSubmit={handleSubmit}
          loading={loading}
          accentColor="#ef4444"
        />
      </WizardCard>
    </WizardOverlay>
  );
};

// ==================== CREATE RULE MODAL ====================
// ==================== RULE ENTRY TYPE ====================
interface RuleEntry {
  id: string;
  title: string;
  description: string;
  punishType: string;
  punishDuration: string;
  severity: Rule["severity"];
}

const PUNISH_TYPES = [
  "Fără pedeapsă",
  "Avertisment",
  "Mute",
  "Kick",
  "Ban",
  "Ban Permanent",
  "Blacklist",
];
const PUNISH_DURATIONS: Record<string, string[]> = {
  Mute: [
    "30 minute",
    "1 oră",
    "3 ore",
    "12 ore",
    "1 zi",
    "3 zile",
    "7 zile",
    "Permanent",
  ],
  Ban: [
    "1 zi",
    "3 zile",
    "7 zile",
    "14 zile",
    "30 zile",
    "90 zile",
    "Permanent",
  ],
  Kick: [],
  Avertisment: [],
  "Ban Permanent": [],
  Blacklist: [],
  "Fără pedeapsă": [],
};

const emptyEntry = (): RuleEntry => ({
  id: Math.random().toString(36).slice(2),
  title: "",
  description: "",
  punishType: "Fără pedeapsă",
  punishDuration: "",
  severity: "info",
});

const CreateRuleModal = ({
  onClose,
  onCreated,
  username: _username,
  defaultCategory,
}: {
  onClose: () => void;
  onCreated: (rules: Rule[]) => void;
  username: string;
  defaultCategory?: string;
}) => {
  const [category, setCategory] = useState(defaultCategory || "");
  const [entries, setEntries] = useState<RuleEntry[]>([emptyEntry()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateEntry = (id: string, field: keyof RuleEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              [field]: value,
              ...(field === "punishType" ? { punishDuration: "" } : {}),
            }
          : e,
      ),
    );
  };

  const addEntry = () => setEntries((prev) => [...prev, emptyEntry()]);
  const removeEntry = (id: string) =>
    setEntries((prev) =>
      prev.length > 1 ? prev.filter((e) => e.id !== id) : prev,
    );

  const buildContent = (entry: RuleEntry): string => {
    let content = entry.description || entry.title;
    if (entry.punishType && entry.punishType !== "Fără pedeapsă") {
      const duration = entry.punishDuration ? ` ${entry.punishDuration}` : "";
      content += ` [${entry.punishType.toUpperCase()}${duration}]`;
    }
    return content;
  };

  const handleSubmit = async () => {
    if (!category.trim()) {
      setError("Numele categoriei este obligatoriu.");
      return;
    }
    const valid = entries.filter((e) => e.title.trim());
    if (valid.length === 0) {
      setError("Adaugă cel puțin o regulă cu titlu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const created: Rule[] = [];
      for (const entry of valid) {
        const data = await apiFetch("/rules", {
          method: "POST",
          body: JSON.stringify({
            title: entry.title.trim(),
            content: buildContent(entry),
            category: category.trim(),
            severity: entry.severity,
          }),
        });
        if (data.success && data.rule) created.push(data.rule);
      }
      onCreated(created);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare la salvare.");
    } finally {
      setLoading(false);
    }
  };

  const severityOptions: {
    value: Rule["severity"];
    label: string;
    color: string;
  }[] = [
    { value: "info", label: "Ușoară", color: "#3b82f6" },
    { value: "warning", label: "Medie", color: "#f59e0b" },
    { value: "severe", label: "Gravă", color: "#ef4444" },
  ];

  return (
    <motion.div
      className="dash-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          width: "min(700px, 95vw)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "Cinzel, serif",
              }}
            >
              📋 Regulament Nou
            </div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
              Adaugă mai multe reguli dintr-o dată
            </div>
          </div>
          <button className="dash-rule-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Category name */}
          <label className="dash-label">Numele categoriei *</label>
          <input
            className="dash-input"
            placeholder="Ex: Regulament Global, Regulament Chat, Regulament PvP..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ marginBottom: 24, fontSize: 15, fontWeight: 600 }}
            autoFocus={!defaultCategory}
          />

          {/* Rules list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {entries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  padding: "16px",
                  position: "relative",
                }}
              >
                {/* Rule number + delete */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#d4af37",
                      fontFamily: "Cinzel, serif",
                    }}
                  >
                    《{idx + 1}》 Regula {idx + 1}
                  </span>
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeEntry(entry.id)}
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#ef4444",
                        borderRadius: 6,
                        padding: "3px 8px",
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                    >
                      ✕ Șterge
                    </button>
                  )}
                </div>

                {/* Title */}
                <input
                  className="dash-input"
                  placeholder="Titlul regulii (ex: Este interzis spam-ul în chat)"
                  value={entry.title}
                  onChange={(e) =>
                    updateEntry(entry.id, "title", e.target.value)
                  }
                  style={{ marginBottom: 10 }}
                />

                {/* Description (optional) */}
                <textarea
                  className="dash-input dash-textarea"
                  placeholder="Descriere detaliată (opțional)..."
                  value={entry.description}
                  onChange={(e) =>
                    updateEntry(entry.id, "description", e.target.value)
                  }
                  style={{
                    marginBottom: 10,
                    minHeight: 56,
                    resize: "vertical",
                  }}
                />

                {/* Punishment + Severity row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {/* Punishment type */}
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        color: "#555",
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        display: "block",
                        marginBottom: 5,
                      }}
                    >
                      PEDEAPSĂ
                    </label>
                    <select
                      className="dash-input"
                      value={entry.punishType}
                      onChange={(e) =>
                        updateEntry(entry.id, "punishType", e.target.value)
                      }
                      style={{ padding: "8px 10px", fontSize: 12 }}
                    >
                      {PUNISH_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        color: "#555",
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        display: "block",
                        marginBottom: 5,
                      }}
                    >
                      DURATĂ
                    </label>
                    {(PUNISH_DURATIONS[entry.punishType]?.length ?? 0) > 0 ? (
                      <select
                        className="dash-input"
                        value={entry.punishDuration}
                        onChange={(e) =>
                          updateEntry(
                            entry.id,
                            "punishDuration",
                            e.target.value,
                          )
                        }
                        style={{ padding: "8px 10px", fontSize: 12 }}
                      >
                        <option value="">Selectează...</option>
                        {PUNISH_DURATIONS[entry.punishType].map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="dash-input"
                        placeholder={
                          entry.punishType === "Fără pedeapsă"
                            ? "—"
                            : "Ex: Permanent"
                        }
                        value={entry.punishDuration}
                        onChange={(e) =>
                          updateEntry(
                            entry.id,
                            "punishDuration",
                            e.target.value,
                          )
                        }
                        disabled={
                          entry.punishType === "Fără pedeapsă" ||
                          entry.punishType === "Kick"
                        }
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          opacity:
                            entry.punishType === "Fără pedeapsă" ||
                            entry.punishType === "Kick"
                              ? 0.3
                              : 1,
                        }}
                      />
                    )}
                  </div>

                  {/* Severity */}
                  <div>
                    <label
                      style={{
                        fontSize: 10,
                        color: "#555",
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        display: "block",
                        marginBottom: 5,
                      }}
                    >
                      GRAVITATE
                    </label>
                    <div style={{ display: "flex", gap: 4 }}>
                      {severityOptions.map((s) => (
                        <button
                          key={s.value}
                          onClick={() =>
                            updateEntry(entry.id, "severity", s.value)
                          }
                          style={{
                            flex: 1,
                            padding: "7px 4px",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 700,
                            background:
                              entry.severity === s.value
                                ? `${s.color}20`
                                : "rgba(255,255,255,0.03)",
                            border: `1.5px solid ${entry.severity === s.value ? s.color : "rgba(255,255,255,0.07)"}`,
                            color:
                              entry.severity === s.value ? s.color : "#666",
                            transition: "all 0.15s",
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {entry.title && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#666",
                      padding: "8px 10px",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: 6,
                    }}
                  >
                    Preview:{" "}
                    <span style={{ color: "#aaa" }}>
                      《{idx + 1}》 {entry.title}
                    </span>
                    {entry.punishType !== "Fără pedeapsă" && (
                      <span style={{ color: "#ef4444", fontWeight: 700 }}>
                        {" "}
                        [{entry.punishType.toUpperCase()}
                        {entry.punishDuration
                          ? ` ${entry.punishDuration.toUpperCase()}`
                          : ""}
                        ]
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Add rule button */}
          <button
            onClick={addEntry}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "12px",
              borderRadius: 10,
              cursor: "pointer",
              background: "rgba(212,175,55,0.05)",
              border: "1.5px dashed rgba(212,175,55,0.3)",
              color: "#d4af37",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.15s",
            }}
          >
            + Adaugă regulă
          </button>

          {error && (
            <div className="dash-error" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: "#555" }}>
            {entries.filter((e) => e.title.trim()).length} reguli pregătite
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="dash-btn-secondary" onClick={onClose}>
              Anulează
            </button>
            <button
              className="dash-btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Se publică..." : "🚀 Publică Regulamentul"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==================== TICKET DETAIL MODAL ====================
interface TicketReply {
  id: number;
  content: string;
  author: string;
  author_role: string;
  created_at: string;
}

const categoryColors: Record<string, string> = {
  support: "#3b82f6",
  complaint: "#f59e0b",
  unban: "#ef4444",
};

const statusMeta: Record<string, { label: string; color: string; bg: string }> =
  {
    open: { label: "Deschis", color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
    "in-progress": {
      label: "În Lucru",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.1)",
    },
    closed: {
      label: "Rezolvat",
      color: "#6b7280",
      bg: "rgba(107,114,128,0.1)",
    },
  };

const TicketDetailModal = ({
  ticket,
  canManage,
  onClose,
  onStatusChange,
}: {
  ticket: TicketItem;
  canManage: boolean;
  onClose: () => void;
  onStatusChange: (id: number, status: TicketItem["status"]) => void;
}) => {
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const repliesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch(`/tickets/${ticket.id}`)
      .then((d) => setReplies(d.replies ?? []))
      .catch(() => {})
      .finally(() => setLoadingReplies(false));
  }, [ticket.id]);

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    setReplyError("");
    try {
      const d = await apiFetch(`/tickets/${ticket.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ content: replyText.trim() }),
      });
      setReplies((p) => [...p, d.reply]);
      setReplyText("");
    } catch (err: any) {
      setReplyError(err.message || "Eroare la trimitere");
    } finally {
      setSending(false);
    }
  };

  const handleStatus = (status: TicketItem["status"]) => {
    onStatusChange(ticket.id, status);
  };

  const sm = statusMeta[ticket.status] ?? statusMeta.open;
  const catColor = categoryColors[ticket.category] ?? "#d4af37";
  const catLabel =
    { support: "Suport", complaint: "Plângere", unban: "Debanare" }[
      ticket.category
    ] ?? ticket.category;
  const priorityLabel =
    { low: "Scăzut", medium: "Mediu", high: "Urgent" }[ticket.priority] ??
    ticket.priority;

  return (
    <motion.div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={{
          width: "min(640px, 100%)",
          maxHeight: "85vh",
          background: "#0f0f0f",
          borderRadius: 16,
          border: "1px solid rgba(212,175,55,0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 80px rgba(0,0,0,0.8)",
        }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP ACCENT BAR ── */}
        <div
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${catColor}, #d4af37)`,
          }}
        />

        {/* ── HEADER ── */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: "#666",
                  fontWeight: 600,
                  letterSpacing: 1,
                }}
              >
                TICKET #{ticket.id}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#888",
                borderRadius: 8,
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>

          <h2
            style={{
              margin: "0 0 14px",
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.3,
            }}
          >
            {ticket.title}
          </h2>

          {/* badges row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: `${catColor}18`,
                border: `1px solid ${catColor}40`,
                color: catColor,
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {catLabel}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: sm.bg,
                border: `1px solid ${sm.color}40`,
                color: sm.color,
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: sm.color,
                  display: "inline-block",
                }}
              />
              {sm.label}
            </span>
            <span
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#aaa",
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 11,
              }}
            >
              Prioritate: {priorityLabel}
            </span>
          </div>

          {/* meta row */}
          <div
            style={{
              display: "flex",
              gap: 20,
              marginTop: 12,
              fontSize: 12,
              color: "#666",
            }}
          >
            <span>
              👤 <strong style={{ color: "#aaa" }}>{ticket.username}</strong>
            </span>
            <span>🕐 {timeAgo(ticket.created_at)}</span>
          </div>
        </div>

        {/* ── BODY: DESCRIPTION + REPLIES ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* description */}
          {(ticket.content || ticket.description) && (
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: "#555",
                  fontWeight: 600,
                  marginBottom: 6,
                  letterSpacing: 0.5,
                }}
              >
                DESCRIERE
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#ccc",
                  lineHeight: 1.7,
                }}
              >
                {ticket.content || ticket.description}
              </p>
            </div>
          )}

          {/* replies section */}
          <p
            style={{
              fontSize: 11,
              color: "#555",
              fontWeight: 600,
              letterSpacing: 1,
              marginBottom: 14,
            }}
          >
            CONVERSAȚIE {replies.length > 0 && `· ${replies.length} mesaje`}
          </p>

          {loadingReplies && (
            <div
              style={{
                textAlign: "center",
                padding: "30px 0",
                color: "#444",
                fontSize: 13,
              }}
            >
              <RefreshCw
                size={18}
                style={{
                  animation: "spin 1s linear infinite",
                  marginBottom: 8,
                }}
              />
              <p style={{ margin: 0 }}>Se încarcă...</p>
            </div>
          )}

          {!loadingReplies && replies.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "30px 0",
                color: "#444",
                borderRadius: 10,
                border: "1px dashed rgba(255,255,255,0.07)",
              }}
            >
              <MessageSquare
                size={24}
                style={{ marginBottom: 8, opacity: 0.3 }}
              />
              <p style={{ margin: 0, fontSize: 13 }}>Niciun răspuns încă</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {replies.map((r, i) => {
              const isStaffReply = r.author_role !== "player";
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    display: "flex",
                    flexDirection: isStaffReply ? "row-reverse" : "row",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: isStaffReply
                        ? "linear-gradient(135deg, #d4af37, #a07830)"
                        : "rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: isStaffReply ? "#000" : "#888",
                    }}
                  >
                    {r.author.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Bubble */}
                  <div
                    style={{
                      maxWidth: "75%",
                      background: isStaffReply
                        ? "rgba(212,175,55,0.08)"
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isStaffReply ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: isStaffReply
                        ? "12px 4px 12px 12px"
                        : "4px 12px 12px 12px",
                      padding: "10px 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 5,
                        alignItems: "center",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 12,
                          color: isStaffReply ? "#d4af37" : "#bbb",
                        }}
                      >
                        {r.author}
                      </strong>
                      {isStaffReply && (
                        <span
                          style={{
                            fontSize: 9,
                            background: "rgba(212,175,55,0.2)",
                            color: "#d4af37",
                            borderRadius: 4,
                            padding: "1px 5px",
                            fontWeight: 700,
                            letterSpacing: 0.5,
                          }}
                        >
                          STAFF
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          color: "#555",
                          marginLeft: "auto",
                        }}
                      >
                        {timeAgo(r.created_at)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "#ccc",
                        lineHeight: 1.6,
                      }}
                    >
                      {r.content}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div ref={repliesEndRef} />
        </div>

        {/* ── FOOTER: REPLY + ACTIONS ── */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: "16px 24px",
          }}
        >
          {ticket.status !== "closed" ? (
            <div style={{ marginBottom: 12 }}>
              <textarea
                className="dash-input dash-textarea"
                placeholder="Scrie un răspuns..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleSendReply();
                }}
                style={{ minHeight: 70, marginBottom: 8, resize: "none" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                {replyError && (
                  <span style={{ color: "#ef4444", fontSize: 12 }}>{replyError}</span>
                )}
                <button
                  className="dash-btn-primary"
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  {sending ? (
                    <RefreshCw size={13} />
                  ) : (
                    <MessageSquare size={13} />
                  )}
                  {sending ? "Se trimite..." : "Trimite"}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "10px 0 14px",
                color: "#555",
                fontSize: 12,
              }}
            >
              Ticket închis · Nu se mai pot adăuga răspunsuri
            </div>
          )}

          {canManage && (
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button className="dash-btn-secondary" onClick={onClose}>
                Închide
              </button>
              {ticket.status === "open" && (
                <button
                  className="dash-btn-action inprogress"
                  style={{ padding: "8px 18px" }}
                  onClick={() => handleStatus("in-progress")}
                >
                  <PlayCircle size={13} /> Preia Ticket
                </button>
              )}
              {ticket.status === "in-progress" && (
                <button
                  className="dash-btn-action resolve"
                  style={{ padding: "8px 18px" }}
                  onClick={() => handleStatus("closed")}
                >
                  <CheckCircle size={13} /> Marchează Rezolvat
                </button>
              )}
              {ticket.status === "closed" && (
                <button
                  className="dash-btn-action reopen"
                  style={{ padding: "8px 18px" }}
                  onClick={() => handleStatus("open")}
                >
                  <RefreshCw size={13} /> Redeschide
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==================== CREATE ANNOUNCEMENT MODAL ====================
const EditAnnouncementModal = ({
  ann,
  onClose,
  onSaved,
}: {
  ann: Announcement;
  onClose: () => void;
  onSaved: (data: Partial<Announcement>) => void;
}) => {
  const parsedSections = typeof ann.sections === "string" ? JSON.parse(ann.sections || "[]") : (ann.sections ?? []);
  const [title, setTitle] = useState(ann.title);
  const [content, setContent] = useState(ann.content);
  const [imageUrl, setImageUrl] = useState(ann.image_url ?? "");
  const [pinned, setPinned] = useState(ann.pinned);
  const [sections, setSections] = useState<AnnouncementSection[]>(parsedSections);
  const [loading, setLoading] = useState(false);

  const removeSection = (si: number) => setSections((p) => p.filter((_, i) => i !== si));
  const updateSection = (si: number, field: string, val: string) =>
    setSections((p) => p.map((s, i) => i === si ? { ...s, [field]: val } : s));
  const addItem = (si: number) =>
    setSections((p) => p.map((s, i) => i === si ? { ...s, items: [...s.items, ""] } : s));
  const removeItem = (si: number, ii: number) =>
    setSections((p) => p.map((s, i) => i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s));
  const updateItem = (si: number, ii: number, val: string) =>
    setSections((p) => p.map((s, i) => i === si ? { ...s, items: s.items.map((it, j) => j === ii ? val : it) } : s));

  const handleSave = async () => {
    setLoading(true);
    onSaved({ title, content, image_url: imageUrl || undefined, sections, pinned });
    setLoading(false);
  };

  return (
    <motion.div className="dash-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="dash-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680, width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
        <div className="dash-modal-header">
          <span className="dash-modal-title"><Pencil size={16} />Editează Anunț</span>
          <button className="dash-rule-btn" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dash-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="dash-label">🖼️ Imagine Copertă</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input className="dash-input" placeholder="https://... (link imagine)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={{ flex: 1 }} />
              <label style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37", borderRadius: 8, padding: "0 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0 }}>
                📁 Din PC
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setImageUrl(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }} />
              </label>
            </div>
            {imageUrl && (
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", maxHeight: 160 }}>
                <img src={imageUrl} alt="preview" style={{ width: "100%", height: 160, objectFit: "cover" }} onError={(e) => (e.currentTarget.style.display = "none")} />
                <button onClick={() => setImageUrl("")} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} /></button>
              </div>
            )}
          </div>
          <div>
            <label className="dash-label">Titlu *</label>
            <input className="dash-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="dash-label">Descriere scurtă *</label>
            <textarea className="dash-input dash-textarea" value={content} onChange={(e) => setContent(e.target.value)} style={{ minHeight: 80 }} />
          </div>
          <div>
            <label className="dash-label" style={{ marginBottom: 8 }}>📋 Secțiuni</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {PREDEFINED_CATEGORIES.map((cat) => {
                const alreadyAdded = sections.some((s) => s.title === cat.label);
                return (
                  <button key={cat.label} onClick={() => { if (!alreadyAdded) setSections((p) => [...p, { title: cat.label, color: cat.color, items: [""] }]); }}
                    style={{ background: alreadyAdded ? `${cat.color}22` : "rgba(255,255,255,0.04)", border: `1px solid ${alreadyAdded ? cat.color : "rgba(255,255,255,0.1)"}`, color: alreadyAdded ? cat.color : "#666", borderRadius: 8, padding: "5px 12px", cursor: alreadyAdded ? "default" : "pointer", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", opacity: alreadyAdded ? 1 : 0.7 }}>
                    {alreadyAdded ? "✓ " : "+ "}{cat.label}
                  </button>
                );
              })}
            </div>
            {sections.map((sec, si) => (
              <div key={si} style={{ background: `${sec.color}08`, border: `1px solid ${sec.color}30`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: sec.color, letterSpacing: "0.08em" }}>{sec.title}</span>
                  <button onClick={() => removeSection(si)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>✕ Elimină</button>
                </div>
                {sec.items.map((item, ii) => (
                  <div key={ii} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: sec.color, fontSize: 14, fontWeight: 700 }}>•</span>
                    <input className="dash-input" value={item} onChange={(e) => updateItem(si, ii, e.target.value)} style={{ flex: 1, fontSize: 13, padding: "6px 10px" }} />
                    {sec.items.length > 1 && <button onClick={() => removeItem(si, ii)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14 }}>✕</button>}
                  </div>
                ))}
                <button onClick={() => addItem(si)} style={{ background: "none", border: `1px dashed ${sec.color}40`, color: sec.color, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, marginTop: 4, width: "100%", opacity: 0.7 }}>+ Punct nou</button>
              </div>
            ))}
          </div>
          <label className="dash-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            📌 Fixează anunțul în top
          </label>
        </div>
        <div className="dash-modal-footer">
          <button className="dash-btn-secondary" onClick={onClose}>Anulează</button>
          <button className="dash-btn-primary" onClick={handleSave} disabled={loading}>{loading ? "Se salvează..." : "Salvează"}</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const PREDEFINED_CATEGORIES = [
  { label: "GLOBAL",        color: "#ef4444" },
  { label: "MINIGAMES",     color: "#facc15" },
  { label: "SURVIVAL",      color: "#4ade80" },
  { label: "BEDWARS",       color: "#60a5fa" },
  { label: "SKYWARS",       color: "#fb923c" },
  { label: "SKYBLOCK",      color: "#c084fc" },
  { label: "CREATIVE",      color: "#34d399" },
  { label: "LOBBY",         color: "#a78bfa" },
  { label: "DISCORD",       color: "#818cf8" },
  { label: "WEBSITE",       color: "#38bdf8" },
  { label: "EVENTS",        color: "#f472b6" },
  { label: "SHOP",          color: "#d4af37" },
];

const CreateAnnouncementModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (ann: Announcement) => void;
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sections, setSections] = useState<AnnouncementSection[]>([]);

  const removeSection = (si: number) => setSections((p) => p.filter((_, i) => i !== si));
  const updateSection = (si: number, field: string, val: string) =>
    setSections((p) => p.map((s, i) => i === si ? { ...s, [field]: val } : s));
  const addItem = (si: number) =>
    setSections((p) => p.map((s, i) => i === si ? { ...s, items: [...s.items, ""] } : s));
  const removeItem = (si: number, ii: number) =>
    setSections((p) => p.map((s, i) => i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s));
  const updateItem = (si: number, ii: number, val: string) =>
    setSections((p) => p.map((s, i) => i === si ? { ...s, items: s.items.map((it, j) => j === ii ? val : it) } : s) as AnnouncementSection[]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) { setError("Titlul și conținutul sunt obligatorii."); return; }
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(), content: content.trim(),
          image_url: imageUrl.trim() || null,
          sections: sections.length > 0 ? JSON.stringify(sections) : null,
          pinned,
        }),
      });
      onCreated(data.announcement ?? { id: Date.now(), title, content, image_url: imageUrl, sections, pinned, author_username: "Tu", created_at: new Date().toISOString() });
      onClose();
    } catch { setError("Eroare la creare. Încearcă din nou."); }
    finally { setLoading(false); }
  };

  return (
    <motion.div className="dash-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="dash-modal"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 680, width: "100%", maxHeight: "88vh", overflowY: "auto" }}
      >
        <div className="dash-modal-header">
          <span className="dash-modal-title"><Megaphone size={16} />Anunț Nou</span>
          <button className="dash-rule-btn" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dash-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Image URL */}
          <div>
            <label className="dash-label">🖼️ Imagine Copertă</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input className="dash-input" placeholder="https://... (link imagine)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={{ flex: 1 }} />
              <label style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37", borderRadius: 8, padding: "0 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0 }}>
                📁 Din PC
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setImageUrl(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }} />
              </label>
            </div>
            {imageUrl && (
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", maxHeight: 160 }}>
                <img src={imageUrl} alt="preview" style={{ width: "100%", height: 160, objectFit: "cover" }} onError={(e) => (e.currentTarget.style.display = "none")} />
                <button onClick={() => setImageUrl("")} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} /></button>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="dash-label">Titlu *</label>
            <input className="dash-input" placeholder="Titlul anunțului..." value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Content */}
          <div>
            <label className="dash-label">Descriere scurtă *</label>
            <textarea className="dash-input dash-textarea" placeholder="Descriere generală a anunțului..." value={content} onChange={(e) => setContent(e.target.value)} style={{ minHeight: 80 }} />
          </div>

          {/* Sections */}
          <div>
            <label className="dash-label" style={{ marginBottom: 8 }}>📋 Secțiuni anunț</label>

            {/* Category selector grid */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {PREDEFINED_CATEGORIES.map((cat) => {
                const alreadyAdded = sections.some((s) => s.title === cat.label);
                return (
                  <button key={cat.label} onClick={() => { if (!alreadyAdded) setSections((p) => [...p, { title: cat.label, color: cat.color, items: [""] }]); }}
                    style={{ background: alreadyAdded ? `${cat.color}22` : "rgba(255,255,255,0.04)", border: `1px solid ${alreadyAdded ? cat.color : "rgba(255,255,255,0.1)"}`, color: alreadyAdded ? cat.color : "#666", borderRadius: 8, padding: "5px 12px", cursor: alreadyAdded ? "default" : "pointer", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", opacity: alreadyAdded ? 1 : 0.7 }}>
                    {alreadyAdded ? "✓ " : "+ "}{cat.label}
                  </button>
                );
              })}
            </div>

            {/* Added sections */}
            {sections.map((sec, si) => (
              <div key={si} style={{ background: `${sec.color}08`, border: `1px solid ${sec.color}30`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: sec.color, letterSpacing: "0.08em" }}>{sec.title}</span>
                  <button onClick={() => removeSection(si)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>✕ Elimină</button>
                </div>

                {sec.items.map((item, ii) => (
                  <div key={ii} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: sec.color, fontSize: 14, fontWeight: 700 }}>•</span>
                    <input className="dash-input" placeholder="Punct de update..." value={item}
                      onChange={(e) => updateItem(si, ii, e.target.value)}
                      style={{ flex: 1, fontSize: 13, padding: "6px 10px" }} />
                    {sec.items.length > 1 && (
                      <button onClick={() => removeItem(si, ii)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => addItem(si)} style={{ background: "none", border: `1px dashed ${sec.color}40`, color: sec.color, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, marginTop: 4, width: "100%", opacity: 0.7 }}>+ Punct nou</button>
              </div>
            ))}
          </div>

          {/* Pinned */}
          <label className="dash-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            📌 Fixează anunțul în top
          </label>

          {error && <div className="dash-error">{error}</div>}
        </div>
                <div className="dash-modal-footer">
          <button className="dash-btn-secondary" onClick={onClose}>
            Anulează
          </button>
          <button
            className="dash-btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Se publică..." : "Publică"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==================== TICKET SECTION WRAPPER ====================
const TicketSection = ({
  title,
  tickets,
  category,
  canManage,
  username,
  onStatusChange,
  onCreated,
}: {
  title: string;
  tickets: TicketItem[];
  category: TicketItem["category"];
  canManage: boolean;
  username: string;
  onStatusChange: (id: number, status: TicketItem["status"]) => void;
  onCreated: (ticket: TicketItem) => void;
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  const inProgressTickets = tickets.filter((t) => t.status === "in-progress");
  const activeTickets = tickets.filter((t) => t.status !== "closed");
  const closedTickets = tickets.filter((t) => t.status === "closed");
  const openTickets = tickets.filter((t) => t.status === "open");
  const visibleTickets = (canManage && showClosed) || activeTab === "history"
    ? (activeTab === "history" ? closedTickets : tickets)
    : activeTickets;

  const categoryConfig = {
    support: { accent: "#3b82f6", icon: "🎫" },
    complaint: { accent: "#ef4444", icon: "⚠️" },
    unban: { accent: "#f59e0b", icon: "🔓" },
  };
  const cfg = categoryConfig[category] ?? categoryConfig.support;

  const statsCards = [
    {
      label: "Total",
      value: tickets.length,
      color: "#6b7280",
      bg: "rgba(107,114,128,0.08)",
      icon: "📊",
    },
    {
      label: "Deschise",
      value: openTickets.length,
      color: "#4ade80",
      bg: "rgba(74,222,128,0.08)",
      icon: "🟢",
    },
    {
      label: "În Lucru",
      value: inProgressTickets.length,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      icon: "⚡",
    },
    {
      label: "Rezolvate",
      value: closedTickets.length,
      color: cfg.accent,
      bg: `${cfg.accent}12`,
      icon: "✅",
    },
  ];

  return (
    <motion.div
      key={title}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">
            {cfg.icon} {title}
          </h1>
          <p className="dash-page-sub">
            {activeTickets.length} active · {closedTickets.length} rezolvate
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Tabs: Active / History — visible for everyone */}
          <div style={{
            display: "flex",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "10px",
            padding: "3px",
            gap: "2px",
          }}>
            <button
              onClick={() => setActiveTab("active")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                background: activeTab === "active" ? cfg.accent : "transparent",
                color: activeTab === "active" ? "#fff" : "#888",
                transition: "all 0.2s",
              }}
            >
              🟢 Active ({activeTickets.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                background: activeTab === "history" ? "#6b7280" : "transparent",
                color: activeTab === "history" ? "#fff" : "#888",
                transition: "all 0.2s",
              }}
            >
              📜 Istoric ({closedTickets.length})
            </button>
          </div>
          {canManage && activeTab === "active" && closedTickets.length > 0 && (
            <button
              className="dash-btn-secondary"
              onClick={() => setShowClosed(!showClosed)}
            >
              <Filter size={14} />
              {showClosed ? "Doar active" : "Toate"}
            </button>
          )}
          <button
            className="dash-btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            Nou
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {statsCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            style={{
              background: s.bg,
              border: `1px solid ${s.color}25`,
              borderRadius: 12,
              padding: "16px 20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* accent bar top */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, ${s.color}, transparent)`,
              }}
            />
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#666",
                fontWeight: 600,
                marginTop: 4,
                letterSpacing: 0.5,
              }}
            >
              {s.label.toUpperCase()}
            </div>
          </motion.div>
        ))}
      </div>

      {activeTab === "history" && closedTickets.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "48px 20px",
          color: "#555",
          background: "rgba(255,255,255,0.02)",
          borderRadius: "12px",
          border: "1px dashed rgba(255,255,255,0.08)",
        }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
          <div style={{ fontSize: "15px", fontWeight: 600 }}>Niciun tichet rezolvat încă</div>
          <div style={{ fontSize: "13px", marginTop: "6px", color: "#444" }}>Istoricul va apărea aici după ce un tichet e rezolvat</div>
        </div>
      )}
      {visibleTickets.length > 0 && (
        <div className="dash-card">
          {activeTab === "history" && (
            <div style={{
              padding: "10px 16px",
              background: "rgba(107,114,128,0.1)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px 12px 0 0",
              fontSize: "13px",
              color: "#888",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              📜 <span>Afișezi <strong style={{ color: "#ccc" }}>{closedTickets.length}</strong> tichete rezolvate din istoric</span>
            </div>
          )}
          <TicketTable
            tickets={visibleTickets}
            canManage={canManage}
            onStatusChange={onStatusChange}
            onSelect={setSelectedTicket}
          />
        </div>
      )}

      <AnimatePresence>
        {showCreate && category === "support" && (
          <CreateTicketModal
            onClose={() => setShowCreate(false)}
            onCreated={(t) => {
              onCreated(t);
            }}
            username={username}
          />
        )}
        {showCreate && category === "complaint" && (
          <CreateComplaintModal
            onClose={() => setShowCreate(false)}
            onCreated={(t) => {
              onCreated(t);
            }}
            username={username}
          />
        )}
        {showCreate && category === "unban" && (
          <CreateUnbanModal
            onClose={() => setShowCreate(false)}
            onCreated={(t) => {
              onCreated(t);
            }}
            username={username}
          />
        )}
        {selectedTicket && (
          <TicketDetailModal
            ticket={selectedTicket}
            canManage={canManage}
            onClose={() => setSelectedTicket(null)}
            onStatusChange={(id, status) => {
              onStatusChange(id, status);
              setSelectedTicket((prev) => (prev ? { ...prev, status } : null));
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ==================== MAIN DASHBOARD ====================
const Dashboard = () => {
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [notifications, setNotifications] = useState(0);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [expandedRules, setExpandedRules] = useState<number[]>([]);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showCreateAnn, setShowCreateAnn] = useState(false);
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [selectedRuleCategory, setSelectedRuleCategory] = useState<
    string | null
  >(null);
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameCategoryValue, setRenameCategoryValue] = useState("");

  // Auth
  const [user, setUser] = useState<{
    id: number;
    username: string;
    role: UserRole;
    avatar: string;
  } | null>(null);

  // Data
  const [dashStats, setDashStats] = useState<DashStats | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats>({
    players_online: null,
    players_max: null,
    tps: null,
  });
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";
  const isMod = isAdmin || user?.role === "moderator";
  const isStaff = isMod || user?.role === "helper";

  // ==================== AUTH ====================
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        id: payload.userId,
        username: payload.username,
        role: payload.role,
        avatar: payload.username.slice(0, 2).toUpperCase(),
      });
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  // ==================== LOAD DATA ====================
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiFetch("/tickets"),
        apiFetch("/moderation?limit=10"),
        apiFetch("/auth/staff"),
        apiFetch("/announcements"),
        apiFetch("/rules"),
      ]);

      if (results[0].status === "fulfilled") {
        const t: TicketItem[] =
          results[0].value.tickets ?? results[0].value ?? [];
        setTickets(t);
        const openCount = t.filter((x) => x.status !== "closed").length;
        setNotifications(openCount);
      }
      if (results[1].status === "fulfilled")
        setRecentActions(results[1].value.actions ?? results[1].value ?? []);
      if (results[2].status === "fulfilled")
        setStaffList(results[2].value.staff ?? results[2].value ?? []);
      if (results[3].status === "fulfilled")
        setAnnouncements(
          results[3].value.announcements ?? results[3].value ?? [],
        );
      if (results[4].status === "fulfilled")
        setRules(results[4].value.rules ?? results[4].value ?? []);

      try {
        const mc = await apiFetch("/minecraft/stats");
        setLiveStats({
          players_online: mc.players_online ?? null,
          players_max: mc.players_max ?? null,
          tps: mc.tps ?? null,
        });
      } catch {
        /* plugin offline */
      }

      try {
        const gs = await apiFetch("/auth/stats");
        setDashStats({
          total_players: gs.total_players ?? 0,
          new_players_24h: gs.new_players_24h ?? 0,
          banned_count: gs.banned_count ?? 0,
          active_players: gs.active_players ?? liveStats.players_online ?? 0,
          monthly_votes: gs.monthly_votes ?? 0,
        });
      } catch {
        setDashStats({ total_players: 0, new_players_24h: 0, banned_count: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // ==================== WEBSOCKET ====================
  useEffect(() => {
    const token = getToken();
    if (!token || !user) return;
    const connect = () => {
      try {
        const ws = new WebSocket(`${WS_URL}?token=${token}`);
        wsRef.current = ws;
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "server:stats")
              setLiveStats({
                players_online: msg.data.players_online ?? null,
                players_max: msg.data.players_max ?? null,
                tps: msg.data.tps ?? null,
              });
            else if (msg.type === "players:update") {
              if (msg.data.online) setSessions(msg.data.online);
              if (msg.data.players_online !== undefined)
                setLiveStats((p) => ({
                  ...p,
                  players_online: msg.data.players_online,
                }));
            } else if (msg.type === "moderation:action")
              setRecentActions((p) => [msg.data, ...p].slice(0, 10));
            else if (msg.type === "ticket:new") {
              setTickets((p) => [msg.data, ...p]);
              setNotifications((n) => n + 1);
            } else if (msg.type === "ticket:updated") {
              setTickets((p) =>
                p.map((t) => (t.id === msg.data.id ? { ...t, ...msg.data } : t))
              );
              // Notify player if it's their ticket
              setToast((_prev: any) => ({
                show: true,
                message:
                  msg.data.status === "closed"
                    ? "✅ Tichetul tău a fost rezolvat!"
                    : msg.data.status === "in-progress"
                    ? "🔧 Tichetul tău a fost preluat de staff!"
                    : "📋 Tichetul tău a fost actualizat!",
              }));
            } else if (msg.type === "ticket:reply") {
              // Update replies if the ticket modal is open
              setToast({
                show: true,
                message: "💬 Ai primit un răspuns la tichet!",
              });
            }
          } catch {}
        };
        ws.onclose = () => setTimeout(connect, 5000);
      } catch {}
    };
    connect();
    return () => wsRef.current?.close();
  }, [user]);

  // ==================== TICKET HANDLERS ====================
  const handleTicketStatusChange = async (
    id: number,
    status: TicketItem["status"],
  ) => {
    try {
      await apiFetch(`/tickets/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    } catch {}
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const handleTicketCreated = (ticket: TicketItem) => {
    setTickets((prev) => [ticket, ...prev]);
    setNotifications((n) => n + 1);
  };

  // ==================== FILTER TICKETS BY ROLE ====================
  // Player sees only their own tickets; staff sees all
  const visibleTickets =
    isStaff || isAdmin
      ? tickets
      : tickets.filter((t) => t.created_by === user?.username || t.created_by_id === user?.id);

  const supportTickets = visibleTickets.filter((t) => t.category === "support");
  const complaintTickets = visibleTickets.filter(
    (t) => t.category === "complaint",
  );
  const unbanTickets = visibleTickets.filter((t) => t.category === "unban");

  const openSupport = supportTickets.filter(
    (t) => t.status !== "closed",
  ).length;
  const openComplaints = complaintTickets.filter(
    (t) => t.status !== "closed",
  ).length;
  const openUnban = unbanTickets.filter((t) => t.status !== "closed").length;

  // ==================== ANNOUNCEMENT HANDLERS ====================
  const handleDeleteAnn = async (id: number) => {
    if (!confirm("Ștergi acest anunț?")) return;
    try {
      await apiFetch(`/announcements/${id}`, { method: "DELETE" });
      setAnnouncements((p) => p.filter((a) => a.id !== id));
      setSelectedAnn(null);
    } catch { alert("Eroare la ștergere."); }
  };

  const handleUpdateAnn = async (id: number, data: Partial<Announcement>) => {
    try {
      const res = await apiFetch(`/announcements/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      const updated = res.announcement ?? { ...selectedAnn!, ...data };
      setAnnouncements((p) => p.map((a) => a.id === id ? updated : a));
      setSelectedAnn(updated);
      setEditingAnn(null);
    } catch { alert("Eroare la actualizare."); }
  };

  // ==================== RULE HANDLERS ====================
  const handleDeleteRule = async (id: number) => {
    try {
      await apiFetch(`/rules/${id}`, { method: "DELETE" });
    } catch {}
    setRules((p) => p.filter((r) => r.id !== id));
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;
    try {
      await apiFetch(`/rules/${editingRule.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editingRule.title,
          content: editingRule.content,
          severity: editingRule.severity,
        }),
      });
      const d = await apiFetch("/rules");
      setRules(d.rules ?? []);
    } catch {
      setRules((p) =>
        p.map((r) => (r.id === editingRule.id ? editingRule : r)),
      );
    }
    setEditingRule(null);
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) {
      setRenamingCategory(null);
      return;
    }
    const categoryRuleIds = (groupedRules[oldName] ?? []).map((r) => r.id);
    try {
      await Promise.all(
        categoryRuleIds.map((id) =>
          apiFetch(`/rules/${id}`, {
            method: "PUT",
            body: JSON.stringify({ category: newName.trim() }),
          }),
        ),
      );
      setRules((p) =>
        p.map((r) =>
          r.category === oldName ? { ...r, category: newName.trim() } : r,
        ),
      );
      if (selectedRuleCategory === oldName)
        setSelectedRuleCategory(newName.trim());
    } catch {}
    setRenamingCategory(null);
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (
      !window.confirm(
        `Ștergi toată categoria "${categoryName}" și toate regulile din ea?`,
      )
    )
      return;
    const categoryRuleIds = (groupedRules[categoryName] ?? []).map((r) => r.id);
    try {
      await Promise.all(
        categoryRuleIds.map((id) =>
          apiFetch(`/rules/${id}`, { method: "DELETE" }),
        ),
      );
      setRules((p) => p.filter((r) => r.category !== categoryName));
      if (selectedRuleCategory === categoryName) setSelectedRuleCategory(null);
    } catch {}
  };

  const groupedRules = rules.reduce(
    (acc, rule) => {
      if (!acc[rule.category]) acc[rule.category] = [];
      acc[rule.category].push(rule);
      return acc;
    },
    {} as Record<string, Rule[]>,
  );

  const selectedCategoryRules = selectedRuleCategory
    ? (groupedRules[selectedRuleCategory] ?? [])
    : [];

  const toggleRule = (id: number) =>
    setExpandedRules((p) =>
      p.includes(id) ? p.filter((r) => r !== id) : [...p, id],
    );

  // ==================== NAV ====================
  const navCategories: {
    title: string;
    items: {
      id: string;
      label: string;
      icon: any;
      show: boolean;
      badge?: number;
    }[];
  }[] = [
    {
      title: "PRINCIPAL",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          show: true,
        },
        { id: "players", label: "Jucători", icon: Users, show: isMod ?? false },
        { id: "staff", label: "Staff", icon: Shield, show: true },
      ],
    },
    {
      title: "SUPORT",
      items: [
        {
          id: "tickets",
          label: "Tichete",
          icon: Ticket,
          show: true,
          badge: openSupport,
        },
        {
          id: "complaints",
          label: "Plângeri",
          icon: AlertCircle,
          show: true,
          badge: openComplaints,
        },
        {
          id: "unban",
          label: "Cereri Debanare",
          icon: RefreshCw,
          show: true,
          badge: openUnban,
        },
      ],
    },
    {
      title: "COMUNITATE",
      items: [
        { id: "rules", label: "Regulament", icon: BookOpen, show: true },
        { id: "announcements", label: "Anunțuri", icon: Megaphone, show: true },
      ],
    },
    {
      title: "ADMIN",
      items: [
        {
          id: "sessions",
          label: "Sesiuni Active",
          icon: Activity,
          show: isAdmin ?? false,
        },
        {
          id: "settings",
          label: "Setări",
          icon: Settings,
          show: isAdmin ?? false,
        },
      ],
    },
  ];

  const handleLogout = () => {
    removeToken();
    navigate("/login");
  };

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toast.show) {
      const t = setTimeout(() => setToast({ show: false, message: "" }), 4000);
      return () => clearTimeout(t);
    }
  }, [toast.show]);

  if (!user) return null;

  // ==================== RENDER ====================
  return (
    <div className="dash-root">
      {/* Toast notification for players */}
      {toast.show && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          border: "1px solid rgba(212,175,55,0.4)",
          borderLeft: "4px solid #d4af37",
          borderRadius: "12px",
          padding: "14px 20px",
          color: "#fff",
          fontSize: "14px",
          fontWeight: 600,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          maxWidth: "320px",
          animation: "slideInRight 0.3s ease",
        }}>
          <span style={{ fontSize: "18px" }}>🔔</span>
          {toast.message}
          <button
            onClick={() => setToast({ show: false, message: "" })}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "16px" }}
          >✕</button>
        </div>
      )}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="dash-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`dash-sidebar ${mobileOpen ? "mobile-open" : ""}`}
        animate={{ width: sidebarOpen ? 280 : 88 }}
        transition={{ duration: 0.2 }}
      >
        <div className="dash-sidebar-header">
          <motion.div className="dash-sidebar-logo" layout>
            <img src={logo} alt="Netheris" />
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                NETHERIS
              </motion.span>
            )}
          </motion.div>
          <button
            className="dash-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <ChevronLeft size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>

        <nav className="dash-sidebar-nav">
          {navCategories.map((category, idx) => (
            <div key={idx} className="dash-nav-category">
              {sidebarOpen && (
                <div className="dash-nav-category-title">{category.title}</div>
              )}
              {category.items.map((item) => {
                if (!item.show) return null;
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    className={`dash-nav-item ${isActive ? "dash-nav-item--active" : ""}`}
                    onClick={() => {
                      setActiveSection(item.id);
                      setMobileOpen(false);
                    }}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon size={18} className="dash-nav-icon" />
                    {sidebarOpen && (
                      <>
                        <span className="dash-nav-label">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="dash-nav-badge">{item.badge}</span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="dash-sidebar-bottom">
          <button
            className="dash-theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Temă luminoasă" : "Temă întunecată"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {sidebarOpen && (
              <span>{theme === "dark" ? "Temă luminoasă" : "Temă întunecată"}</span>
            )}
          </button>
          <div className="dash-sidebar-user">
            <div className="dash-user-avatar">{user.avatar}</div>
            {sidebarOpen && (
              <>
                <div className="dash-user-info">
                  <span className="dash-user-name">{user.username}</span>
                  <span className="dash-user-role">{user.role}</span>
                </div>
                <button className="dash-logout-btn" onClick={handleLogout}>
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main */}
      <main
        className="dash-main"
        style={{ marginLeft: sidebarOpen ? 280 : 88 }}
      >
        <header className="dash-header">
          <div className="dash-header-left">
            <button
              className="dash-mobile-menu"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu size={18} />
            </button>
            <div className="dash-search">
              <Search size={14} className="dash-search-icon" />
              <input
                className="dash-search-input"
                placeholder="Caută jucători, tickete, reguli..."
              />
            </div>
          </div>
          <div className="dash-header-right">
            <div className="dash-server-status">
              <span
                className={`dash-status-dot ${liveStats.players_online !== null ? "online" : ""}`}
              />
              <span>mc.netheris.ro</span>
            </div>
            <button
              className="dash-notif-btn"
              onClick={() => setNotifications(0)}
            >
              <Bell size={18} />
              {notifications > 0 && (
                <span className="dash-notif-count">{notifications}</span>
              )}
            </button>
            <div className="dash-header-avatar">{user.avatar}</div>
          </div>
        </header>

        <div className="dash-content">
          <AnimatePresence mode="wait">
            {/* ====== DASHBOARD HOME ====== */}
            {activeSection === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="dash-page-header">
                  <div>
                    <h1 className="dash-page-title">Dashboard</h1>
                    <p className="dash-page-sub">
                      Bun venit înapoi,{" "}
                      <span className="highlight">{user.username}</span>
                    </p>
                  </div>
                  <div className="dash-page-date">
                    <Calendar size={14} />
                    <span>
                      {new Date().toLocaleDateString("ro-RO", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </div>
                </div>

                <div className="dash-stats-grid">
                  {[
                    {
                      icon: <Users size={24} />,
                      cls: "primary",
                      value: stat(dashStats?.total_players),
                      label: "Conturi Totale",
                      sub: "jucători înregistrați",
                      delay: 0.1,
                    },
                    {
                      icon: <TrendingUp size={24} />,
                      cls: "success",
                      value: liveStats.players_online !== null ? stat(liveStats.players_online) : stat(dashStats?.active_players),
                      label: "Conturi Active",
                      sub: liveStats.players_max ? `din ${liveStats.players_max} maxim` : "pe server acum",
                      delay: 0.15,
                    },
                    {
                      icon: <Ban size={24} />,
                      cls: "danger",
                      value: stat(dashStats?.banned_count),
                      label: "Conturi Banate",
                      sub: dashStats?.total_players && dashStats.banned_count
                        ? `${((dashStats.banned_count / dashStats.total_players) * 100).toFixed(2)}% din total`
                        : "din total",
                      delay: 0.2,
                    },
                    {
                      icon: <Star size={24} />,
                      cls: "warning",
                      value: dashStats?.monthly_votes ? stat(dashStats.monthly_votes) : "—",
                      label: "Voturi Lunare",
                      sub: "voturi pe site-uri listing",
                      delay: 0.25,
                    },
                  ].map((card, i) => (
                    <motion.div
                      key={i}
                      className="dash-stat-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: card.delay }}
                    >
                      <div className={`dash-stat-icon ${card.cls}`}>
                        {card.icon}
                      </div>
                      <div className="dash-stat-content">
                        <div className="dash-stat-value">{card.value}</div>
                        <div className="dash-stat-label">{card.label}</div>
                        <div className="dash-stat-sub">{card.sub}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="dash-grid-2">
                  {/* Recent Actions */}
                  <motion.div
                    className="dash-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="dash-card-header">
                      <div className="dash-card-title">
                        <Activity size={16} />
                        <span>Acțiuni Recente</span>
                      </div>
                    </div>
                    <div className="dash-card-body">
                      <div className="dash-list">
                        {loading && (
                          <div
                            style={{
                              padding: 20,
                              textAlign: "center",
                              opacity: 0.5,
                            }}
                          >
                            Se încarcă...
                          </div>
                        )}
                        {!loading && recentActions.length === 0 && (
                          <div
                            style={{
                              padding: 20,
                              textAlign: "center",
                              opacity: 0.5,
                            }}
                          >
                            Nu există acțiuni recente
                          </div>
                        )}
                        {recentActions.map((action, i) => (
                          <motion.div
                            key={action.id}
                            className="dash-list-item"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 + i * 0.05 }}
                          >
                            <ActionBadge type={action.action_type} />
                            <div className="dash-item-content">
                              <div className="dash-item-title">
                                {action.target_username}
                              </div>
                              <div className="dash-item-sub">
                                {action.reason}
                              </div>
                            </div>
                            <div className="dash-item-meta">
                              <span className="name">
                                {action.staff_username}
                              </span>
                              <span className="time">
                                {timeAgo(action.created_at)}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <div className="dash-card-footer">
                      Ultimele acțiuni moderare
                    </div>
                  </motion.div>

                  {/* Right column */}
                  <div>
                    <motion.div
                      className="dash-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      style={{ marginBottom: 20 }}
                    >
                      <div className="dash-card-header">
                        <div className="dash-card-title">
                          <Shield size={16} />
                          <span>Staff Online</span>
                        </div>
                        <span className="dash-online-count">
                          {staffList.filter((s) => s.online).length} online
                        </span>
                      </div>
                      <div className="dash-card-body">
                        <div className="dash-staff-list">
                          {staffList
                            .filter((s) => s.online)
                            .map((member, i) => (
                              <motion.div
                                key={member.id}
                                className="dash-staff-item"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 + i * 0.05 }}
                              >
                                <div className="dash-staff-avatar online">
                                  {member.username.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="dash-staff-info">
                                  <div className="dash-staff-name">
                                    {member.username}
                                  </div>
                                  <div className="dash-staff-time">Acum</div>
                                </div>
                                <RoleBadge role={member.role} />
                              </motion.div>
                            ))}
                          {staffList
                            .filter((s) => !s.online)
                            .slice(0, 2)
                            .map((member, i) => (
                              <motion.div
                                key={member.id}
                                className="dash-staff-item"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.45 + i * 0.05 }}
                              >
                                <div className="dash-staff-avatar offline">
                                  {member.username.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="dash-staff-info">
                                  <div className="dash-staff-name">
                                    {member.username}
                                  </div>
                                  <div className="dash-staff-time">
                                    {member.last_seen
                                      ? timeAgo(member.last_seen)
                                      : "Offline"}
                                  </div>
                                </div>
                                <RoleBadge role={member.role} />
                              </motion.div>
                            ))}
                          {staffList.length === 0 && !loading && (
                            <div
                              style={{
                                padding: 12,
                                textAlign: "center",
                                opacity: 0.5,
                              }}
                            >
                              Nu există date
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      className="dash-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="dash-card-header">
                        <div className="dash-card-title">
                          <Megaphone size={16} />
                          <span>Anunțuri</span>
                        </div>
                      </div>
                      <div className="dash-card-body" style={{ maxHeight: 300, overflowY: "auto" }}>
                        {announcements.slice(0, 10).map((ann) => (
                          <div
                            key={ann.id}
                            className={`dash-announce-item ${ann.pinned ? "pinned" : ""}`}
                            onClick={() => setSelectedAnn(ann)}
                            style={{ cursor: "pointer" }}
                          >
                            {ann.pinned && (
                              <span className="dash-pinned-label">
                                📌 Fixat
                              </span>
                            )}
                            <div className="dash-announce-title">
                              {ann.title}
                            </div>
                            <p className="dash-announce-content">
                              {ann.content.substring(0, 80)}...
                            </p>
                            <div className="dash-announce-meta">
                              <span>
                                Postat de <strong>{ann.author_username}</strong>
                              </span>
                              <span>{timeAgo(ann.created_at)}</span>
                            </div>
                          </div>
                        ))}
                        {announcements.length === 0 && !loading && (
                          <div
                            style={{
                              padding: 12,
                              textAlign: "center",
                              opacity: 0.5,
                            }}
                          >
                            Nu există anunțuri
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ====== PLAYERS ====== */}
            {activeSection === "players" && (
              <motion.div
                key="players"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="dash-page-header">
                  <h1 className="dash-page-title">Jucători</h1>
                </div>
                <div
                  className="dash-card"
                  style={{ padding: "40px", textAlign: "center" }}
                >
                  <Server
                    size={48}
                    style={{ opacity: 0.3, marginBottom: 16 }}
                  />
                  <p style={{ opacity: 0.5 }}>
                    Secțiunea va fi disponibilă după conectarea plugin-ului
                    Minecraft.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ====== STAFF ====== */}
            {activeSection === "staff" && (
              <motion.div
                key="staff"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="dash-page-header">
                  <h1 className="dash-page-title">Echipa Staff</h1>
                  <p className="dash-page-sub">
                    {staffList.length} membri ·{" "}
                    {staffList.filter((s) => s.online).length} online
                  </p>
                </div>
                <div className="dash-staff-grid">
                  {staffList.map((member, i) => (
                    <motion.div
                      key={member.id}
                      className="dash-staff-card"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        className={`dash-staff-card-avatar ${member.online ? "online" : ""}`}
                      >
                        {member.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="dash-staff-card-name">
                        {member.username}
                      </div>
                      <RoleBadge role={member.role} />
                      <div
                        className={`dash-staff-card-status ${member.online ? "online" : ""}`}
                      >
                        {member.online ? (
                          <>
                            <Circle size={8} /> Online acum
                          </>
                        ) : (
                          <>
                            <Clock size={8} />{" "}
                            {member.last_seen
                              ? timeAgo(member.last_seen)
                              : "Offline"}
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {staffList.length === 0 && !loading && (
                    <div style={{ opacity: 0.5 }}>Nu există date</div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ====== TICKETS ====== */}
            {activeSection === "tickets" && (
              <TicketSection
                key="tickets"
                title="Tichete Suport"
                tickets={supportTickets}
                category="support"
                canManage={isStaff ?? false}
                username={user.username}
                onStatusChange={handleTicketStatusChange}
                onCreated={handleTicketCreated}
              />
            )}

            {/* ====== COMPLAINTS ====== */}
            {activeSection === "complaints" && (
              <TicketSection
                key="complaints"
                title="Plângeri"
                tickets={complaintTickets}
                category="complaint"
                canManage={isStaff ?? false}
                username={user.username}
                onStatusChange={handleTicketStatusChange}
                onCreated={handleTicketCreated}
              />
            )}

            {/* ====== UNBAN ====== */}
            {activeSection === "unban" && (
              <TicketSection
                key="unban"
                title="Cereri Debanare"
                tickets={unbanTickets}
                category="unban"
                canManage={isStaff ?? false}
                username={user.username}
                onStatusChange={handleTicketStatusChange}
                onCreated={handleTicketCreated}
              />
            )}

            {/* ====== RULES ====== */}
            {activeSection === "rules" && !selectedRuleCategory && (
              <motion.div
                key="rules-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="dash-page-header">
                  <div>
                    <h1 className="dash-page-title">📋 Regulament</h1>
                    <p className="dash-page-sub">
                      {Object.keys(groupedRules).length} categorii ·{" "}
                      {rules.length} reguli total
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      className="dash-btn-primary"
                      onClick={() => setShowCreateRule(true)}
                    >
                      <Plus size={16} />
                      Regulă Nouă
                    </button>
                  )}
                </div>

                {rules.length === 0 && !loading && (
                  <div
                    className="dash-card"
                    style={{ padding: 40, textAlign: "center", opacity: 0.5 }}
                  >
                    Nu există reguli adăugate încă.
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 16,
                  }}
                >
                  {Object.entries(groupedRules).map(
                    ([category, categoryRules], i) => {
                      const lastEdited = [...categoryRules].sort(
                        (a, b) =>
                          new Date(b.updated_at ?? "").getTime() -
                          new Date(a.updated_at ?? "").getTime(),
                      )[0];
                      const severeCnt = categoryRules.filter(
                        (r) => r.severity === "severe",
                      ).length;
                      const warnCnt = categoryRules.filter(
                        (r) => r.severity === "warning",
                      ).length;
                      return (
                        <motion.div
                          key={category}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setSelectedRuleCategory(category)}
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 16,
                            padding: "28px 24px",
                            cursor: "pointer",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s",
                          }}
                          whileHover={{
                            scale: 1.02,
                            borderColor: "rgba(212,175,55,0.3)",
                          }}
                        >
                          {/* Gold accent top bar */}
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              height: 3,
                              background:
                                "linear-gradient(90deg, #d4af37, transparent)",
                            }}
                          />

                          {/* Book icon */}
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              background: "rgba(212,175,55,0.1)",
                              border: "1px solid rgba(212,175,55,0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 20,
                              marginBottom: 16,
                            }}
                          >
                            📖
                          </div>

                          <h3
                            style={{
                              fontSize: 17,
                              fontWeight: 700,
                              color: "#fff",
                              marginBottom: 8,
                              fontFamily: "Cinzel, serif",
                              lineHeight: 1.3,
                            }}
                          >
                            {category}
                          </h3>

                          <p
                            style={{
                              fontSize: 12,
                              color: "#666",
                              marginBottom: 16,
                            }}
                          >
                            {categoryRules.length}{" "}
                            {categoryRules.length === 1 ? "regulă" : "reguli"}
                          </p>

                          {/* Severity pills */}
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              marginBottom: 18,
                            }}
                          >
                            {severeCnt > 0 && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "3px 8px",
                                  borderRadius: 20,
                                  background: "rgba(239,68,68,0.12)",
                                  color: "#ef4444",
                                  border: "1px solid rgba(239,68,68,0.2)",
                                }}
                              >
                                🔴 {severeCnt} sever{severeCnt > 1 ? "e" : ""}
                              </span>
                            )}
                            {warnCnt > 0 && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "3px 8px",
                                  borderRadius: 20,
                                  background: "rgba(245,158,11,0.12)",
                                  color: "#f59e0b",
                                  border: "1px solid rgba(245,158,11,0.2)",
                                }}
                              >
                                ⚠️ {warnCnt} avert.
                              </span>
                            )}
                          </div>

                          {/* Footer */}
                          <div
                            style={{
                              borderTop: "1px solid rgba(255,255,255,0.06)",
                              paddingTop: 12,
                              fontSize: 11,
                              color: "#555",
                            }}
                          >
                            <div>✏️ {lastEdited?.created_by}</div>
                            <div style={{ marginTop: 3 }}>
                              {lastEdited?.updated_at
                                ? new Date(
                                    lastEdited.updated_at,
                                  ).toLocaleDateString("ro-RO", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </div>
                          </div>

                          {/* Admin actions on card */}
                          {isAdmin && (
                            <div
                              style={{
                                position: "absolute",
                                top: 12,
                                right: 12,
                                display: "flex",
                                gap: 6,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setRenamingCategory(category);
                                  setRenameCategoryValue(category);
                                }}
                                style={{
                                  background: "rgba(212,175,55,0.1)",
                                  border: "1px solid rgba(212,175,55,0.2)",
                                  color: "#d4af37",
                                  borderRadius: 6,
                                  width: 28,
                                  height: 28,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title="Redenumește categoria"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category)}
                                style={{
                                  background: "rgba(239,68,68,0.1)",
                                  border: "1px solid rgba(239,68,68,0.2)",
                                  color: "#ef4444",
                                  borderRadius: 6,
                                  width: 28,
                                  height: 28,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title="Șterge categoria"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}

                          {/* Arrow */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 20,
                              right: 20,
                              color: "#d4af37",
                              opacity: 0.5,
                              fontSize: 18,
                            }}
                          >
                            →
                          </div>
                        </motion.div>
                      );
                    },
                  )}
                </div>

                <AnimatePresence>
                  {showCreateRule && (
                    <CreateRuleModal
                      onClose={() => setShowCreateRule(false)}
                      onCreated={(_newRules) => {
                        apiFetch("/rules")
                          .then((d) => setRules(d.rules ?? []))
                          .catch(() => {});
                      }}
                      username={user.username}
                    />
                  )}
                  {renamingCategory && (
                    <motion.div
                      className="dash-modal-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setRenamingCategory(null)}
                    >
                      <motion.div
                        className="dash-modal"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="dash-modal-header">
                          <span className="dash-modal-title">
                            <Pencil size={16} />
                            Redenumește Categoria
                          </span>
                          <button
                            className="dash-rule-btn"
                            onClick={() => setRenamingCategory(null)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="dash-modal-body">
                          <label className="dash-label">Nume nou</label>
                          <input
                            className="dash-input"
                            value={renameCategoryValue}
                            onChange={(e) =>
                              setRenameCategoryValue(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleRenameCategory(
                                  renamingCategory,
                                  renameCategoryValue,
                                );
                            }}
                            autoFocus
                          />
                          <p
                            style={{
                              fontSize: 11,
                              color: "#555",
                              marginTop: 8,
                            }}
                          >
                            Toate regulile din "{renamingCategory}" vor fi
                            mutate în categoria nouă.
                          </p>
                        </div>
                        <div className="dash-modal-footer">
                          <button
                            className="dash-btn-secondary"
                            onClick={() => setRenamingCategory(null)}
                          >
                            Anulează
                          </button>
                          <button
                            className="dash-btn-primary"
                            onClick={() =>
                              handleRenameCategory(
                                renamingCategory,
                                renameCategoryValue,
                              )
                            }
                          >
                            Salvează
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeSection === "rules" && selectedRuleCategory && (
              <motion.div
                key={"rules-detail-" + selectedRuleCategory}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Header with breadcrumb */}
                <div className="dash-page-header">
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <button
                        onClick={() => setSelectedRuleCategory(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#d4af37",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        ← Regulament
                      </button>
                      <span style={{ color: "#444", fontSize: 13 }}>/</span>
                      <span
                        style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}
                      >
                        {selectedRuleCategory}
                      </span>
                    </div>
                    <h1 className="dash-page-title">{selectedRuleCategory}</h1>
                    <p className="dash-page-sub">
                      {selectedCategoryRules.length} reguli
                    </p>
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        className="dash-btn-secondary"
                        onClick={() => setSelectedRuleCategory(null)}
                      >
                        ← Înapoi
                      </button>
                      <button
                        className="dash-btn-primary"
                        onClick={() => setShowCreateRule(true)}
                      >
                        <Plus size={16} />
                        Regulă Nouă
                      </button>
                    </div>
                  )}
                  {!isAdmin && (
                    <button
                      className="dash-btn-secondary"
                      onClick={() => setSelectedRuleCategory(null)}
                    >
                      ← Înapoi
                    </button>
                  )}
                </div>

                {/* Rules list — always visible, no click needed */}
                <div className="dash-card" style={{ padding: "28px 32px" }}>
                  {/* Category title */}
                  <h2
                    style={{
                      fontSize: 19,
                      fontWeight: 800,
                      color: "#4ade80",
                      fontFamily: "Cinzel, serif",
                      marginBottom: 20,
                      borderBottom: "1px solid rgba(74,222,128,0.12)",
                      paddingBottom: 14,
                    }}
                  >
                    I. {selectedRuleCategory}:
                  </h2>

                  {selectedCategoryRules.map((rule, idx) => {
                    const sevPenaltyColor: Record<string, string> = {
                      severe: "#ef4444",
                      warning: "#f59e0b",
                      info: "#60a5fa",
                    };
                    const penaltyColor =
                      sevPenaltyColor[rule.severity] ?? "#ef4444";

                    // Extract [...PENALTY] from end of content
                    const penaltyMatch = rule.content.match(/(\[[^\]]+\])\s*$/);
                    const description = penaltyMatch
                      ? rule.content
                          .slice(0, rule.content.lastIndexOf(penaltyMatch[0]))
                          .trim()
                      : rule.content !== rule.title
                        ? rule.content
                        : "";
                    const penalty = penaltyMatch ? penaltyMatch[1] : null;

                    return (
                      <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        style={{
                          marginBottom:
                            idx < selectedCategoryRules.length - 1 ? 22 : 0,
                          paddingBottom:
                            idx < selectedCategoryRules.length - 1 ? 22 : 0,
                          borderBottom:
                            idx < selectedCategoryRules.length - 1
                              ? "1px solid rgba(255,255,255,0.05)"
                              : "none",
                        }}
                      >
                        {/* Main line: 《N》 Title [PENALTY] + admin btns */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              color: "#d4af37",
                              fontWeight: 800,
                              fontSize: 14,
                              flexShrink: 0,
                              fontFamily: "Cinzel, serif",
                              lineHeight: 1.7,
                            }}
                          >
                            《{idx + 1}》
                          </span>

                          <div style={{ flex: 1 }}>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "#e8e8e8",
                                lineHeight: 1.7,
                              }}
                            >
                              {rule.title}
                            </span>
                            {penalty && (
                              <span
                                style={{
                                  color: penaltyColor,
                                  fontWeight: 800,
                                  fontSize: 13,
                                  marginLeft: 10,
                                }}
                              >
                                {penalty}
                              </span>
                            )}

                            {/* Description shown directly below if exists */}
                            {description && (
                              <p
                                style={{
                                  margin: "6px 0 0 0",
                                  fontSize: 12.5,
                                  color: "#888",
                                  lineHeight: 1.75,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {description}
                              </p>
                            )}
                          </div>

                          {/* Admin actions */}
                          {isAdmin && (
                            <div
                              style={{
                                display: "flex",
                                gap: 5,
                                flexShrink: 0,
                                marginTop: 2,
                              }}
                            >
                              <button
                                className="dash-rule-btn"
                                onClick={() => setEditingRule(rule)}
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                className="dash-rule-btn danger"
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {showCreateRule && (
                    <CreateRuleModal
                      onClose={() => setShowCreateRule(false)}
                      onCreated={(_newRules) => {
                        apiFetch("/rules")
                          .then((d) => setRules(d.rules ?? []))
                          .catch(() => {});
                      }}
                      username={user.username}
                      defaultCategory={selectedRuleCategory ?? undefined}
                    />
                  )}
                  {editingRule && (
                    <motion.div
                      className="dash-modal-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setEditingRule(null)}
                    >
                      <motion.div
                        className="dash-modal"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="dash-modal-header">
                          <span className="dash-modal-title">
                            <Pencil size={16} />
                            Editează Regula
                          </span>
                          <button
                            className="dash-rule-btn"
                            onClick={() => setEditingRule(null)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="dash-modal-body">
                          <label className="dash-label">Titlu</label>
                          <input
                            className="dash-input"
                            value={editingRule.title}
                            onChange={(e) =>
                              setEditingRule({
                                ...editingRule,
                                title: e.target.value,
                              })
                            }
                            style={{ marginBottom: 12 }}
                          />
                          <label className="dash-label">Conținut</label>
                          <textarea
                            className="dash-input dash-textarea"
                            value={editingRule.content}
                            onChange={(e) =>
                              setEditingRule({
                                ...editingRule,
                                content: e.target.value,
                              })
                            }
                            style={{ marginBottom: 12 }}
                          />
                          <label className="dash-label">Severitate</label>
                          <select
                            className="dash-input"
                            value={editingRule.severity}
                            onChange={(e) =>
                              setEditingRule({
                                ...editingRule,
                                severity: e.target.value as Rule["severity"],
                              })
                            }
                          >
                            <option value="info">Informativ</option>
                            <option value="warning">Avertisment</option>
                            <option value="severe">Sever</option>
                          </select>
                        </div>
                        <div className="dash-modal-footer">
                          <button
                            className="dash-btn-secondary"
                            onClick={() => setEditingRule(null)}
                          >
                            Anulează
                          </button>
                          <button
                            className="dash-btn-primary"
                            onClick={handleSaveRule}
                          >
                            Salvează
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ====== ANNOUNCEMENTS ====== */}
            {activeSection === "announcements" && (
              <motion.div key="announcements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="dash-page-header">
                  <div>
                    <h1 className="dash-page-title">Anunțuri</h1>
                    <p className="dash-page-sub">{announcements.length} anunțuri publicate</p>
                  </div>
                  {isAdmin && (
                    <button className="dash-btn-primary" onClick={() => setShowCreateAnn(true)}>
                      <Plus size={16} />Anunț Nou
                    </button>
                  )}
                </div>

                {announcements.length === 0 && !loading && (
                  <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>Nu există anunțuri.</div>
                )}

                {/* Grid cards like Ratonii */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                  {announcements.map((ann, i) => (
                    <motion.div key={ann.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedAnn(ann)}
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s, transform 0.15s" }}
                      whileHover={{ scale: 1.015, borderColor: "rgba(212,175,55,0.3)" }}
                    >
                      {/* Cover image */}
                      {ann.image_url ? (
                        <div style={{ width: "100%", height: 180, overflow: "hidden", position: "relative" }}>
                          <img src={ann.image_url} alt={ann.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Eye size={14} color="#fff" />
                          </div>
                          {ann.pinned && <span style={{ position: "absolute", top: 10, left: 10, background: "#d4af37", color: "#000", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>📌 FIXAT</span>}
                        </div>
                      ) : (
                        <div style={{ width: "100%", height: 120, background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                          <Megaphone size={40} style={{ opacity: 0.15, color: "#d4af37" }} />
                          {ann.pinned && <span style={{ position: "absolute", top: 10, left: 10, background: "#d4af37", color: "#000", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>📌 FIXAT</span>}
                        </div>
                      )}

                      {/* Card body */}
                      <div style={{ padding: "16px 18px 14px" }}>
                        {/* Category badge */}
                        {(() => {
                          const secs = typeof ann.sections === "string" ? JSON.parse(ann.sections || "[]") : (ann.sections ?? []);
                          return secs.length > 0 && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                              {(secs as AnnouncementSection[]).slice(0, 3).map((s: AnnouncementSection, si: number) => (
                                <span key={si} style={{ fontSize: 10, fontWeight: 700, color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}30`, borderRadius: 5, padding: "2px 7px", letterSpacing: "0.05em" }}>{s.title}</span>
                              ))}
                            </div>
                          );
                        })()}

                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e8e8e8", marginBottom: 6, lineHeight: 1.4 }}>{ann.title}</h3>
                        <p style={{ fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ann.content}</p>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #d4af37, #b8962e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#000" }}>
                              {ann.author_username?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#ccc" }}>{ann.author_username}</div>
                              <div style={{ fontSize: 10, color: "#555" }}>{timeAgo(ann.created_at)}</div>
                            </div>
                          </div>
                          {isAdmin && (
                            <div style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setEditingAnn(ann)}
                                style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                <Pencil size={10} />
                              </button>
                              <button onClick={() => handleDeleteAnn(ann.id)}
                                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                <Trash2 size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <AnimatePresence>
                  {editingAnn && (
                    <EditAnnouncementModal
                      ann={editingAnn}
                      onClose={() => setEditingAnn(null)}
                      onSaved={(updated) => handleUpdateAnn(editingAnn.id, updated)}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showCreateAnn && (
                    <CreateAnnouncementModal
                      onClose={() => setShowCreateAnn(false)}
                      onCreated={(ann) => setAnnouncements((p) => [ann, ...p])}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ====== SESSIONS ====== */}
            {activeSection === "sessions" && isAdmin && (
              <motion.div
                key="sessions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="dash-page-header">
                  <div>
                    <h1 className="dash-page-title">Sesiuni Active</h1>
                    <p className="dash-page-sub">
                      {liveStats.players_online ?? sessions.length} jucători
                      online
                    </p>
                  </div>
                  <div className="dash-live-indicator">
                    <span className="dash-live-dot" />
                    LIVE — {liveStats.players_online ?? sessions.length} online
                  </div>
                </div>
                <div className="dash-card">
                  {sessions.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center" }}>
                      <Server
                        size={48}
                        style={{ opacity: 0.3, marginBottom: 16 }}
                      />
                      <p style={{ opacity: 0.5 }}>
                        Sesiunile vor apărea automat când plugin-ul se
                        conectează.
                      </p>
                    </div>
                  ) : (
                    <div className="dash-table-wrapper">
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Jucător</th>
                            <th>IP</th>
                            <th>Conectat</th>
                            <th>World</th>
                            <th>Ping</th>
                            <th>Acțiuni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map((session, i) => (
                            <motion.tr
                              key={session.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              <td>
                                <div className="dash-player-info">
                                  <span className="dash-player-dot" />
                                  {session.player}
                                </div>
                              </td>
                              <td className="dash-table-ip">{session.ip}</td>
                              <td>{session.joined}</td>
                              <td>
                                <span className="dash-world-badge">
                                  <Hash size={10} />
                                  {session.world}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`dash-ping ${session.ping < 50 ? "ping-good" : session.ping < 100 ? "ping-ok" : "ping-bad"}`}
                                >
                                  {session.ping}ms
                                </span>
                              </td>
                              <td>
                                <div className="dash-action-btns">
                                  <button className="dash-btn-kick">
                                    Kick
                                  </button>
                                  <button className="dash-btn-ban">Ban</button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ====== SETTINGS ====== */}
            {activeSection === "settings" && isAdmin && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="dash-page-header">
                  <h1 className="dash-page-title">Setări</h1>
                </div>
                <div
                  className="dash-card"
                  style={{ padding: "40px", textAlign: "center" }}
                >
                  <Settings
                    size={48}
                    style={{ opacity: 0.3, marginBottom: 16 }}
                  />
                  <p style={{ opacity: 0.5 }}>
                    Setările vor fi disponibile în curând.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      {/* Global Announcement Detail Modal */}
      <AnimatePresence>
        {selectedAnn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(6px)" }}
            onClick={() => setSelectedAnn(null)}
          >
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, maxWidth: 700, width: "100%", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
            >
              {selectedAnn.image_url && (
                <div style={{ width: "100%", height: 260, overflow: "hidden", borderRadius: "18px 18px 0 0" }}>
                  <img src={selectedAnn.image_url} alt={selectedAnn.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ padding: "28px 32px 32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    {selectedAnn.pinned && <span style={{ background: "#d4af37", color: "#000", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, marginBottom: 10, display: "inline-block" }}>📌 FIXAT</span>}
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1.3, marginTop: selectedAnn.pinned ? 6 : 0 }}>{selectedAnn.title}</h2>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #d4af37, #b8962e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000" }}>
                        {selectedAnn.author_username?.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, color: "#888" }}>Creat de <strong style={{ color: "#ccc" }}>{selectedAnn.author_username}</strong> · {timeAgo(selectedAnn.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {isAdmin && (
                      <>
                        <button onClick={() => { setEditingAnn(selectedAnn); setSelectedAnn(null); }}
                          style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                          <Pencil size={12} /> Editează
                        </button>
                        <button onClick={() => handleDeleteAnn(selectedAnn.id)}
                          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                          <Trash2 size={12} /> Șterge
                        </button>
                      </>
                    )}
                    <button onClick={() => setSelectedAnn(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#fff", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: "#aaa", lineHeight: 1.8, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 24 }}>{selectedAnn.content}</p>
                {(() => {
                  const secs: AnnouncementSection[] = typeof selectedAnn.sections === "string"
                    ? JSON.parse(selectedAnn.sections || "[]")
                    : (selectedAnn.sections ?? []);
                  return secs.map((sec, si) => (
                    <div key={si} style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 800, color: sec.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>{sec.title}</h3>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {sec.items.filter(it => it.trim()).map((item, ii) => (
                          <li key={ii} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8, fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>
                            <span style={{ color: sec.color, fontWeight: 700, marginTop: 1 }}>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
};

export default Dashboard;
