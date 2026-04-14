// ===== src/models/database.ts =====
import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const DB_PATH = process.env.DB_PATH || "./netheris.db";
const dbPath = path.resolve(DB_PATH);

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    console.log("✅ Connected to SQLite database");
  }
  return db;
}

export function initializeSchema(): void {
  migrateTicketsTable();

  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('admin','moderator','helper','player')),
      email TEXT UNIQUE,
      discord_id TEXT UNIQUE,
      avatar TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS staff_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      online_minecraft INTEGER NOT NULL DEFAULT 0,
      online_panel INTEGER NOT NULL DEFAULT 0,
      last_seen TEXT NOT NULL DEFAULT (datetime('now')),
      current_world TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS minecraft_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL COLLATE NOCASE,
      online INTEGER NOT NULL DEFAULT 0,
      ip TEXT,
      world TEXT,
      ping INTEGER,
      joined_at TEXT,
      last_seen TEXT NOT NULL DEFAULT (datetime('now')),
      total_playtime INTEGER NOT NULL DEFAULT 0,
      is_banned INTEGER NOT NULL DEFAULT 0,
      is_muted INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS server_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      players_online INTEGER NOT NULL DEFAULT 0,
      players_max INTEGER NOT NULL DEFAULT 500,
      tps REAL NOT NULL DEFAULT 20.0,
      ram_used INTEGER NOT NULL DEFAULT 0,
      ram_max INTEGER NOT NULL DEFAULT 4096,
      uptime INTEGER NOT NULL DEFAULT 0,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS moderation_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('ban','mute','kick','warn','unban','unmute')),
      target_username TEXT NOT NULL,
      target_uuid TEXT,
      performed_by TEXT NOT NULL,
      performed_by_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      duration TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (performed_by_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'support',
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in-progress','closed')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
      created_by TEXT NOT NULL,
      created_by_id INTEGER NOT NULL,
      assigned_to TEXT,
      assigned_to_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT,
      FOREIGN KEY (created_by_id) REFERENCES users(id),
      FOREIGN KEY (assigned_to_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS ticket_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      author_role TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_index INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'General',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning' CHECK(severity IN ('info','warning','severe')),
      created_by TEXT NOT NULL,
      created_by_id INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (created_by_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      sections TEXT,
      author TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`,
    `CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mod_actions_type ON moderation_actions(type)`,
    `CREATE INDEX IF NOT EXISTS idx_mod_actions_target ON moderation_actions(target_username)`,
    `CREATE INDEX IF NOT EXISTS idx_mc_players_online ON minecraft_players(online)`,
    `CREATE INDEX IF NOT EXISTS idx_server_stats_time ON server_stats(recorded_at)`,
    `CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(active, order_index)`,
  ];

  const db = getDb();
  for (const query of queries) {
    try {
      db.prepare(query).run();
    } catch (err: any) {
      if (!err.message?.includes("duplicate column")) throw err;
    }
  }

  console.log("✅ Database schema initialized");
}

function migrateTicketsTable(): void {
  const db = getDb();
  try {
    db.prepare("DROP TABLE IF EXISTS tickets_backup").run();
    db.prepare("DROP TABLE IF EXISTS tickets_old").run();
    db.prepare("DROP TABLE IF EXISTS tickets_backup2").run();

    const tableInfo = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='tickets'",
      )
      .get() as { sql: string } | undefined;

    if (!tableInfo?.sql) return;

    const hasOldConstraint =
      tableInfo.sql.includes("'appeal'") ||
      tableInfo.sql.includes("'donation'");
    if (!hasOldConstraint) return;

    console.log("🔄 Migrare tickets: eliminare CHECK constraint restrictiv...");

    db.pragma("foreign_keys = OFF");

    const migrate = db.transaction(() => {
      db.prepare("ALTER TABLE tickets RENAME TO tickets_old").run();
      db.prepare(
        `CREATE TABLE tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'support',
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in-progress','closed')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
        created_by TEXT NOT NULL,
        created_by_id INTEGER NOT NULL,
        assigned_to TEXT,
        assigned_to_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        closed_at TEXT,
        FOREIGN KEY (created_by_id) REFERENCES users(id),
        FOREIGN KEY (assigned_to_id) REFERENCES users(id)
      )`,
      ).run();
      db.prepare(
        `INSERT INTO tickets
        (id, title, content, category, status, priority, created_by, created_by_id,
         assigned_to, assigned_to_id, created_at, updated_at, closed_at)
        SELECT id, title, content,
          CASE category
            WHEN 'appeal' THEN 'unban'
            WHEN 'donation' THEN 'support'
            WHEN 'bug' THEN 'support'
            ELSE category
          END,
          status, priority, created_by, created_by_id,
          assigned_to, assigned_to_id, created_at, updated_at, closed_at
        FROM tickets_old`,
      ).run();
      db.prepare("DROP TABLE tickets_old").run();
    });

    migrate();
    db.pragma("foreign_keys = ON");
    console.log("✅ Migrare tickets finalizata");
  } catch (err) {
    db.pragma("foreign_keys = ON");
    console.error("❌ Eroare migrare tickets:", err);
  }
}

export default getDb;
