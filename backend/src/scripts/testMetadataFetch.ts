import { metadataImportService } from '../services/metadataImportService.js';

async function test() {
  console.log('Testing search and getDetails...');
  const movieResults = await metadataImportService.search('The Shawshank Redemption', 1994, 'MOVIE');
  console.log('Movie candidate:', movieResults[0]);

  if (movieResults[0]) {
    const details = await metadataImportService.getDetails(movieResults[0].providerId, 'MOVIE');
    console.log('Movie details:', {
      title: details.title,
      year: details.releaseYear,
      poster: details.poster?.substring(0, 50),
      backdrop: details.backdrop?.substring(0, 50),
      rating: details.rating,
      genres: details.genres,
      runtime: details.runtime
    });
  }

  const seriesResults = await metadataImportService.search('Kota Factory', 2019, 'SERIES');
  console.log('Series candidate:', seriesResults[0]);

  if (seriesResults[0]) {
    const seriesDetails = await metadataImportService.getDetails(seriesResults[0].providerId, 'SERIES');
    console.log('Series details:', {
      title: seriesDetails.title,
      year: seriesDetails.releaseYear,
      seasonsCount: seriesDetails.seasons?.length,
      episodesCount: seriesDetails.seasons?.reduce((acc, s) => acc + s.episodes.length, 0),
      genres: seriesDetails.genres
    });
  }

  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
