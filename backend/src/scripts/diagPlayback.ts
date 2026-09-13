import { getAdapter } from '../db/adapter.js';

async function diagnose() {
  const db = getAdapter();
  const { rows: contentRows } = await db.query('SELECT id, type, title, video_url, trailer_url FROM content LIMIT 15');
  console.log('Sample content video_url and trailer_url:');
  for (const c of contentRows) {
    console.log(`- [${c.type}] ${c.title} (${c.id})`);
    console.log(`    video_url:   ${c.video_url}`);
    console.log(`    trailer_url: ${c.trailer_url}`);
  }

  const { rows: mediaRows } = await db.query('SELECT content_id, episode_id, media_type, source_type, url, is_active FROM media LIMIT 15');
  console.log('\nSample media rows:');
  for (const m of mediaRows) {
    console.log(`- media: content=${m.content_id}, ep=${m.episode_id}, type=${m.media_type}, src=${m.source_type}, active=${m.is_active}`);
    console.log(`    url: ${m.url}`);
  }

  const { rows: epRows } = await db.query('SELECT id, title, video_url FROM episodes LIMIT 10');
  console.log('\nSample episodes:');
  for (const ep of epRows) {
    console.log(`- [EP] ${ep.title} (${ep.id})`);
    console.log(`    video_url: ${ep.video_url}`);
  }

  await db.close();
}

diagnose().catch(console.error);
