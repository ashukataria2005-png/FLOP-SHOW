import { getAdapter } from '../db/adapter.js';

async function checkLabels() {
  const db = getAdapter();
  const { rows } = await db.query(
    'SELECT category_label, type, count(*) as cnt FROM content GROUP BY category_label, type ORDER BY type, cnt DESC;'
  );
  console.log('Category label breakdown:');
  console.log(rows);
  process.exit(0);
}

checkLabels().catch(err => {
  console.error(err);
  process.exit(1);
});
