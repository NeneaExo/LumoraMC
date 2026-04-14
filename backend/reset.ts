import sqlite3 from 'sqlite3';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const DB_PATH = process.env.DB_PATH || './netheris.db';
const dbPath = path.resolve(DB_PATH);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('DB error:', err); process.exit(1); }
  console.log('✅ Connected');
});

function run(sql: string): Promise<void> {
  return new Promise((res, rej) => db.run(sql, (err) => err ? rej(err) : res()));
}

function all<T>(sql: string): Promise<T[]> {
  return new Promise((res, rej) => db.all(sql, (err, rows) => err ? rej(err) : res(rows as T[])));
}

async function main() {
  // Curata tabele backup ramase din migratii vechi
  const tables = await all<{name: string}>(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%backup%' OR name LIKE '%old%'`);
  for (const t of tables) {
    await run(`DROP TABLE IF EXISTS "${t.name}"`);
    console.log(`🗑️ Sters tabel vechi: ${t.name}`);
  }

  await run('DELETE FROM moderation_actions'); console.log('✅ Acțiuni moderare șterse');
  await run('DELETE FROM ticket_replies');     console.log('✅ Reply-uri șterse');
  await run('DELETE FROM tickets');            console.log('✅ Tichete șterse');
  await run('DELETE FROM announcements');      console.log('✅ Anunțuri șterse');
  await run('DELETE FROM rules');              console.log('✅ Reguli șterse');
  await run('DELETE FROM staff_status');       console.log('✅ Staff status resetat');
  await run(`DELETE FROM users WHERE username NOT IN ('NeneaExo', 'Player123')`);
  console.log('✅ Utilizatori șterși');

  const users = await all<{username: string; role: string}>('SELECT username, role FROM users');
  console.log('\n👥 Utilizatori rămași:');
  users.forEach((u: any) => console.log(`  - ${u.username} (${u.role})`));

  console.log('\n✅ Reset complet!');
  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
