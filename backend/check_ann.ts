import { dbGet, initializeSchema } from './src/models/database';

async function main() {
  await initializeSchema();
  const r = await dbGet<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type='table' AND name='announcements'");
  console.log('=== SCHEMA ANNOUNCEMENTS ===');
  console.log(r?.sql);
}
main().catch(console.error);
