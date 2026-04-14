import { dbGet, dbRun } from './src/models/database';

async function main() {
  // Arata schema curenta a tabelei tickets
  const schema = await dbGet<{ sql: string }>(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='tickets'`
  );
  console.log('=== SCHEMA CURENTA ===');
  console.log(schema?.sql ?? 'TABELA NU EXISTA');

  // Fix direct: recreaza tabela fara CHECK constraint
  console.log('\n=== APLICARE FIX ===');
  await dbRun('PRAGMA foreign_keys = OFF');
  
  await dbRun('ALTER TABLE tickets RENAME TO tickets_backup');
  console.log('✅ Redenumit tickets -> tickets_backup');

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
  console.log('✅ Tabela noua creata');

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
    FROM tickets_backup`);
  console.log('✅ Date copiate');

  await dbRun('DROP TABLE tickets_backup');
  console.log('✅ Backup sters');

  await dbRun('PRAGMA foreign_keys = ON');

  // Verifica schema noua
  const newSchema = await dbGet<{ sql: string }>(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='tickets'`
  );
  console.log('\n=== SCHEMA NOUA ===');
  console.log(newSchema?.sql);
  console.log('\n✅ DONE - Reporneste backend-ul cu npm run dev');
}

main().catch(console.error);
