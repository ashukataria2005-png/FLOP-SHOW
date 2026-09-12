import { getDatabase } from './connection.js';

// Complete dictionary of official artwork for all 34 titles in FLOPSHOW catalog
export const officialArtworkMap: Record<string, { poster: string; backdrop: string }> = {
  // 1. Breaking Bad
  'breaking-bad': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/501/1253519.jpg',
    backdrop: 'https://img.youtube.com/vi/HhesaQXLuRY/maxresdefault.jpg'
  },
  // 2. The 8 Show
  'the-8-show': {
    poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgzKpyMXh1Hj8GtQJBnGBoyZY_V2TuadqPD1kI6teqYLcX6h4bXk6mIgyh&s=10',
    backdrop: 'https://img.youtube.com/vi/d_5h3E5z4wM/hqdefault.jpg'
  },
  // 3. Money Heist
  'money-heist': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/430/1076004.jpg',
    backdrop: 'https://img.youtube.com/vi/_InqQJRqGW4/maxresdefault.jpg'
  },
  // 4. Dhurandhar (2025)
  'dhurandhar-2025': {
    poster: 'https://m.media-amazon.com/images/M/MV5BMzFiNTVkZjYtM2I3Yi00MGNjLWEyYTAtMGViNGExZmMzMGMzXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/FjU_x1106e8/hqdefault.jpg'
  },
  // 5. Inception (2010)
  'inception-2010': {
    poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/YoHD9XEInc0/maxresdefault.jpg'
  },
  // 6. Tumbbad (2018)
  'tumbbad-2018': {
    poster: 'https://m.media-amazon.com/images/M/MV5BOTY0YzY3MTMtOWQ5Yi00ODY2LThhOGMtMzFlMjhlODcxOGU1XkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/sN75MPxgvX8/hqdefault.jpg'
  },
  // 7. Gangs of Wasseypur (2012)
  'gangs-of-wasseypur-2012': {
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQyMmJkYTItNDUyYS00MjgwLWFmYjUtOWQ1NmRjOGZlOTZhXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/j-AkWDkXcZU/hqdefault.jpg'
  },
  // 8. 3 Idiots (2009)
  '3-idiots-2009': {
    poster: 'https://m.media-amazon.com/images/M/MV5BNzc4ZWQ3NmYtODE0Ny00YTQ4LTlkZWItNTBkMGQ0MmUwMmJlXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/K0eDlFX9GMc/maxresdefault.jpg'
  },
  // 9. Drishyam (2015)
  'drishyam-2015': {
    poster: 'https://m.media-amazon.com/images/M/MV5BYjMzZTU0NzUtZGQ0MC00Y2M4LWI5ZDUtZjY1YmNjMjNmNmI3XkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/AuuX2j14NBg/hqdefault.jpg'
  },
  // 10. RRR (2022)
  'rrr-2022': {
    poster: 'https://m.media-amazon.com/images/M/MV5BNWMwODYyMjQtMTczMi00NTQ1LWFkYjItMGJhMWRkY2E3NDAyXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/NgBoMJy386M/maxresdefault.jpg'
  },
  // 11. Sacred Games
  'sacred-games': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/204/511629.jpg',
    backdrop: 'https://img.youtube.com/vi/28j8h0RRsf4/hqdefault.jpg'
  },
  // 12. Mirzapur
  'mirzapur': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/619/1549499.jpg',
    backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/176/441459.jpg'
  },
  // 13. The Family Man
  'the-family-man': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/599/1498893.jpg',
    backdrop: 'https://img.youtube.com/vi/NGf_B81Kr2g/hqdefault.jpg'
  },
  // 14. Paatal Lok
  'paatal-lok': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/254/635178.jpg',
    backdrop: 'https://img.youtube.com/vi/cNwkdZhuDvg/hqdefault.jpg'
  },
  // 15. Panchayat
  'panchayat': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/517/1293627.jpg',
    backdrop: 'https://img.youtube.com/vi/mojZJ7oeD_g/maxresdefault.jpg'
  },
  // 16. Interstellar (2014)
  'interstellar-2014': {
    poster: 'https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/zSWdZVtXT7E/maxresdefault.jpg'
  },
  // 17. The Dark Knight (2008)
  'the-dark-knight-2008': {
    poster: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/EXeTwQWrcwY/maxresdefault.jpg'
  },
  // 18. Oppenheimer (2023)
  'oppenheimer-2023': {
    poster: 'https://m.media-amazon.com/images/M/MV5BN2JkMDc5MGQtZjg3YS00NmFiLWIyZmQtZTJmNTM5MjVmYTQ4XkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/uYPbbksJxIg/maxresdefault.jpg'
  },
  // 19. Pulp Fiction (1994)
  'pulp-fiction-1994': {
    poster: 'https://m.media-amazon.com/images/M/MV5BYTViYTE3ZGQtNDBlMC00ZTAyLTkyODMtZGRiZDg0MjA2YThkXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/s7EdQ4FqbhY/maxresdefault.jpg'
  },
  // 20. The Matrix (1999)
  'the-matrix-1999': {
    poster: 'https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODE2ZTY0ODQyNDRhXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/vKQi3bBA1y8/maxresdefault.jpg'
  },
  // 21. Stranger Things
  'stranger-things': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/595/1489169.jpg',
    backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/70/175852.jpg'
  },
  // 22. Chernobyl (2019)
  'chernobyl': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/193/482599.jpg',
    backdrop: 'https://img.youtube.com/vi/s9APLXM9Ei8/maxresdefault.jpg'
  },
  // 23. Dark (2017)
  'dark': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/504/1262352.jpg',
    backdrop: 'https://img.youtube.com/vi/rrwycJ08PSA/maxresdefault.jpg'
  },
  // 24. Succession (2018)
  'succession': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/453/1134275.jpg',
    backdrop: 'https://img.youtube.com/vi/OzYxJV_rmE8/maxresdefault.jpg'
  },
  // 25. Parasite (2019)
  'parasite-2019': {
    poster: 'https://m.media-amazon.com/images/M/MV5BYjk1Y2U4MjQtY2ZiNS00OWQyLWI3MmYtZWUwNmRjYWRiNWNhXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/5xH0RzeSojI/hqdefault.jpg'
  },
  // 26. Severance (2022)
  'severance': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/548/1371406.jpg',
    backdrop: 'https://img.youtube.com/vi/xEQP4VVuyrY/maxresdefault.jpg'
  },
  // 27. City of Dreams (2023)
  'city-of-dreams-2023': {
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/345/864565.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BN2E0NGY1MTYtN2Q2Ni00NDRhLThlYjYtYWIyZWVjMzA4OTRiXkEyXkFqcGc@._V1_.jpg'
  },
  // 28. Midnight Express (1978)
  'midnight-express-2024': {
    poster: 'https://m.media-amazon.com/images/M/MV5BZTRiOGMxYzctMTk3Ny00ODBkLWIyNTMtOGZhMWY0MjZiYzAxXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMjA5OTgxMTIxNF5BMl5BanBnXkFtZTgwNzYwNDY1MDE@._V1_.jpg'
  },
  // 29. Afterglow (2025)
  'afterglow-2025': {
    poster: 'https://m.media-amazon.com/images/M/MV5BMjEyNzQzNzk2NV5BMl5BanBnXkFtZTcwNTI3NTk3NA@@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BNzUzNDU1Y2MtNjQ5Mi00NDM0LWI5MDgtZDBjYjYzMTM2MzFhXkEyXkFqcGc@._V1_.jpg'
  },
  // 30. The Monsoon Files (2024)
  'monsoon-files-2024': {
    poster: 'https://m.media-amazon.com/images/M/MV5BZDVjNmQyM2MtYmIxNS00ZDk1LTg2N2QtMDQ4YTM0MzE5MDcxXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BN2Y2NDgwYTYtZDRiYy00NThjLWJmOTUtYTUxYWEyNzhlNmRiXkEyXkFqcGc@._V1_.jpg'
  },
  // 31. Winter Signal (2024)
  'winter-signal-2024': {
    poster: 'https://m.media-amazon.com/images/M/MV5BMTY3OTAyNjg0Ml5BMl5BanBnXkFtZTgwNTQ2Nzg5MTE@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMTQ0MzMyOTcwMF5BMl5BanBnXkFtZTgwNjQ2Nzg5MTE@._V1_.jpg'
  },
  // 32. Red Earth (2025)
  'red-earth-2025': {
    poster: 'https://m.media-amazon.com/images/M/MV5BMTUyMTAwMzMwNV5BMl5BanBnXkFtZTcwOTQyNTQ0Mg@@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg'
  },
  // 33. Chronicles of Kashi (2025)
  'chronicles-kashi-2025': {
    poster: 'https://m.media-amazon.com/images/M/MV5BN2E0NGY1MTYtN2Q2Ni00NDRhLThlYjYtYWIyZWVjMzA4OTRiXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg'
  },
  // 34. The Last Ghazal (2025)
  'the-last-ghazal-2025': {
    poster: 'https://m.media-amazon.com/images/M/MV5BNzUzNDU1Y2MtNjQ5Mi00NDM0LWI5MDgtZDBjYjYzMTM2MzFhXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://m.media-amazon.com/images/M/MV5BN2E0NGY1MTYtN2Q2Ni00NDRhLThlYjYtYWIyZWVjMzA4OTRiXkEyXkFqcGc@._V1_.jpg'
  }
};

async function applyArtwork() {
  const db = getDatabase();
  const updateContent = db.prepare(`
    UPDATE content
    SET poster = ?, backdrop = ?, updated_at = ?
    WHERE id = ?
  `);

  let updatedCount = 0;
  const now = new Date().toISOString();

  for (const [id, art] of Object.entries(officialArtworkMap)) {
    const res = updateContent.run(art.poster, art.backdrop, now, id);
    if (res.changes > 0) {
      updatedCount++;
      console.log(`✓ Updated artwork for: ${id}`);
    } else {
      console.log(`- Title not found in DB: ${id}`);
    }
  }

  // Verification: check if any unsplash URLs remain
  const rows = db.prepare('SELECT id, title, poster, backdrop FROM content').all() as any[];
  const remainingUnsplash = rows.filter(r => r.poster.includes('unsplash') || r.backdrop.includes('unsplash'));

  console.log('------------------------------------------------------------');
  console.log(`Total titles updated in DB: ${updatedCount} / ${Object.keys(officialArtworkMap).length}`);
  console.log(`Total titles in DB: ${rows.length}`);
  console.log(`Remaining Unsplash artwork titles: ${remainingUnsplash.length}`);
  if (remainingUnsplash.length > 0) {
    console.log('Remaining Unsplash items:', remainingUnsplash.map(r => r.id));
  } else {
    console.log('★ ZERO Unsplash items remaining in database catalog!');
  }
}

applyArtwork().catch(console.error);
