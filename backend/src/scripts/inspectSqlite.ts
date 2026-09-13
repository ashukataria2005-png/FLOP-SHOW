import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve('backend/data/flopshow.db');
const db = new DatabaseSync(dbPath);

console.log('=== INSPECTING LOCAL SQLITE DATABASE (backend/data/flopshow.db) ===');

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").all();
  console.log('Tables:', tables.map((t: any) => t.name));

  const contentCount = (db.prepare('SELECT COUNT(*) as c FROM content;').get() as any)?.c;
  console.log(`Content count: ${contentCount}`);

  const contentRows = db.prepare('SELECT id, type, title, slug, price, featured, video_url, trailer_url FROM content;').all();
  console.log('Content rows:');
  console.log(contentRows);

  const seasonsCount = (db.prepare('SELECT COUNT(*) as c FROM seasons;').get() as any)?.c;
  console.log(`Seasons count: ${seasonsCount}`);

  const episodesCount = (db.prepare('SELECT COUNT(*) as c FROM episodes;').get() as any)?.c;
  console.log(`Episodes count: ${episodesCount}`);

  const episodes = db.prepare('SELECT id, season_id, episode_number, title, video_url FROM episodes;').all();
  console.log('Episodes:');
  console.log(episodes);

  const media = db.prepare('SELECT * FROM media;').all();
  console.log(`Media count: ${media.length}`);
  console.log(media);

} catch (err) {
  console.error('Error inspecting sqlite:', err);
}

db.close();
