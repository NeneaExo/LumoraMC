import { dbAll, dbRun } from "./src/models/database";

async function main() {
  try {
    // Check current schema
    const schema = await dbAll<any>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='ticket_replies'",
    );
    console.log("=== SCHEMA ticket_replies ===");
    console.log(schema[0]?.sql ?? "TABLE NOT FOUND");

    // Try adding author_role column
    console.log("\n=== Trying ALTER TABLE ===");
    try {
      await dbRun(
        "ALTER TABLE ticket_replies ADD COLUMN author_role TEXT DEFAULT 'player'",
      );
      console.log("✅ Column author_role added successfully");
    } catch (e: any) {
      console.log("ℹ️ ALTER TABLE result:", e.message);
    }

    // Try a test insert to see what fails
    console.log("\n=== Testing insert ===");
    try {
      await dbRun(
        `INSERT INTO ticket_replies (ticket_id, content, author, author_id, author_role) VALUES (?, ?, ?, ?, ?)`,
        [9999, "test", "testuser", 1, "player"],
      );
      console.log("✅ Insert succeeded");
      await dbRun("DELETE FROM ticket_replies WHERE ticket_id = 9999");
    } catch (e: any) {
      console.log("❌ Insert failed:", e.message);
    }
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

main();
