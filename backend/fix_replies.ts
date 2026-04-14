import { dbRun, dbAll } from "./src/models/database";

async function main() {
  try {
    console.log("🔧 Fixing ticket_replies foreign key...");

    // 1. Disable foreign keys temporarily
    await dbRun("PRAGMA foreign_keys = OFF");

    // 2. Create new table with correct FK -> tickets
    await dbRun(`CREATE TABLE IF NOT EXISTS ticket_replies_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      author_role TEXT NOT NULL DEFAULT 'player',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )`);
    console.log("✅ New table created");

    // 3. Copy existing data
    await dbRun(`INSERT OR IGNORE INTO ticket_replies_new 
      SELECT id, ticket_id, content, author, author_id, author_role, created_at 
      FROM ticket_replies`);
    console.log("✅ Data copied");

    // 4. Drop old table and rename
    await dbRun("DROP TABLE ticket_replies");
    await dbRun("ALTER TABLE ticket_replies_new RENAME TO ticket_replies");
    console.log("✅ Table replaced");

    // 5. Re-enable foreign keys
    await dbRun("PRAGMA foreign_keys = ON");

    // 6. Verify
    const schema = await dbAll<any>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='ticket_replies'",
    );
    console.log("\n=== NEW SCHEMA ===");
    console.log(schema[0]?.sql);

    // 7. Test insert
    await dbRun(
      `INSERT INTO ticket_replies (ticket_id, content, author, author_id, author_role) VALUES (?, ?, ?, ?, ?)`,
      [9999, "test", "testuser", 1, "player"],
    );
    await dbRun("DELETE FROM ticket_replies WHERE ticket_id = 9999");
    console.log("\n✅ Test insert OK — fix complet!");
  } catch (err) {
    console.error("❌ Error:", err);
  }
  process.exit(0);
}

main();
