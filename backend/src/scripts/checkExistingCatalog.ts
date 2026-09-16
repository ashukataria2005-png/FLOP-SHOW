import { getAdapter } from '../db/adapter.js';

async function main() {
  const db = getAdapter();
  const { rows } = await db.query(
    'SELECT id, title, type, release_year, status FROM content ORDER BY created_at DESC;'
  );
  console.log(`Total existing content in DB: ${rows.length}`);
  for (const item of rows as any[]) {
    console.log(`- [${item.type}] "${item.title}" (${item.release_year}) [ID: ${item.id}]`);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to list catalog:', err);
  process.exit(1);
});
