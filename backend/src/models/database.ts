// ===== src/models/database.ts =====
import sqlite3 from "sqlite3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const DB_PATH = process.env.DB_PATH || "./netheris.db";
const dbPath = path.resolve(DB_PATH);

sqlite3.verbose();

let db: sqlite3.Database;

export function getDb(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("❌ DB connection error:", err);
      } else {
        console.log("✅ Connected to SQLite database");
        db.run("PRAGMA journal_mode = WAL");
        db.run("PRAGMA foreign_keys = ON");
      }
    });
  }
  return db;
}

export function dbRun(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function dbAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export async function initializeSchema(): Promise<void> {
  // ===== MIGRARE FIRST: reconstruieste tickets inainte de orice altceva =====
  await migrateTicketsTable();

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
    // ⚠️ tickets — fără CHECK constraint pe category ca să fie flexibil
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
    `ALTER TABLE announcements ADD COLUMN image_url TEXT`,
    `ALTER TABLE announcements ADD COLUMN sections TEXT`,
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

  for (const query of queries) {
    try {
      await dbRun(query);
    } catch (err: any) {
      // Ignore "duplicate column" errors from ALTER TABLE
      if (!err.message?.includes("duplicate column")) throw err;
    }
  }

  console.log("✅ Database schema initialized");
}

// SQLite nu suporta ALTER TABLE DROP CONSTRAINT, deci recreem tabela
async function migrateTicketsTable(): Promise<void> {
  try {
    // Curata orice tabele backup ramase din migratii esuate
    await dbRun("DROP TABLE IF EXISTS tickets_backup").catch(() => {});
    await dbRun("DROP TABLE IF EXISTS tickets_old").catch(() => {});
    await dbRun("DROP TABLE IF EXISTS tickets_backup2").catch(() => {});

    // Verifica daca tabela are constraint-ul vechi (contine 'appeal' sau 'donation' in schema)
    const tableInfo = await dbGet<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='tickets'"
    );

    if (!tableInfo?.sql) return;

    // Daca schema contine 'appeal' sau 'donation' = constraint vechi, trebuie migrat
    const hasOldConstraint = tableInfo.sql.includes("'appeal'") || tableInfo.sql.includes("'donation'");
    if (!hasOldConstraint) return; // deja migrat sau schema noua

    console.log("🔄 Migrare tickets: eliminare CHECK constraint restrictiv...");

    await dbRun("PRAGMA foreign_keys = OFF");
    await dbRun("BEGIN TRANSACTION");

    // 1. Redenumeste tabela veche
    await dbRun("ALTER TABLE tickets RENAME TO tickets_old");

    // 2. Creeaza tabela noua fara CHECK pe category
    await dbRun(`CREATE TABLE tickets (
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
    )`);

    // 3. Copiaza datele, mapeaza categoriile vechi la cele noi
    await dbRun(`INSERT INTO tickets 
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
      FROM tickets_old`);

    // 4. Sterge tabela veche
    await dbRun("DROP TABLE tickets_old");

    await dbRun("COMMIT");
    await dbRun("PRAGMA foreign_keys = ON");

    console.log("✅ Migrare tickets finalizata");
  } catch (err) {
    await dbRun("ROLLBACK").catch(() => {});
    await dbRun("PRAGMA foreign_keys = ON").catch(() => {});
    console.error("❌ Eroare migrare tickets:", err);
  }
}

export default getDb;
