import { getAdapter } from '../db/adapter.js';
import { metadataImportService, ImportPayload } from '../services/metadataImportService.js';
import { contentRepository } from '../repositories/contentRepository.js';

interface StudioItemSeed extends ImportPayload {
  studio: 'Marvel' | 'DC' | 'HBO';
  runtime?: string;
}

// ── NEW MARVEL TITLES ────────────────────────────────────────────────────────
const NEW_MARVEL_MOVIES: StudioItemSeed[] = [
  {
    title: 'Iron Man',
    releaseYear: 2008,
    type: 'MOVIE',
    language: 'English',
    genres: ['Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 7.9,
    description: 'After being held captive in an Afghan cave, billionaire engineer Tony Stark creates a unique weaponized suit of armor to fight evil.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTczNTI2ODUwOF5BMl5BanBnXkFtZTcwMTU0NTIzMw@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0371746/img',
    runtime: '2h 6m',
    director: 'Jon Favreau',
    cast: ['Robert Downey Jr.', 'Gwyneth Paltrow', 'Jeff Bridges'],
    studio: 'Marvel'
  },
  {
    title: 'The Avengers',
    releaseYear: 2012,
    type: 'MOVIE',
    language: 'English',
    genres: ['Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 8.0,
    description: "Earth's mightiest heroes must come together and learn to fight as a team if they are going to stop the mischievous Loki and his alien army from enslaving humanity.",
    poster: 'https://m.media-amazon.com/images/M/MV5BNGE0YTVjNzUtNzJjOS00NGNlLTgxMzctZTBhMDJicmdhNzRhXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0848228/img',
    runtime: '2h 23m',
    director: 'Joss Whedon',
    cast: ['Robert Downey Jr.', 'Chris Evans', 'Scarlett Johansson'],
    studio: 'Marvel'
  },
  {
    title: 'Avengers: Infinity War',
    releaseYear: 2018,
    type: 'MOVIE',
    language: 'English',
    genres: ['Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 8.4,
    description: 'The Avengers and their allies must be willing to sacrifice all in an attempt to defeat the powerful Thanos before his blitz of devastation and ruin puts an end to the universe.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjMxNjY2MDU1OV5BMl5BanBnXkFtZTgwNzY1MTUwNTM@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4154756/img',
    runtime: '2h 29m',
    director: 'Anthony Russo, Joe Russo',
    cast: ['Robert Downey Jr.', 'Chris Hemsworth', 'Mark Ruffalo'],
    studio: 'Marvel'
  },
  {
    title: 'Avengers: Endgame',
    releaseYear: 2019,
    type: 'MOVIE',
    language: 'English',
    genres: ['Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 8.4,
    description: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos\' actions.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4154796/img',
    runtime: '3h 1m',
    director: 'Anthony Russo, Joe Russo',
    cast: ['Robert Downey Jr.', 'Chris Evans', 'Mark Ruffalo'],
    studio: 'Marvel'
  },
  {
    title: 'Captain America: The Winter Soldier',
    releaseYear: 2014,
    type: 'MOVIE',
    language: 'English',
    genres: ['Marvel', 'Action', 'Thriller', 'Sci-Fi'],
    rating: 7.8,
    description: 'As Steve Rogers struggles to embrace his role in the modern world, he teams up with a fellow Avenger and S.H.I.E.L.D agent, Black Widow, to battle a new threat from history: an assassin known as the Winter Soldier.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzA2NDkwODAwM15BMl5BanBnXkFtZTgwODmbOTc0MDE@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1843866/img',
    runtime: '2h 16m',
    director: 'Anthony Russo, Joe Russo',
    cast: ['Chris Evans', 'Samuel L. Jackson', 'Scarlett Johansson'],
    studio: 'Marvel'
  },
  {
    title: 'Guardians of the Galaxy',
    releaseYear: 2014,
    type: 'MOVIE',
    language: 'English',
    genres: ['Marvel', 'Action', 'Comedy', 'Sci-Fi'],
    rating: 8.0,
    description: 'A group of intergalactic criminals must pull together to stop a fanatical warrior with plans to purge the universe.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTAwMDA5NzEwNDNeQTJeQWpwZ15BbWU4MDkyNjUxMTIx._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2015381/img',
    runtime: '2h 1m',
    director: 'James Gunn',
    cast: ['Chris Pratt', 'Vin Diesel', 'Bradley Cooper'],
    studio: 'Marvel'
  },
  {
    title: 'Thor: Ragnarok',
    releaseYear: 2017,
    type: 'MOVIE',
    language: 'English',
    genres: ['Marvel', 'Action', 'Comedy', 'Fantasy'],
    rating: 7.9,
    description: 'Imprisoned on the planet Sakaar, Thor must race against time to return to Asgard and stop Ragnarök, the destruction of his world, at the hands of the powerful and ruthless villain Hela.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjMyNDkzMzI1OF5BMl5BanBnXkFtZTgwODcxODg5MjI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt3501632/img',
    runtime: '2h 10m',
    director: 'Taika Waititi',
    cast: ['Chris Hemsworth', 'Tom Hiddleston', 'Cate Blanchett'],
    studio: 'Marvel'
  },
  {
    title: 'Black Panther',
    releaseYear: 2018,
    type: 'MOVIE',
    language: 'English',
    genres: ['Marvel', 'Action', 'Sci-Fi', 'Drama'],
    rating: 7.3,
    description: "T'Challa, heir to the hidden kingdom of Wakanda, must step forward to lead his people into a new future and must confront a challenger from his country's past.",
    poster: 'https://m.media-amazon.com/images/M/MV5BMTg1MTY2MjYzNV5BMl5BanBnXkFtZTgwMTc4NTMwNDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1825683/img',
    runtime: '2h 14m',
    director: 'Ryan Coogler',
    cast: ['Chadwick Boseman', 'Michael B. Jordan', "Lupita Nyong'o"],
    studio: 'Marvel'
  },
  {
    title: 'Spider-Man: No Way Home',
    releaseYear: 2021,
    type: 'MOVIE',
    language: 'English',
    genres: ['Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 8.2,
    description: 'With Spider-Man\'s identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear, forcing Peter to discover what it truly means to be Spider-Man.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMmFiZGZjMmEtMTA0Ni00MzA2LTljMTUtZGYmOTUxNDU4N2VhXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10872600/img',
    runtime: '2h 28m',
    director: 'Jon Watts',
    cast: ['Tom Holland', 'Zendaya', 'Benedict Cumberbatch'],
    studio: 'Marvel'
  }
];

const NEW_MARVEL_SERIES: StudioItemSeed[] = [
  {
    title: 'Loki',
    releaseYear: 2021,
    type: 'SERIES',
    language: 'English',
    genres: ['Marvel', 'Action', 'Sci-Fi', 'Fantasy'],
    rating: 8.2,
    description: 'The mercurial villain Loki resumes his role as the God of Mischief in a new series that takes place after the events of Avengers: Endgame.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNmU4M2E1YjgtZmIzOS00YWI0LTgyMjUtMTk2YmQ3M2E5ZGI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9140554/img',
    director: 'Michael Waldron',
    cast: ['Tom Hiddleston', 'Owen Wilson', 'Sophia Di Martino'],
    studio: 'Marvel',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Glorious Purpose', description: 'Loki is brought before the Time Variance Authority.', duration: '51m', durationSeconds: 3060, thumbnail: 'https://images.metahub.space/background/medium/tt9140554/img' },
          { episodeNumber: 2, title: 'The Variant', description: 'Mobius puts Loki to work, but not everyone at the TVA is thrilled with his presence.', duration: '54m', durationSeconds: 3240, thumbnail: 'https://images.metahub.space/background/medium/tt9140554/img' },
          { episodeNumber: 3, title: 'Lamentis', description: 'Loki finds out The Variant\'s plans, but has his own scheme.', duration: '42m', durationSeconds: 2520, thumbnail: 'https://images.metahub.space/background/medium/tt9140554/img' },
          { episodeNumber: 4, title: 'The Nexus Event', description: 'Frayed nerves and paranoia seep through the TVA.', duration: '48m', durationSeconds: 2880, thumbnail: 'https://images.metahub.space/background/medium/tt9140554/img' },
          { episodeNumber: 5, title: 'Journey Into Mystery', description: 'Loki tries to escape The Void, a desolate purgatory.', duration: '49m', durationSeconds: 2940, thumbnail: 'https://images.metahub.space/background/medium/tt9140554/img' },
          { episodeNumber: 6, title: 'For All Time. Always.', description: 'The clock is ticking in the season finale.', duration: '46m', durationSeconds: 2760, thumbnail: 'https://images.metahub.space/background/medium/tt9140554/img' }
        ]
      }
    ]
  },
  {
    title: 'WandaVision',
    releaseYear: 2021,
    type: 'SERIES',
    language: 'English',
    genres: ['Marvel', 'Comedy', 'Drama', 'Sci-Fi', 'Mystery'],
    rating: 7.9,
    description: 'Blends the style of classic sitcoms with the MCU, in which Wanda Maximoff and Vision - two super-powered beings living their ideal suburban lives - begin to suspect that everything is not as it seems.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZGEwYmMwZmMtMTQ3Ny00MWNhLWEwMTQtZWVlMGYxZTFhZTY5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9140560/img',
    director: 'Jac Schaeffer',
    cast: ['Elizabeth Olsen', 'Paul Bettany', 'Kathryn Hahn'],
    studio: 'Marvel',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Filmed Before a Live Studio Audience', description: 'Wanda and Vision try to conceal their powers during a dinner with Vision\'s boss.', duration: '30m', durationSeconds: 1800, thumbnail: 'https://images.metahub.space/background/medium/tt9140560/img' },
          { episodeNumber: 2, title: 'Don\'t Touch That Dial', description: 'In an effort to blend in, Wanda and Vision perform a magic act in a community talent show.', duration: '37m', durationSeconds: 2220, thumbnail: 'https://images.metahub.space/background/medium/tt9140560/img' },
          { episodeNumber: 3, title: 'Now in Color', description: 'Wanda\'s pregnancy accelerates at an alarming pace.', duration: '33m', durationSeconds: 1980, thumbnail: 'https://images.metahub.space/background/medium/tt9140560/img' },
          { episodeNumber: 4, title: 'We Interrupt This Program', description: 'Monica Rambeau investigates a missing person\'s case in Westview.', duration: '35m', durationSeconds: 2100, thumbnail: 'https://images.metahub.space/background/medium/tt9140560/img' }
        ]
      }
    ]
  },
  {
    title: 'Moon Knight',
    releaseYear: 2022,
    type: 'SERIES',
    language: 'English',
    genres: ['Marvel', 'Action', 'Adventure', 'Fantasy'],
    rating: 7.3,
    description: 'Steven Grant discovers he\'s been granted the powers of an Egyptian moon god. But he soon finds out that these newfound powers can be both a blessing and a curse to his troubled life.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2ZjRhNWYtNWY1ZC00ODhkLWE3MzktMWU2MzYwNjIxNTBkXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10234724/img',
    director: 'Jeremy Slater',
    cast: ['Oscar Isaac', 'Ethan Hawke', 'May Calamawy'],
    studio: 'Marvel',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'The Goldfish Problem', description: 'Steven Grant learns that his sleep disorder is something much worse.', duration: '47m', durationSeconds: 2820, thumbnail: 'https://images.metahub.space/background/medium/tt10234724/img' },
          { episodeNumber: 2, title: 'Summon the Suit', description: 'Steven discovers a whole new side of himself.', duration: '50m', durationSeconds: 3000, thumbnail: 'https://images.metahub.space/background/medium/tt10234724/img' }
        ]
      }
    ]
  },
  {
    title: 'The Punisher',
    releaseYear: 2017,
    type: 'SERIES',
    language: 'English',
    genres: ['Marvel', 'Action', 'Crime', 'Drama'],
    rating: 8.5,
    description: 'After the murder of his family, Marine veteran Frank Castle becomes the vigilante known as "The Punisher", with only one goal in mind: to avenge them.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjY5Mzk0NTEwNV5BMl5BanBnXkFtZTgwNTQzMzc1MzI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt5675620/img',
    director: 'Steve Lightfoot',
    cast: ['Jon Bernthal', 'Amber Rose Revah', 'Ben Barnes'],
    studio: 'Marvel',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: '3 AM', description: 'Frank Castle seeks retribution for his family\'s death.', duration: '53m', durationSeconds: 3180, thumbnail: 'https://images.metahub.space/background/medium/tt5675620/img' },
          { episodeNumber: 2, title: 'Two Dead Men', description: 'A mysterious phone call leads Frank on a new mission.', duration: '55m', durationSeconds: 3300, thumbnail: 'https://images.metahub.space/background/medium/tt5675620/img' }
        ]
      }
    ]
  },
  {
    title: 'Hawkeye',
    releaseYear: 2021,
    type: 'SERIES',
    language: 'English',
    genres: ['Marvel', 'Action', 'Adventure', 'Crime'],
    rating: 7.5,
    description: 'Series based on the Marvel Comics superhero Hawkeye, centering on the adventures of Young Avenger Kate Bishop, who took on the role after the original Avenger, Clint Barton.',
    poster: 'https://m.media-amazon.com/images/M/MV5BM2NjYmVmZTUtYTEyMi00ZjdhLTlmOGQtNWQ3YjQ2ZWEyZDI1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10160804/img',
    director: 'Jonathan Igla',
    cast: ['Jeremy Renner', 'Hailee Steinfeld', 'Florence Pugh'],
    studio: 'Marvel',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Never Meet Your Heroes', description: 'Kate Bishop stumbles into a black-market auction.', duration: '49m', durationSeconds: 2940, thumbnail: 'https://images.metahub.space/background/medium/tt10160804/img' },
          { episodeNumber: 2, title: 'Hide and Seek', description: 'Clint has to help Kate escape the Tracksuit Mafia.', duration: '52m', durationSeconds: 3120, thumbnail: 'https://images.metahub.space/background/medium/tt10160804/img' }
        ]
      }
    ]
  },
  {
    title: 'The Falcon and the Winter Soldier',
    releaseYear: 2021,
    type: 'SERIES',
    language: 'English',
    genres: ['Marvel', 'Action', 'Adventure', 'Drama'],
    rating: 7.1,
    description: 'Following the events of Avengers: Endgame, Sam Wilson and Bucky Barnes team up in a global adventure that tests their abilities—and their patience.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODNiODVmYjItM2MyMC00ZWQyLTgyMGYtNzJjMmVmZTY2OTJkXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9233980/img',
    director: 'Malcolm Spellman',
    cast: ['Anthony Mackie', 'Sebastian Stan', 'Daniel Brühl'],
    studio: 'Marvel',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'New World Order', description: 'Sam Wilson grapples with the legacy of Captain America.', duration: '50m', durationSeconds: 3000, thumbnail: 'https://images.metahub.space/background/medium/tt9233980/img' },
          { episodeNumber: 2, title: 'The Star-Spangled Man', description: 'Sam and Bucky find themselves working alongside a new hero.', duration: '50m', durationSeconds: 3000, thumbnail: 'https://images.metahub.space/background/medium/tt9233980/img' }
        ]
      }
    ]
  },
  {
    title: 'Jessica Jones',
    releaseYear: 2015,
    type: 'SERIES',
    language: 'English',
    genres: ['Marvel', 'Action', 'Crime', 'Drama'],
    rating: 7.9,
    description: 'Following the tragic end of her brief superhero career, Jessica Jones tries to rebuild her life as a private investigator dealing with cases involving the enhanced.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTBmNTFiNjYtYjZkNi00NzE5LWI0MzUtM2NkYzk5MjkzZDUzXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2357547/img',
    director: 'Melissa Rosenberg',
    cast: ['Krysten Ritter', 'Rachael Taylor', 'David Tennant'],
    studio: 'Marvel',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'AKA Ladies Night', description: 'Jessica Jones is hired to find a missing college girl.', duration: '52m', durationSeconds: 3120, thumbnail: 'https://images.metahub.space/background/medium/tt2357547/img' },
          { episodeNumber: 2, title: 'AKA Crush Syndrome', description: 'Jessica vows to prove Hope\'s innocence.', duration: '53m', durationSeconds: 3180, thumbnail: 'https://images.metahub.space/background/medium/tt2357547/img' }
        ]
      }
    ]
  },
  {
    title: "X-Men '97",
    releaseYear: 2024,
    type: 'SERIES',
    language: 'English',
    genres: ['Marvel', 'Animation', 'Action', 'Sci-Fi'],
    rating: 8.9,
    description: 'A band of mutants use their uncanny gifts to protect a world that hates and fears them, as they\'re challenged like never before, forced to face a dangerous and unexpected new future.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTY3YTUwOWQtMzk0OC00Y2QwLTk5YmItMDc2OWFjMjI4NmFjXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt16026746/img',
    director: 'Beau DeMayo',
    cast: ['Ray Chase', 'Jennifer Hale', 'Lenore Zann'],
    studio: 'Marvel',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'To Me, My X-Men', description: 'The X-Men pick up the pieces after Professor X\'s death.', duration: '31m', durationSeconds: 1860, thumbnail: 'https://images.metahub.space/background/medium/tt16026746/img' },
          { episodeNumber: 2, title: 'Mutant Liberation Begins', description: 'Magneto is brought to trial at the UN.', duration: '32m', durationSeconds: 1920, thumbnail: 'https://images.metahub.space/background/medium/tt16026746/img' }
        ]
      }
    ]
  },
  {
    title: 'What If...?',
    releaseYear: 2021,
    type: 'SERIES',
    language: 'English',
    genres: ['Marvel', 'Animation', 'Action', 'Adventure', 'Sci-Fi'],
    rating: 7.4,
    description: 'Exploring pivotal moments from the Marvel Cinematic Universe and turning them on their head, leading the audience into uncharted territory.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZWE4Nzg3YTgtNWQ5NC00NmFlLThhZTUtYjU2ZDM0ODBiYmU4XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10168312/img',
    director: 'A.C. Bradley',
    cast: ['Jeffrey Wright', 'Terri Douglas', 'Matthew Wood'],
    studio: 'Marvel',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'What If... Captain Carter Were The First Avenger?', description: 'Peggy Carter takes the super soldier serum instead of Steve Rogers.', duration: '34m', durationSeconds: 2040, thumbnail: 'https://images.metahub.space/background/medium/tt10168312/img' },
          { episodeNumber: 2, title: 'What If... T\'Challa Became a Star-Lord?', description: 'The Ravagers abduct T\'Challa instead of Peter Quill.', duration: '35m', durationSeconds: 2100, thumbnail: 'https://images.metahub.space/background/medium/tt10168312/img' }
        ]
      }
    ]
  }
];

// ── NEW DC TITLES ────────────────────────────────────────────────────────────
const NEW_DC_MOVIES: StudioItemSeed[] = [
  {
    title: 'The Batman',
    releaseYear: 2022,
    type: 'MOVIE',
    language: 'English',
    genres: ['DC', 'Action', 'Crime', 'Drama', 'Mystery'],
    rating: 7.8,
    description: 'When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city\'s hidden corruption and question his family\'s involvement.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMDdmMTBiNTYtMGMzYS00ODAyLTg0MDUtZDJhMDVlNGVjMjAzXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1877830/img',
    runtime: '2h 56m',
    director: 'Matt Reeves',
    cast: ['Robert Pattinson', 'Zoë Kravitz', 'Jeffrey Wright'],
    studio: 'DC'
  },
  {
    title: 'Batman Begins',
    releaseYear: 2005,
    type: 'MOVIE',
    language: 'English',
    genres: ['DC', 'Action', 'Crime', 'Drama'],
    rating: 8.2,
    description: 'After witnessing his parents\' death, Bruce Wayne trains with the League of Shadows and frees Gotham City from the corrupt grip of criminals.',
    poster: 'https://m.media-amazon.com/images/M/MV5BOTY4YjI2N2MtYmFlMC00ZjcyLTg3YjEtMDQyM2ZjYzQjYmJhXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0372784/img',
    runtime: '2h 20m',
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Michael Caine', 'Liam Neeson'],
    studio: 'DC'
  },
  {
    title: 'The Dark Knight Rises',
    releaseYear: 2012,
    type: 'MOVIE',
    language: 'English',
    genres: ['DC', 'Action', 'Drama', 'Thriller'],
    rating: 8.4,
    description: 'Eight years after the Joker\'s reign of anarchy, Batman, with the help of the enigmatic Catwoman, is forced from his exile to save Gotham City from the brutal guerrilla terrorist Bane.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTk4ODQzNDY3Ml5BMl5BanBnXkFtZTcwODA0NTM4Nw@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1345836/img',
    runtime: '2h 44m',
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Tom Hardy', 'Anne Hathaway'],
    studio: 'DC'
  },
  {
    title: 'Man of Steel',
    releaseYear: 2013,
    type: 'MOVIE',
    language: 'English',
    genres: ['DC', 'Action', 'Adventure', 'Sci-Fi'],
    rating: 7.1,
    description: 'An alien child is evacuated from his dying world and sent to Earth to live among humans. His peace is threatened when other survivors of his home planet arrive on Earth.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTk5ODk1NDkxNV5BMl5BanBnXkFtZTcwNTA5OTY0OQ@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0770828/img',
    runtime: '2h 23m',
    director: 'Zack Snyder',
    cast: ['Henry Cavill', 'Amy Adams', 'Michael Shannon'],
    studio: 'DC'
  },
  {
    title: "Zack Snyder's Justice League",
    releaseYear: 2021,
    type: 'MOVIE',
    language: 'English',
    genres: ['DC', 'Action', 'Adventure', 'Fantasy'],
    rating: 7.9,
    description: 'Determined to ensure Superman\'s ultimate sacrifice was not in vain, Bruce Wayne aligns forces with Diana Prince with plans to recruit a team of metahumans to protect the world from an approaching threat of catastrophic proportions.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzExZTcwNjgtYmE2MC00MzBhLTk0OWEtNTM0ZDJkOWRjNTU2XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt12361974/img',
    runtime: '4h 2m',
    director: 'Zack Snyder',
    cast: ['Ben Affleck', 'Henry Cavill', 'Gal Gadot'],
    studio: 'DC'
  },
  {
    title: 'Wonder Woman',
    releaseYear: 2017,
    type: 'MOVIE',
    language: 'English',
    genres: ['DC', 'Action', 'Adventure', 'Fantasy'],
    rating: 7.4,
    description: 'When a pilot crashes and tells of conflict in the outside world, Diana, an Amazonian warrior in training, leaves home to fight a war, discovering her full powers and true destiny.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNDFmYTIxMjctYTQ2ZC00OGQ4LWE3OGYtNDVhMzNmN2FiWQ@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0451279/img',
    runtime: '2h 21m',
    director: 'Patty Jenkins',
    cast: ['Gal Gadot', 'Chris Pine', 'Robin Wright'],
    studio: 'DC'
  },
  {
    title: 'Watchmen',
    releaseYear: 2009,
    type: 'MOVIE',
    language: 'English',
    genres: ['DC', 'Action', 'Drama', 'Mystery', 'Sci-Fi'],
    rating: 7.6,
    description: 'In an alternate 1985 America, costumed superheroes are part of daily life. When one of his former colleagues is murdered, the masked vigilante Rorschach uncovers a plot to discredit and murder all past and present superheroes.',
    poster: 'https://m.media-amazon.com/images/M/MV5BY2IzNGNiODgtOWYzOS00OTExLTgwZjUtZWU5YzA3NzhiMjE5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0409459/img',
    runtime: '2h 42m',
    director: 'Zack Snyder',
    cast: ['Jackie Earle Haley', 'Patrick Wilson', 'Carla Gugino'],
    studio: 'DC'
  },
  {
    title: 'The Suicide Squad',
    releaseYear: 2021,
    type: 'MOVIE',
    language: 'English',
    genres: ['DC', 'Action', 'Adventure', 'Comedy'],
    rating: 7.2,
    description: 'Supervillains Harley Quinn, Bloodsport, Peacemaker and a collection of nutty cons at Belle Reve prison join the super-secret, super-shady Task Force X as they are dropped off at the remote, enemy-infused island of Corto Maltese.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjM1OThmccdLWJjZS00ZmM4LTkyOWEtYzQ3MDc0NTc4YTY5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt6334354/img',
    runtime: '2h 12m',
    director: 'James Gunn',
    cast: ['Margot Robbie', 'Idris Elba', 'John Cena'],
    studio: 'DC'
  }
];

const NEW_DC_SERIES: StudioItemSeed[] = [
  {
    title: 'Peacemaker',
    releaseYear: 2022,
    type: 'SERIES',
    language: 'English',
    genres: ['DC', 'Action', 'Adventure', 'Comedy', 'Sci-Fi'],
    rating: 8.3,
    description: 'Picking up where The Suicide Squad left off, Peacemaker returns home after recovering from his encounter with Bloodsport - only to discover that his freedom comes at a price.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2ZjM4NTgtYjc3MS00ZjYwLTk0YWEtZmI4YTg4ODkyNjQ0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt13146488/img',
    director: 'James Gunn',
    cast: ['John Cena', 'Danielle Brooks', 'Freddie Stroma'],
    studio: 'DC',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'A Whole New Whirled', description: 'Peacemaker is released from the hospital and immediately recruited for Project Butterfly.', duration: '44m', durationSeconds: 2640, thumbnail: 'https://images.metahub.space/background/medium/tt13146488/img' },
          { episodeNumber: 2, title: 'Best Friends, For Never', description: 'Peacemaker faces off against a dangerous metahuman.', duration: '40m', durationSeconds: 2400, thumbnail: 'https://images.metahub.space/background/medium/tt13146488/img' }
        ]
      }
    ]
  },
  {
    title: 'The Penguin',
    releaseYear: 2024,
    type: 'SERIES',
    language: 'English',
    genres: ['DC', 'Crime', 'Drama'],
    rating: 8.8,
    description: 'Following the events of The Batman, Oz Cobb makes a play to seize the reins of the criminal underworld in Gotham City.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA4Nzg5NTAxNV5BMl5BanBnXkFtZTgwNTU5NjU2MjE@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt15435876/img',
    director: 'Lauren LeFranc',
    cast: ['Colin Farrell', 'Cristin Milioti', 'Rhenzy Feliz'],
    studio: 'DC',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'After Hours', description: 'Oz Cobb makes a bold power move in Gotham.', duration: '66m', durationSeconds: 3960, thumbnail: 'https://images.metahub.space/background/medium/tt15435876/img' },
          { episodeNumber: 2, title: 'Inside Man', description: 'Oz scrambles to keep his position amid rising tensions.', duration: '57m', durationSeconds: 3420, thumbnail: 'https://images.metahub.space/background/medium/tt15435876/img' }
        ]
      }
    ]
  },
  {
    title: 'The Sandman',
    releaseYear: 2022,
    type: 'SERIES',
    language: 'English',
    genres: ['DC', 'Drama', 'Fantasy', 'Horror'],
    rating: 7.7,
    description: 'Upon escaping after decades of imprisonment by a mortal wizard, Dream, the personification of dreams, sets about to reclaim his lost equipment.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIxNDBmZTMtNzVlZS00OWI5LWJiNjEtZTUxNWZjMmMzODAzXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1755563/img',
    director: 'Neil Gaiman',
    cast: ['Tom Sturridge', 'Boyd Holbrook', 'Patton Oswalt'],
    studio: 'DC',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Sleep of the Just', description: 'A mortal occultist captures Morpheus, the King of Dreams.', duration: '54m', durationSeconds: 3240, thumbnail: 'https://images.metahub.space/background/medium/tt1755563/img' },
          { episodeNumber: 2, title: 'Imperfect Hosts', description: 'Morpheus seeks to restore the Dreaming kingdom.', duration: '40m', durationSeconds: 2400, thumbnail: 'https://images.metahub.space/background/medium/tt1755563/img' }
        ]
      }
    ]
  },
  {
    title: 'Watchmen (Series)',
    releaseYear: 2019,
    type: 'SERIES',
    language: 'English',
    genres: ['DC', 'Crime', 'Drama', 'Mystery', 'Sci-Fi'],
    rating: 8.2,
    description: 'Set in an alternate history where masked vigilantes are treated as outlaws, Watchmen embraces the nostalgia of the original groundbreaking graphic novel while attempting to break new ground of its own.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2ZjM4NTgtYjc3MS00ZjYwLTk0YWEtZmI4YTg4ODkyNjQ0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt7049682/img',
    director: 'Damon Lindelof',
    cast: ['Regina King', 'Yahya Abdul-Mateen II', 'Jeremy Irons'],
    studio: 'DC',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'It\'s Summer and We\'re Running Out of Ice', description: 'In Tulsa, Oklahoma, a police shooting sparks a major investigation.', duration: '60m', durationSeconds: 3600, thumbnail: 'https://images.metahub.space/background/medium/tt7049682/img' }
        ]
      }
    ]
  },
  {
    title: 'Gotham',
    releaseYear: 2014,
    type: 'SERIES',
    language: 'English',
    genres: ['DC', 'Action', 'Crime', 'Drama', 'Mystery'],
    rating: 7.8,
    description: 'The story behind Detective James Gordon\'s rise to prominence in Gotham City in the years before Batman\'s arrival.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA5OTc2OTcyNV5BMl5BanBnXkFtZTgwNzU4Nzg4NjE@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt3749900/img',
    director: 'Bruno Heller',
    cast: ['Ben McKenzie', 'Jada Pinkett Smith', 'Donal Logue'],
    studio: 'DC',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Rookie detective Jim Gordon investigates the Wayne murders.', duration: '49m', durationSeconds: 2940, thumbnail: 'https://images.metahub.space/background/medium/tt3749900/img' }
        ]
      }
    ]
  },
  {
    title: 'The Flash',
    releaseYear: 2014,
    type: 'SERIES',
    language: 'English',
    genres: ['DC', 'Action', 'Adventure', 'Drama', 'Sci-Fi'],
    rating: 7.5,
    description: 'After being struck by lightning, Barry Allen wakes up from his coma to discover he\'s been given the power of super speed, becoming the next Flash, fighting crime in Central City.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZDU3ZjY2NzktNzBmYi00ZjJhLThhNDUtMDBlYmFmYjlkODQyXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt3107288/img',
    director: 'Greg Berlanti',
    cast: ['Grant Gustin', 'Candice Patton', 'Danielle Panabaker'],
    studio: 'DC',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'City of Heroes', description: 'Barry Allen wakes from a nine-month coma with the power of super speed.', duration: '44m', durationSeconds: 2640, thumbnail: 'https://images.metahub.space/background/medium/tt3107288/img' }
        ]
      }
    ]
  },
  {
    title: 'Arrow',
    releaseYear: 2012,
    type: 'SERIES',
    language: 'English',
    genres: ['DC', 'Action', 'Adventure', 'Crime', 'Drama'],
    rating: 7.5,
    description: 'Spoiled billionaire playboy Oliver Queen is missing and presumed dead when his yacht is lost at sea. He returns five years later a changed man, determined to clean up the city as a hooded vigilante armed with a bow.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTI4MzkzODYwNV5BMl5BanBnXkFtZTcwODgzNDM3OA@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2193021/img',
    director: 'Greg Berlanti',
    cast: ['Stephen Amell', 'Katie Cassidy', 'David Ramsey'],
    studio: 'DC',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Oliver Queen returns to Starling City after five years on a hellish island.', duration: '43m', durationSeconds: 2580, thumbnail: 'https://images.metahub.space/background/medium/tt2193021/img' }
        ]
      }
    ]
  },
  {
    title: 'Harley Quinn',
    releaseYear: 2019,
    type: 'SERIES',
    language: 'English',
    genres: ['DC', 'Animation', 'Action', 'Adventure', 'Comedy'],
    rating: 8.5,
    description: 'Harley Quinn has finally broken things off once and for all with the Joker and attempts to make it on her own as the criminal Queenpin of Gotham City.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA5OTc2OTcyNV5BMl5BanBnXkFtZTgwNzU4Nzg4NjE@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt7661390/img',
    director: 'Justin Halpern',
    cast: ['Kaley Cuoco', 'Lake Bell', 'Alan Tudyk'],
    studio: 'DC',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Til Death Do Us Part', description: 'Harley Quinn realizes the Joker doesn\'t love her.', duration: '23m', durationSeconds: 1380, thumbnail: 'https://images.metahub.space/background/medium/tt7661390/img' }
        ]
      }
    ]
  },
  {
    title: 'Doom Patrol',
    releaseYear: 2019,
    type: 'SERIES',
    language: 'English',
    genres: ['DC', 'Action', 'Comedy', 'Drama', 'Sci-Fi'],
    rating: 7.8,
    description: 'The adventures of an idealistic mad scientist and his field team of superpowered outcasts.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZWJkYmJjOTAtY2EzNy00NzEzLWIwNWYtNzg0YmM2NzA4ZjU4XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8416494/img',
    director: 'Jeremy Carver',
    cast: ['Diane Guerrero', 'April Bowlby', 'Matt Bomer'],
    studio: 'DC',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Cliff Steele wakes up in the care of Dr. Niles Caulder.', duration: '58m', durationSeconds: 3480, thumbnail: 'https://images.metahub.space/background/medium/tt8416494/img' }
        ]
      }
    ]
  }
];

// ── NEW HBO MOVIES ───────────────────────────────────────────────────────────
const NEW_HBO_MOVIES: StudioItemSeed[] = [
  {
    title: 'Deadwood: The Movie',
    releaseYear: 2019,
    type: 'MOVIE',
    language: 'English',
    genres: ['HBO', 'Western', 'Drama'],
    rating: 7.4,
    description: 'Former rivalries are reignited, alliances are tested and old wounds are reopened, as all are left to navigate the inevitable changes that modernity and time have wrought.',
    poster: 'https://m.media-amazon.com/images/M/MV5BM2NjY2QxZWYtMGU2Zi00ODhhLTg5OGYtN2IzMjM1NGVhNmZmXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4237976/img',
    runtime: '1h 50m',
    director: 'Daniel Minahan',
    cast: ['Timothy Olyphant', 'Ian McShane', 'Molly Parker'],
    studio: 'HBO'
  },
  {
    title: 'Bad Education',
    releaseYear: 2020,
    type: 'MOVIE',
    language: 'English',
    genres: ['HBO', 'Biography', 'Comedy', 'Crime', 'Drama'],
    rating: 7.1,
    description: 'The beloved superintendent of New York\'s Roslyn school district and his staff, friends and relatives become the prime suspects in the unfolding of the single largest public school embezzlement scandal in American history.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjY5ZGEyNzItZTNiYi00YWVkLWJlOGYtNWI2ZWY0ZmQzNGVhXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8206668/img',
    runtime: '1h 48m',
    director: 'Cory Finley',
    cast: ['Hugh Jackman', 'Ray Romano', 'Welker White'],
    studio: 'HBO'
  },
  {
    title: 'The Tale',
    releaseYear: 2018,
    type: 'MOVIE',
    language: 'English',
    genres: ['HBO', 'Drama', 'Mystery'],
    rating: 7.3,
    description: 'An investigation into one woman\'s memory as she is forced to re-examine her first sexual relationship and the stories we tell ourselves in order to survive.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMmEyZGYyNzItN2E4Zi00ZTljLTlhZjUtMWFhODZhNDUzMWNjXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4015500/img',
    runtime: '1h 54m',
    director: 'Jennifer Fox',
    cast: ['Laura Dern', 'Jason Ritter', 'Elizabeth Debicki'],
    studio: 'HBO'
  },
  {
    title: 'The Normal Heart',
    releaseYear: 2014,
    type: 'MOVIE',
    language: 'English',
    genres: ['HBO', 'Biography', 'Drama', 'History'],
    rating: 7.9,
    description: 'The story of the onset of the HIV-AIDS crisis in New York City in the early 1980s, taking an unflinching look at the nation\'s sexual politics as gay activists and their allies in the medical community fight to expose the truth about the burgeoning epidemic.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIwNzcwMjM4Nl5BMl5BanBnXkFtZTgwNTUxNjI3MTE@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1684226/img',
    runtime: '2h 12m',
    director: 'Ryan Murphy',
    cast: ['Mark Ruffalo', 'Jonathan Groff', 'Frank De Julio'],
    studio: 'HBO'
  },
  {
    title: 'Behind the Candelabra',
    releaseYear: 2013,
    type: 'MOVIE',
    language: 'English',
    genres: ['HBO', 'Biography', 'Drama', 'Music'],
    rating: 7.0,
    description: 'Based on the autobiographical novel, the film focuses on the tempestuous 6-year relationship between world-famous pianist Liberace and his much younger lover, Scott Thorson.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4NzA5NTAxNF5BMl5BanBnXkFtZTcwNTU2NTA5OQ@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1291580/img',
    runtime: '1h 58m',
    director: 'Steven Soderbergh',
    cast: ['Matt Damon', 'Michael Douglas', 'Dan Aykroyd'],
    studio: 'HBO'
  },
  {
    title: 'Temple Grandin',
    releaseYear: 2010,
    type: 'MOVIE',
    language: 'English',
    genres: ['HBO', 'Biography', 'Drama'],
    rating: 8.2,
    description: 'A biopic of Temple Grandin, an autistic woman who overcame the limitations imposed on her by her condition to become one of the top scientists in the humane livestock handling industry.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTk3Mzg2NjI1MV5BMl5BanBnXkFtZTcwNTI3NjgzMw@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1278469/img',
    runtime: '1h 47m',
    director: 'Mick Jackson',
    cast: ['Claire Danes', 'Julia Ormond', 'David Strathairn'],
    studio: 'HBO'
  },
  {
    title: "You Don't Know Jack",
    releaseYear: 2010,
    type: 'MOVIE',
    language: 'English',
    genres: ['HBO', 'Biography', 'Drama'],
    rating: 7.6,
    description: 'A look at the life and work of doctor-assisted suicide advocate Jack Kevorkian.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTY0Njg4OTgzOF5BMl5BanBnXkFtZTcwNDUzNDkyMw@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1132623/img',
    runtime: '2h 14m',
    director: 'Barry Levinson',
    cast: ['Al Pacino', 'Brenda Vaccaro', 'John Goodman'],
    studio: 'HBO'
  },
  {
    title: 'Too Big to Fail',
    releaseYear: 2011,
    type: 'MOVIE',
    language: 'English',
    genres: ['HBO', 'Biography', 'Drama', 'History'],
    rating: 7.3,
    description: 'Chronicles the financial meltdown of 2008 and the frantic efforts of Wall Street and Washington power-brokers to rescue the U.S. economy.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTk2NzA0OTgyOV5BMl5BanBnXkFtZTcwMjE0ODQ2NA@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1742683/img',
    runtime: '1h 38m',
    director: 'Curtis Hanson',
    cast: ['James Woods', 'John Heard', 'William Hurt'],
    studio: 'HBO'
  },
  {
    title: 'Fahrenheit 451',
    releaseYear: 2018,
    type: 'MOVIE',
    language: 'English',
    genres: ['HBO', 'Drama', 'Sci-Fi'],
    rating: 6.9,
    description: 'In a terrifying care-free future, a young guy named Guy Montag, whose job as a fireman is to burn all books, questions his actions after meeting a young girl.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNzQxMjcxMjUtYWE0MC00YWE0LWE0MTgtMGMwMDhlMDU1MmM5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0360556/img',
    runtime: '1h 40m',
    director: 'Ramin Bahrani',
    cast: ['Michael B. Jordan', 'Aaron Davis', 'Cindy Katz'],
    studio: 'HBO'
  },
  {
    title: 'The Immortal Life of Henrietta Lacks',
    releaseYear: 2017,
    type: 'MOVIE',
    language: 'English',
    genres: ['HBO', 'Biography', 'Drama', 'History'],
    rating: 6.8,
    description: 'An African-American woman becomes an unwitting pioneer for medical breakthroughs when her cells are used to create the first immortal human cell line in the early 1950s.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNGY0Y2QzNzgtYWUzYy00OGJjLWI2OWUtNmIzMTkzNGMwOTU0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt5686160/img',
    runtime: '1h 33m',
    director: 'George C. Wolfe',
    cast: ['Renée Elise Goldsberry', 'Sylvia Grace Crim', 'Reed Birney'],
    studio: 'HBO'
  }
];

// Helper to ensure genre exists and tag content
async function tagWithGenre(contentId: string, genreName: string) {
  const db = getAdapter();
  const slug = genreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let { rows: gRows } = await db.query('SELECT id FROM genres WHERE LOWER(name) = LOWER(?) OR slug = ?', [genreName, slug]);
  let genreId = gRows[0]?.id;
  if (!genreId) {
    genreId = `genre-${slug}`;
    await db.run('INSERT INTO genres (id, name, slug) VALUES (?, ?, ?) ON CONFLICT DO NOTHING;', [genreId, genreName, slug]);
  }
  await db.run('INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING;', [contentId, genreId]);
}

async function runSeed() {
  const db = getAdapter();
  console.log('--- STARTING STUDIO COLLECTIONS SEED & TAGGING ---');

  // 1. Tag existing items
  const existingTags: { title: string; genre: string }[] = [
    // Marvel existing
    { title: 'Spider-Man: Into the Spider-Verse', genre: 'Marvel' },
    { title: 'Daredevil', genre: 'Marvel' },
    // DC existing
    { title: 'The Dark Knight', genre: 'DC' },
    { title: 'Joker', genre: 'DC' },
    { title: 'Lucifer', genre: 'DC' },
    // HBO existing
    { title: 'The Last of Us', genre: 'HBO' },
    { title: 'House of the Dragon', genre: 'HBO' },
    { title: 'Chernobyl', genre: 'HBO' },
    { title: 'Succession', genre: 'HBO' },
    { title: 'Westworld', genre: 'HBO' },
    { title: 'True Detective', genre: 'HBO' },
    { title: 'Game of Thrones', genre: 'HBO' },
    { title: 'The Wire', genre: 'HBO' },
    { title: 'Band of Brothers', genre: 'HBO' },
    { title: 'The Sopranos', genre: 'HBO' }
  ];

  for (const item of existingTags) {
    const { rows } = await db.query('SELECT id FROM content WHERE LOWER(title) = LOWER(?);', [item.title]);
    if (rows[0]?.id) {
      await tagWithGenre(rows[0].id, item.genre);
      console.log(`Tagged existing item "${item.title}" with genre [${item.genre}]`);
    } else {
      console.warn(`Could not find existing item "${item.title}" to tag`);
    }
  }

  // 2. Add new items with deduplication check
  const allNewItems = [
    ...NEW_MARVEL_MOVIES,
    ...NEW_MARVEL_SERIES,
    ...NEW_DC_MOVIES,
    ...NEW_DC_SERIES,
    ...NEW_HBO_MOVIES
  ];

  let addedCount = 0;
  let skippedCount = 0;

  for (const item of allNewItems) {
    const { rows: existing } = await db.query(
      'SELECT id FROM content WHERE LOWER(title) = LOWER(?) AND type = ?;',
      [item.title, item.type]
    );

    if (existing && existing.length > 0) {
      console.log(`[SKIPPED DUPLICATE] "${item.title}" (${item.type}) already exists.`);
      skippedCount++;
      // Still ensure it has the studio tag
      await tagWithGenre(existing[0].id, item.studio);
      continue;
    }

    try {
      const result = await metadataImportService.importContent(item);
      // Ensure studio tag is attached
      await tagWithGenre(result.contentId, item.studio);
      addedCount++;
      console.log(`[ADDED] ${item.studio} ${item.type}: "${item.title}" (${item.releaseYear})`);
    } catch (err: any) {
      console.error(`Failed to import "${item.title}":`, err.message);
    }
  }

  console.log('==================================================');
  console.log(`Studio Collections Import Complete! Added: ${addedCount}, Skipped: ${skippedCount}`);
  console.log('==================================================');

  // Verify counts for Marvel, DC, HBO
  const { rows: marvelRows } = await db.query(
    `SELECT c.title, c.type FROM content c
     JOIN content_genres cg ON c.id = cg.content_id
     JOIN genres g ON cg.genre_id = g.id
     WHERE LOWER(g.name) = 'marvel' ORDER BY c.type, c.title;`
  );
  const { rows: dcRows } = await db.query(
    `SELECT c.title, c.type FROM content c
     JOIN content_genres cg ON c.id = cg.content_id
     JOIN genres g ON cg.genre_id = g.id
     WHERE LOWER(g.name) = 'dc' ORDER BY c.type, c.title;`
  );
  const { rows: hboRows } = await db.query(
    `SELECT c.title, c.type FROM content c
     JOIN content_genres cg ON c.id = cg.content_id
     JOIN genres g ON cg.genre_id = g.id
     WHERE LOWER(g.name) = 'hbo' ORDER BY c.type, c.title;`
  );

  console.log(`\nMarvel items: ${marvelRows.length} (Movies: ${marvelRows.filter((r: any) => r.type === 'MOVIE').length}, Series: ${marvelRows.filter((r: any) => r.type === 'SERIES').length})`);
  console.log(`DC items: ${dcRows.length} (Movies: ${dcRows.filter((r: any) => r.type === 'MOVIE').length}, Series: ${dcRows.filter((r: any) => r.type === 'SERIES').length})`);
  console.log(`HBO items: ${hboRows.length} (Movies: ${hboRows.filter((r: any) => r.type === 'MOVIE').length}, Series: ${hboRows.filter((r: any) => r.type === 'SERIES').length})`);

  process.exit(0);
}

runSeed().catch(err => {
  console.error(err);
  process.exit(1);
});
