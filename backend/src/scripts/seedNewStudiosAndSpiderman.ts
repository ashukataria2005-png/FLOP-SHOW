import { getAdapter } from '../db/adapter.js';
import { metadataImportService, ImportPayload } from '../services/metadataImportService.js';
import { contentRepository } from '../repositories/contentRepository.js';

interface StudioItemSeed extends ImportPayload {
  studios: string[];
  runtime?: string;
}

// ── 1. SPIDER-MAN COLLECTION (Milestone 3 & Sony & Marvel) ───────────────────
const SPIDERMAN_MOVIES: StudioItemSeed[] = [
  {
    title: 'Spider-Man',
    releaseYear: 2002,
    type: 'MOVIE',
    language: 'English',
    genres: ['Spider-Man', 'Sony Pictures', 'Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 7.4,
    description: 'After being bitten by a genetically-modified spider, a shy teenager gains spider-like abilities that he uses to fight crime and a sinister nemesis in New York City.',
    poster: 'https://images.metahub.space/poster/medium/tt0145487/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0145487/img',
    runtime: '2h 1m',
    director: 'Sam Raimi',
    cast: ['Tobey Maguire', 'Kirsten Dunst', 'Willem Dafoe'],
    studios: ['Spider-Man', 'Sony Pictures', 'Marvel']
  },
  {
    title: 'Spider-Man 2',
    releaseYear: 2004,
    type: 'MOVIE',
    language: 'English',
    genres: ['Spider-Man', 'Sony Pictures', 'Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 7.5,
    description: 'Peter Parker is beset with troubles in his failing personal life as he battles a brilliant scientist named Doctor Otto Octavius.',
    poster: 'https://images.metahub.space/poster/medium/tt0316654/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0316654/img',
    runtime: '2h 7m',
    director: 'Sam Raimi',
    cast: ['Tobey Maguire', 'Kirsten Dunst', 'Alfred Molina'],
    studios: ['Spider-Man', 'Sony Pictures', 'Marvel']
  },
  {
    title: 'Spider-Man 3',
    releaseYear: 2007,
    type: 'MOVIE',
    language: 'English',
    genres: ['Spider-Man', 'Sony Pictures', 'Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 6.3,
    description: 'A strange black entity from another world bonds with Peter Parker and causes inner turmoil as he contends with new villains, temptations, and revenge.',
    poster: 'https://images.metahub.space/poster/medium/tt0413300/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0413300/img',
    runtime: '2h 19m',
    director: 'Sam Raimi',
    cast: ['Tobey Maguire', 'Kirsten Dunst', 'Topher Grace', 'James Franco'],
    studios: ['Spider-Man', 'Sony Pictures', 'Marvel']
  },
  {
    title: 'The Amazing Spider-Man',
    releaseYear: 2012,
    type: 'MOVIE',
    language: 'English',
    genres: ['Spider-Man', 'Sony Pictures', 'Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 6.9,
    description: 'After Peter Parker is bitten by a genetically altered spider, he gains newfound powers and ventures to solve the mystery of his parents\' disappearance.',
    poster: 'https://images.metahub.space/poster/medium/tt0948470/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0948470/img',
    runtime: '2h 16m',
    director: 'Marc Webb',
    cast: ['Andrew Garfield', 'Emma Stone', 'Rhys Ifans'],
    studios: ['Spider-Man', 'Sony Pictures', 'Marvel']
  },
  {
    title: 'The Amazing Spider-Man 2',
    releaseYear: 2014,
    type: 'MOVIE',
    language: 'English',
    genres: ['Spider-Man', 'Sony Pictures', 'Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 6.6,
    description: 'When New York is put under siege by Oscorp, it is up to Spider-Man to save the city he swore to protect as well as the ones he loves.',
    poster: 'https://images.metahub.space/poster/medium/tt1872181/img',
    backdrop: 'https://images.metahub.space/background/medium/tt1872181/img',
    runtime: '2h 22m',
    director: 'Marc Webb',
    cast: ['Andrew Garfield', 'Emma Stone', 'Jamie Foxx'],
    studios: ['Spider-Man', 'Sony Pictures', 'Marvel']
  },
  {
    title: 'Spider-Man: Homecoming',
    releaseYear: 2017,
    type: 'MOVIE',
    language: 'English',
    genres: ['Spider-Man', 'Sony Pictures', 'Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 7.4,
    description: 'Peter Parker balances his life as an ordinary high school student in Queens with his superhero alter-ego Spider-Man, and finds himself on the trail of a new menace prowling the skies of New York City.',
    poster: 'https://images.metahub.space/poster/medium/tt2250912/img',
    backdrop: 'https://images.metahub.space/background/medium/tt2250912/img',
    runtime: '2h 13m',
    director: 'Jon Watts',
    cast: ['Tom Holland', 'Michael Keaton', 'Robert Downey Jr.', 'Zendaya'],
    studios: ['Spider-Man', 'Sony Pictures', 'Marvel']
  },
  {
    title: 'Spider-Man: Far From Home',
    releaseYear: 2019,
    type: 'MOVIE',
    language: 'English',
    genres: ['Spider-Man', 'Sony Pictures', 'Marvel', 'Action', 'Sci-Fi', 'Adventure'],
    rating: 7.4,
    description: 'Following the events of Avengers: Endgame, Spider-Man must step up to take on new threats in a world that has changed forever.',
    poster: 'https://images.metahub.space/poster/medium/tt6320628/img',
    backdrop: 'https://images.metahub.space/background/medium/tt6320628/img',
    runtime: '2h 9m',
    director: 'Jon Watts',
    cast: ['Tom Holland', 'Jake Gyllenhaal', 'Zendaya', 'Samuel L. Jackson'],
    studios: ['Spider-Man', 'Sony Pictures', 'Marvel']
  },
  {
    title: 'Spider-Man: Across the Spider-Verse',
    releaseYear: 2023,
    type: 'MOVIE',
    language: 'English',
    genres: ['Spider-Man', 'Sony Pictures', 'Marvel', 'Animation', 'Action', 'Adventure', 'Sci-Fi'],
    rating: 8.7,
    description: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. When the heroes clash on how to handle a new threat, Miles must redefine what it means to be a hero.',
    poster: 'https://images.metahub.space/poster/medium/tt9362722/img',
    backdrop: 'https://images.metahub.space/background/medium/tt9362722/img',
    runtime: '2h 20m',
    director: 'Joaquim Dos Santos, Kemp Powers',
    cast: ['Shameik Moore', 'Hailee Steinfeld', 'Oscar Isaac'],
    studios: ['Spider-Man', 'Sony Pictures', 'Marvel']
  }
];

// ── 2. WARNER BROS. (Milestone 1) ─────────────────────────────────────────────
const WARNER_BROS_MOVIES: StudioItemSeed[] = [
  {
    title: 'Harry Potter and the Sorcerer\'s Stone',
    releaseYear: 2001,
    type: 'MOVIE',
    language: 'English',
    genres: ['Warner Bros.', 'Fantasy', 'Adventure', 'Family'],
    rating: 7.6,
    description: 'An orphaned boy enrolls in a school of wizardry, where he learns the truth about himself, his family and the terrible evil that haunts the magical world.',
    poster: 'https://images.metahub.space/poster/medium/tt0241527/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0241527/img',
    runtime: '2h 32m',
    director: 'Chris Columbus',
    cast: ['Daniel Radcliffe', 'Rupert Grint', 'Emma Watson'],
    studios: ['Warner Bros.']
  },
  {
    title: 'Harry Potter and the Deathly Hallows: Part 2',
    releaseYear: 2011,
    type: 'MOVIE',
    language: 'English',
    genres: ['Warner Bros.', 'Fantasy', 'Adventure', 'Drama'],
    rating: 8.1,
    description: 'Harry, Ron, and Hermione search for Voldemort\'s remaining Horcruxes in their effort to destroy the Dark Lord as the final battle rages on at Hogwarts.',
    poster: 'https://images.metahub.space/poster/medium/tt1201607/img',
    backdrop: 'https://images.metahub.space/background/medium/tt1201607/img',
    runtime: '2h 10m',
    director: 'David Yates',
    cast: ['Daniel Radcliffe', 'Emma Watson', 'Ralph Fiennes'],
    studios: ['Warner Bros.']
  },
  {
    title: 'Dune',
    releaseYear: 2021,
    type: 'MOVIE',
    language: 'English',
    genres: ['Warner Bros.', 'Sci-Fi', 'Adventure', 'Action'],
    rating: 8.0,
    description: 'A noble family becomes embroiled in a war for control over the galaxy\'s most valuable asset while its heir becomes troubled by visions of a dark future.',
    poster: 'https://images.metahub.space/poster/medium/tt1160419/img',
    backdrop: 'https://images.metahub.space/background/medium/tt1160419/img',
    runtime: '2h 35m',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Rebecca Ferguson', 'Zendaya'],
    studios: ['Warner Bros.']
  },
  {
    title: 'Barbie',
    releaseYear: 2023,
    type: 'MOVIE',
    language: 'English',
    genres: ['Warner Bros.', 'Comedy', 'Adventure', 'Fantasy'],
    rating: 6.8,
    description: 'Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land. However, when they get a chance to go to the real world, they soon discover the joys and perils of living among humans.',
    poster: 'https://images.metahub.space/poster/medium/tt1517268/img',
    backdrop: 'https://images.metahub.space/background/medium/tt1517268/img',
    runtime: '1h 54m',
    director: 'Greta Gerwig',
    cast: ['Margot Robbie', 'Ryan Gosling', 'America Ferrera'],
    studios: ['Warner Bros.']
  }
];

const WARNER_BROS_SERIES: StudioItemSeed[] = [
  {
    title: 'The Big Bang Theory',
    releaseYear: 2007,
    type: 'SERIES',
    language: 'English',
    genres: ['Warner Bros.', 'Comedy', 'Romance'],
    rating: 8.2,
    description: 'A woman who moves into an apartment across the hall from two brilliant but socially awkward physicists shows them how little they know about life outside of the laboratory.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/173/433883.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0898266/img',
    director: 'Chuck Lorre, Bill Prady',
    cast: ['Johnny Galecki', 'Jim Parsons', 'Kaley Cuoco'],
    studios: ['Warner Bros.'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Leonard and Sheldon meet Penny.', duration: '23m', durationSeconds: 1380, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/173/433883.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Supernatural',
    releaseYear: 2005,
    type: 'SERIES',
    language: 'English',
    genres: ['Warner Bros.', 'Drama', 'Fantasy', 'Horror', 'Mystery'],
    rating: 8.4,
    description: 'Two brothers follow their father\'s footsteps as hunters, fighting evil supernatural beings of many kinds, including monsters, demons and gods that roam the earth.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/281/704985.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0460681/img',
    director: 'Eric Kripke',
    cast: ['Jared Padalecki', 'Jensen Ackles', 'Misha Collins'],
    studios: ['Warner Bros.'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Sam and Dean Winchester investigate the Woman in White.', duration: '44m', durationSeconds: 2640, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/281/704985.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Ted Lasso',
    releaseYear: 2020,
    type: 'SERIES',
    language: 'English',
    genres: ['Warner Bros.', 'Comedy', 'Drama', 'Sport'],
    rating: 8.8,
    description: 'American college football coach Ted Lasso heads to London to manage AFC Richmond, a struggling English Premier League football team.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/452/1131742.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10986410/img',
    director: 'Brendan Hunt, Joe Kelly, Bill Lawrence',
    cast: ['Jason Sudeikis', 'Hannah Waddingham', 'Brett Goldstein'],
    studios: ['Warner Bros.'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Ted arrives in England to take over AFC Richmond.', duration: '30m', durationSeconds: 1800, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/452/1131742.jpg' }
        ]
      }
    ]
  }
];

// ── 3. UNIVERSAL PICTURES (Milestone 1) ───────────────────────────────────────
const UNIVERSAL_MOVIES: StudioItemSeed[] = [
  {
    title: 'Oppenheimer',
    releaseYear: 2023,
    type: 'MOVIE',
    language: 'English',
    genres: ['Universal Pictures', 'Biography', 'Drama', 'History'],
    rating: 8.9,
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    poster: 'https://images.metahub.space/poster/medium/tt15398776/img',
    backdrop: 'https://images.metahub.space/background/medium/tt15398776/img',
    runtime: '3h 0m',
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.'],
    studios: ['Universal Pictures']
  },
  {
    title: 'Jurassic Park',
    releaseYear: 1993,
    type: 'MOVIE',
    language: 'English',
    genres: ['Universal Pictures', 'Action', 'Adventure', 'Sci-Fi'],
    rating: 8.2,
    description: 'A pragmatic paleontologist touring an almost complete theme park on an island in Central America is tasked with protecting a couple of kids after a power failure causes the park\'s cloned dinosaurs to run loose.',
    poster: 'https://images.metahub.space/poster/medium/tt0107290/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0107290/img',
    runtime: '2h 7m',
    director: 'Steven Spielberg',
    cast: ['Sam Neill', 'Laura Dern', 'Jeff Goldblum'],
    studios: ['Universal Pictures']
  },
  {
    title: 'Back to the Future',
    releaseYear: 1985,
    type: 'MOVIE',
    language: 'English',
    genres: ['Universal Pictures', 'Adventure', 'Comedy', 'Sci-Fi'],
    rating: 8.5,
    description: 'Marty McFly, a 17-year-old high school student, is accidentally sent 30 years into the past in a time-traveling DeLorean invented by his close friend, the eccentric scientist Doc Brown.',
    poster: 'https://images.metahub.space/poster/medium/tt0088763/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0088763/img',
    runtime: '1h 56m',
    director: 'Robert Zemeckis',
    cast: ['Michael J. Fox', 'Christopher Lloyd', 'Lea Thompson'],
    studios: ['Universal Pictures']
  },
  {
    title: 'Fast & Furious 7',
    releaseYear: 2015,
    type: 'MOVIE',
    language: 'English',
    genres: ['Universal Pictures', 'Action', 'Crime', 'Thriller'],
    rating: 7.1,
    description: 'Deckard Shaw seeks revenge against Dominic Toretto and his family for his comatose brother.',
    poster: 'https://images.metahub.space/poster/medium/tt2820852/img',
    backdrop: 'https://images.metahub.space/background/medium/tt2820852/img',
    runtime: '2h 17m',
    director: 'James Wan',
    cast: ['Vin Diesel', 'Paul Walker', 'Dwayne Johnson'],
    studios: ['Universal Pictures']
  },
  {
    title: 'Jaws',
    releaseYear: 1975,
    type: 'MOVIE',
    language: 'English',
    genres: ['Universal Pictures', 'Adventure', 'Mystery', 'Thriller'],
    rating: 8.1,
    description: 'When a killer shark unleashes chaos on a beach community off Cape Cod, it\'s up to a local sheriff, a marine biologist, and an old seafarer to hunt the beast down.',
    poster: 'https://images.metahub.space/poster/medium/tt0073195/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0073195/img',
    runtime: '2h 4m',
    director: 'Steven Spielberg',
    cast: ['Roy Scheider', 'Robert Shaw', 'Richard Dreyfuss'],
    studios: ['Universal Pictures']
  },
  {
    title: 'The Super Mario Bros. Movie',
    releaseYear: 2023,
    type: 'MOVIE',
    language: 'English',
    genres: ['Universal Pictures', 'Animation', 'Adventure', 'Comedy', 'Family'],
    rating: 7.0,
    description: 'A plumber named Mario travels through an underground labyrinth with his brother Luigi, trying to save a captured princess.',
    poster: 'https://images.metahub.space/poster/medium/tt6718170/img',
    backdrop: 'https://images.metahub.space/background/medium/tt6718170/img',
    runtime: '1h 32m',
    director: 'Aaron Horvath, Michael Jelenic',
    cast: ['Chris Pratt', 'Anya Taylor-Joy', 'Charlie Day', 'Jack Black'],
    studios: ['Universal Pictures']
  },
  {
    title: 'E.T. the Extra-Terrestrial',
    releaseYear: 1982,
    type: 'MOVIE',
    language: 'English',
    genres: ['Universal Pictures', 'Adventure', 'Family', 'Sci-Fi'],
    rating: 7.9,
    description: 'A troubled child summons the courage to help a friendly alien escape Earth and return to his home world.',
    poster: 'https://images.metahub.space/poster/medium/tt0083866/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0083866/img',
    runtime: '1h 55m',
    director: 'Steven Spielberg',
    cast: ['Henry Thomas', 'Drew Barrymore', 'Peter Coyote'],
    studios: ['Universal Pictures']
  },
  {
    title: 'Despicable Me',
    releaseYear: 2010,
    type: 'MOVIE',
    language: 'English',
    genres: ['Universal Pictures', 'Animation', 'Adventure', 'Comedy', 'Family'],
    rating: 7.6,
    description: 'When a criminal mastermind uses a trio of orphan girls as pawns for a grand scheme, he finds their love is profoundly changing him for the better.',
    poster: 'https://images.metahub.space/poster/medium/tt1323594/img',
    backdrop: 'https://images.metahub.space/background/medium/tt1323594/img',
    runtime: '1h 35m',
    director: 'Pierre Coffin, Chris Renaud',
    cast: ['Steve Carell', 'Jason Segel', 'Russell Brand'],
    studios: ['Universal Pictures']
  }
];

const UNIVERSAL_SERIES: StudioItemSeed[] = [
  {
    title: 'Brooklyn Nine-Nine',
    releaseYear: 2013,
    type: 'SERIES',
    language: 'English',
    genres: ['Universal Pictures', 'Comedy', 'Crime'],
    rating: 8.4,
    description: 'Comedy series following the exploits of Det. Jake Peralta and his diverse, lovable colleagues as they police the NYPD\'s 99th Precinct.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/347/869550.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2467372/img',
    director: 'Dan Goor, Michael Schur',
    cast: ['Andy Samberg', 'Stephanie Beatriz', 'Terry Crews'],
    studios: ['Universal Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Captain Ray Holt takes over the 99th precinct.', duration: '22m', durationSeconds: 1320, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/347/869550.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Parks and Recreation',
    releaseYear: 2009,
    type: 'SERIES',
    language: 'English',
    genres: ['Universal Pictures', 'Comedy'],
    rating: 8.6,
    description: 'The absurd antics of an Indiana town\'s public officials as they pursue diverse projects to make their city a better place.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/181/454283.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1266020/img',
    director: 'Greg Daniels, Michael Schur',
    cast: ['Amy Poehler', 'Nick Offerman', 'Chris Pratt'],
    studios: ['Universal Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Make-A-Pit', description: 'Leslie Knope tries to turn an abandoned construction pit into a park.', duration: '22m', durationSeconds: 1320, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/181/454283.jpg' }
        ]
      }
    ]
  },
  {
    title: 'House M.D.',
    releaseYear: 2004,
    type: 'SERIES',
    language: 'English',
    genres: ['Universal Pictures', 'Drama', 'Mystery'],
    rating: 8.7,
    description: 'An antisocial maverick doctor who specializes in diagnostic medicine does whatever it takes to solve puzzling cases that come his way using his crack team of doctors and his wits.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/148/371987.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0412142/img',
    director: 'David Shore',
    cast: ['Hugh Laurie', 'Omar Epps', 'Robert Sean Leonard'],
    studios: ['Universal Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Dr. Gregory House treats a young kindergarten teacher.', duration: '44m', durationSeconds: 2640, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/148/371987.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Bates Motel',
    releaseYear: 2013,
    type: 'SERIES',
    language: 'English',
    genres: ['Universal Pictures', 'Drama', 'Horror', 'Mystery', 'Thriller'],
    rating: 8.1,
    description: 'A contemporary prequel to Psycho, giving a portrayal of how Norman Bates\' psyche unravels through his teenage years, and how deeply intricate his relationship with his mother, Norma, truly is.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/100/250785.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2188671/img',
    director: 'Carlton Cuse, Kerry Ehrin',
    cast: ['Vera Farmiga', 'Freddie Highmore', 'Max Thieriot'],
    studios: ['Universal Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'First You Dream, Then You Die', description: 'Norma and Norman Bates buy a motel in White Pine Bay.', duration: '47m', durationSeconds: 2820, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/100/250785.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Suits',
    releaseYear: 2011,
    type: 'SERIES',
    language: 'English',
    genres: ['Universal Pictures', 'Comedy', 'Drama'],
    rating: 8.4,
    description: 'On the run from a drug deal gone bad, brilliant college-dropout Mike Ross finds himself working with Harvey Specter, one of New York City\'s top lawyers.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/198/496058.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1632701/img',
    director: 'Aaron Korsh',
    cast: ['Gabriel Macht', 'Patrick J. Adams', 'Meghan Markle'],
    studios: ['Universal Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Harvey Specter recruits brilliant college-dropout Mike Ross.', duration: '74m', durationSeconds: 4440, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/198/496058.jpg' }
        ]
      }
    ]
  },
  {
    title: 'The Good Place',
    releaseYear: 2016,
    type: 'SERIES',
    language: 'English',
    genres: ['Universal Pictures', 'Comedy', 'Fantasy'],
    rating: 8.2,
    description: 'Four people and their otherworldly mentor strive to define what it means to be good.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/209/523912.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4955642/img',
    director: 'Michael Schur',
    cast: ['Kristen Bell', 'Ted Danson', 'William Jackson Harper'],
    studios: ['Universal Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Eleanor Shellstrop arrives in the afterlife.', duration: '22m', durationSeconds: 1320, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/209/523912.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Monk',
    releaseYear: 2002,
    type: 'SERIES',
    language: 'English',
    genres: ['Universal Pictures', 'Comedy', 'Crime', 'Drama', 'Mystery'],
    rating: 8.1,
    description: 'Adrian Monk is a brilliant San Francisco detective, whose obsessive-compulsive disorder allows him to solve crimes while struggling with everyday fears.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/148/372076.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0314979/img',
    director: 'Andy Breckman',
    cast: ['Tony Shalhoub', 'Jason Gray-Stanford', 'Ted Levine'],
    studios: ['Universal Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Mr. Monk and the Candidate', description: 'Monk investigates an assassination attempt on a mayoral candidate.', duration: '44m', durationSeconds: 2640, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/148/372076.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Columbo',
    releaseYear: 1971,
    type: 'SERIES',
    language: 'English',
    genres: ['Universal Pictures', 'Crime', 'Drama', 'Mystery'],
    rating: 8.3,
    description: 'Los Angeles homicide detective Lieutenant Columbo uses his humble ways and ingenuous demeanor to winkle out even the most well-concealed of clues.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/26/65134.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0066697/img',
    director: 'Richard Levinson, William Link',
    cast: ['Peter Falk', 'Mike Lally', 'John Finnegan'],
    studios: ['Universal Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Murder by the Book', description: 'Columbo investigates the murder of a mystery author.', duration: '76m', durationSeconds: 4560, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/26/65134.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Friday Night Lights',
    releaseYear: 2006,
    type: 'SERIES',
    language: 'English',
    genres: ['Universal Pictures', 'Drama', 'Sport'],
    rating: 8.7,
    description: 'The trials and tribulations of small-town football players and their coach in Dillon, Texas, where college and NFL scouts are a daily presence.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/60/150143.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0758745/img',
    director: 'Peter Berg',
    cast: ['Kyle Chandler', 'Connie Britton', 'Aimee Teegarden'],
    studios: ['Universal Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Coach Eric Taylor leads the Dillon Panthers into the season.', duration: '44m', durationSeconds: 2640, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/60/150143.jpg' }
        ]
      }
    ]
  }
];

// ── 4. SONY PICTURES (Milestone 1) ───────────────────────────────────────────
const SONY_MOVIES: StudioItemSeed[] = [
  {
    title: 'Men in Black',
    releaseYear: 1997,
    type: 'MOVIE',
    language: 'English',
    genres: ['Sony Pictures', 'Action', 'Adventure', 'Comedy', 'Sci-Fi'],
    rating: 7.3,
    description: 'A police officer joins a secret organization that polices and monitors extraterrestrial interactions on Earth.',
    poster: 'https://images.metahub.space/poster/medium/tt0119654/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0119654/img',
    runtime: '1h 38m',
    director: 'Barry Sonnenfeld',
    cast: ['Tommy Lee Jones', 'Will Smith', 'Linda Fiorentino'],
    studios: ['Sony Pictures']
  },
  {
    title: 'Skyfall',
    releaseYear: 2012,
    type: 'MOVIE',
    language: 'English',
    genres: ['Sony Pictures', 'Action', 'Adventure', 'Thriller'],
    rating: 7.8,
    description: 'James Bond\'s loyalty to M is tested when her past comes back to haunt her. When MI6 comes under attack, 007 must track down and destroy the threat, no matter how personal the cost.',
    poster: 'https://images.metahub.space/poster/medium/tt1074638/img',
    backdrop: 'https://images.metahub.space/background/medium/tt1074638/img',
    runtime: '2h 23m',
    director: 'Sam Mendes',
    cast: ['Daniel Craig', 'Javier Bardem', 'Naomie Harris', 'Judi Dench'],
    studios: ['Sony Pictures']
  },
  {
    title: 'The Social Network',
    releaseYear: 2010,
    type: 'MOVIE',
    language: 'English',
    genres: ['Sony Pictures', 'Biography', 'Drama'],
    rating: 7.8,
    description: 'As Harvard student Mark Zuckerberg creates the social networking site that would become known as Facebook, he is sued by the twins who claimed he stole their idea, and by the co-founder who was later squeezed out.',
    poster: 'https://images.metahub.space/poster/medium/tt1285016/img',
    backdrop: 'https://images.metahub.space/background/medium/tt1285016/img',
    runtime: '2h 0m',
    director: 'David Fincher',
    cast: ['Jesse Eisenberg', 'Andrew Garfield', 'Justin Timberlake'],
    studios: ['Sony Pictures']
  },
  {
    title: 'Once Upon a Time in Hollywood',
    releaseYear: 2019,
    type: 'MOVIE',
    language: 'English',
    genres: ['Sony Pictures', 'Comedy', 'Drama'],
    rating: 7.6,
    description: 'A faded television actor and his stunt double strive to achieve fame and success in the film industry during the final years of Hollywood\'s Golden Age in 1969 Los Angeles.',
    poster: 'https://images.metahub.space/poster/medium/tt7131622/img',
    backdrop: 'https://images.metahub.space/background/medium/tt7131622/img',
    runtime: '2h 41m',
    director: 'Quentin Tarantino',
    cast: ['Leonardo DiCaprio', 'Brad Pitt', 'Margot Robbie'],
    studios: ['Sony Pictures']
  }
];

const SONY_SERIES: StudioItemSeed[] = [
  {
    title: 'Outlander',
    releaseYear: 2014,
    type: 'SERIES',
    language: 'English',
    genres: ['Sony Pictures', 'Drama', 'Fantasy', 'Romance'],
    rating: 8.4,
    description: 'Claire Randall, a married combat nurse from 1945, is mysteriously swept back in time to 1743 Scotland, where she is immediately thrown into an unknown world where her life is threatened.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/442/1105943.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt3006802/img',
    director: 'Ronald D. Moore',
    cast: ['Caitríona Balfe', 'Sam Heughan', 'Sophie Skelton'],
    studios: ['Sony Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Sassenach', description: 'Claire Randall travels through time to 1743.', duration: '64m', durationSeconds: 3840, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/442/1105943.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Cobra Kai',
    releaseYear: 2018,
    type: 'SERIES',
    language: 'English',
    genres: ['Sony Pictures', 'Action', 'Comedy', 'Drama'],
    rating: 8.5,
    description: 'Decades after their 1984 All Valley Karate Tournament bout, a middle-aged Daniel LaRusso and Johnny Lawrence find themselves martial-arts rivals again.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/423/1058222.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt7221388/img',
    director: 'Josh Heald, Jon Hurwitz, Hayden Schlossberg',
    cast: ['Ralph Macchio', 'William Zabka', 'Xolo Maridueña'],
    studios: ['Sony Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Ace Degenerate', description: 'Johnny Lawrence reopens the Cobra Kai dojo.', duration: '30m', durationSeconds: 1800, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/423/1058222.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Community',
    releaseYear: 2009,
    type: 'SERIES',
    language: 'English',
    genres: ['Sony Pictures', 'Comedy'],
    rating: 8.5,
    description: 'A suspended lawyer is forced to enroll in a community college with an eccentric staff and student body.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/1/3252.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1439629/img',
    director: 'Dan Harmon',
    cast: ['Joel McHale', 'Danny Pudi', 'Donald Glover', 'Alison Brie'],
    studios: ['Sony Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Jeff Winger forms a Spanish study group at Greendale.', duration: '25m', durationSeconds: 1500, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/1/3252.jpg' }
        ]
      }
    ]
  },
  {
    title: 'The Blacklist',
    releaseYear: 2013,
    type: 'SERIES',
    language: 'English',
    genres: ['Sony Pictures', 'Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.0,
    description: 'A new FBI profiler, Elizabeth Keen, has her entire life uprooted when a mysterious criminal, Raymond Reddington, who has eluded capture for decades, turns himself in and insists on speaking only to her.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/444/1111623.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2741602/img',
    director: 'Jon Bokenkamp',
    cast: ['James Spader', 'Megan Boone', 'Diego Klattenhoff'],
    studios: ['Sony Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'Raymond Reddington surrenders to the FBI.', duration: '44m', durationSeconds: 2640, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/444/1111623.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Justified',
    releaseYear: 2010,
    type: 'SERIES',
    language: 'English',
    genres: ['Sony Pictures', 'Action', 'Crime', 'Drama'],
    rating: 8.6,
    description: 'U.S. Marshal Raylan Givens is reassigned to his home state of Kentucky, where his 19th-century-style, lawman brand of justice puts a target on his back and puts him at odds with the criminals he used to know.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/469/1173775.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1489428/img',
    director: 'Graham Yost',
    cast: ['Timothy Olyphant', 'Nick Searcy', 'Walton Goggins'],
    studios: ['Sony Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Fire in the Hole', description: 'Raylan Givens returns to Harlan County.', duration: '46m', durationSeconds: 2760, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/469/1173775.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Hannibal',
    releaseYear: 2013,
    type: 'SERIES',
    language: 'English',
    genres: ['Sony Pictures', 'Crime', 'Drama', 'Horror', 'Mystery', 'Thriller'],
    rating: 8.5,
    description: 'Explores the early relationship between renowned psychiatrist Hannibal Lecter and a young FBI criminal profiler who is haunted by his ability to empathize with serial killers.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/1/3282.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2243973/img',
    director: 'Bryan Fuller',
    cast: ['Hugh Dancy', 'Mads Mikkelsen', 'Laurence Fishburne'],
    studios: ['Sony Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Apéritif', description: 'Will Graham consults with Dr. Hannibal Lecter on a series of disappearances.', duration: '44m', durationSeconds: 2640, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/1/3282.jpg' }
        ]
      }
    ]
  }
];

// ── 5. PARAMOUNT PICTURES (Milestone 1) ───────────────────────────────────────
const PARAMOUNT_MOVIES: StudioItemSeed[] = [
  {
    title: 'Titanic',
    releaseYear: 1997,
    type: 'MOVIE',
    language: 'English',
    genres: ['Paramount Pictures', 'Drama', 'Romance'],
    rating: 7.9,
    description: 'A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic.',
    poster: 'https://images.metahub.space/poster/medium/tt0120338/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0120338/img',
    runtime: '3h 14m',
    director: 'James Cameron',
    cast: ['Leonardo DiCaprio', 'Kate Winslet', 'Billy Zane'],
    studios: ['Paramount Pictures']
  },
  {
    title: 'Top Gun: Maverick',
    releaseYear: 2022,
    type: 'MOVIE',
    language: 'English',
    genres: ['Paramount Pictures', 'Action', 'Drama'],
    rating: 8.3,
    description: 'After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he leads TOP GUN\'s elite graduates on a mission that demands the ultimate sacrifice from those chosen to fly it.',
    poster: 'https://images.metahub.space/poster/medium/tt1745960/img',
    backdrop: 'https://images.metahub.space/background/medium/tt1745960/img',
    runtime: '2h 10m',
    director: 'Joseph Kosinski',
    cast: ['Tom Cruise', 'Miles Teller', 'Jennifer Connelly'],
    studios: ['Paramount Pictures']
  },
  {
    title: 'Mission: Impossible - Fallout',
    releaseYear: 2018,
    type: 'MOVIE',
    language: 'English',
    genres: ['Paramount Pictures', 'Action', 'Adventure', 'Thriller'],
    rating: 7.7,
    description: 'Ethan Hunt and his IMF team, along with some familiar allies, race against time after a mission gone wrong.',
    poster: 'https://images.metahub.space/poster/medium/tt4633694/img',
    backdrop: 'https://images.metahub.space/background/medium/tt4633694/img',
    runtime: '2h 27m',
    director: 'Christopher McQuarrie',
    cast: ['Tom Cruise', 'Henry Cavill', 'Ving Rhames', 'Simon Pegg'],
    studios: ['Paramount Pictures']
  },
  {
    title: 'Raiders of the Lost Ark',
    releaseYear: 1981,
    type: 'MOVIE',
    language: 'English',
    genres: ['Paramount Pictures', 'Action', 'Adventure'],
    rating: 8.4,
    description: 'In 1936, archaeologist and adventurer Indiana Jones is hired by the U.S. government to find the Ark of the Covenant before the Nazis can obtain its awesome powers.',
    poster: 'https://images.metahub.space/poster/medium/tt0082971/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0082971/img',
    runtime: '1h 55m',
    director: 'Steven Spielberg',
    cast: ['Harrison Ford', 'Karen Allen', 'Paul Freeman'],
    studios: ['Paramount Pictures']
  },
  {
    title: 'Shutter Island',
    releaseYear: 2010,
    type: 'MOVIE',
    language: 'English',
    genres: ['Paramount Pictures', 'Mystery', 'Thriller'],
    rating: 8.2,
    description: 'In 1954, a U.S. Marshal investigates the disappearance of a murderer who escaped from a hospital for the criminally insane on a remote windswept island.',
    poster: 'https://images.metahub.space/poster/medium/tt1130884/img',
    backdrop: 'https://images.metahub.space/background/medium/tt1130884/img',
    runtime: '2h 18m',
    director: 'Martin Scorsese',
    cast: ['Leonardo DiCaprio', 'Mark Ruffalo', 'Ben Kingsley'],
    studios: ['Paramount Pictures']
  },
  {
    title: 'The Wolf of Wall Street',
    releaseYear: 2013,
    type: 'MOVIE',
    language: 'English',
    genres: ['Paramount Pictures', 'Biography', 'Comedy', 'Crime'],
    rating: 8.2,
    description: 'Based on the true story of Jordan Belfort, from his rise to a wealthy stock-broker living the high life to his fall involving crime, corruption and the federal government.',
    poster: 'https://images.metahub.space/poster/medium/tt0993846/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0993846/img',
    runtime: '3h 0m',
    director: 'Martin Scorsese',
    cast: ['Leonardo DiCaprio', 'Jonah Hill', 'Margot Robbie'],
    studios: ['Paramount Pictures']
  }
];

const PARAMOUNT_SERIES: StudioItemSeed[] = [
  {
    title: 'Yellowstone',
    releaseYear: 2018,
    type: 'SERIES',
    language: 'English',
    genres: ['Paramount Pictures', 'Drama', 'Western'],
    rating: 8.7,
    description: 'A ranching family in Montana faces off against others encroaching on their land.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/433/1083981.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4236770/img',
    director: 'Taylor Sheridan, John Linson',
    cast: ['Kevin Costner', 'Luke Grimes', 'Kelly Reilly'],
    studios: ['Paramount Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Daybreak', description: 'John Dutton protects his ranch from outside forces.', duration: '92m', durationSeconds: 5520, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/433/1083981.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Tulsa King',
    releaseYear: 2022,
    type: 'SERIES',
    language: 'English',
    genres: ['Paramount Pictures', 'Crime', 'Drama'],
    rating: 8.0,
    description: 'Following his release from prison, Mafia capo Dwight "The General" Manfredi is exiled to Tulsa, Oklahoma, where he builds a new criminal empire with a group of unlikely characters.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/434/1085203.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt16358384/img',
    director: 'Taylor Sheridan',
    cast: ['Sylvester Stallone', 'Andrea Savage', 'Martin Starr'],
    studios: ['Paramount Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Go West, Old Man', description: 'Dwight Manfredi is released from prison and sent to Tulsa.', duration: '41m', durationSeconds: 2460, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/434/1085203.jpg' }
        ]
      }
    ]
  },
  {
    title: '1883',
    releaseYear: 2021,
    type: 'SERIES',
    language: 'English',
    genres: ['Paramount Pictures', 'Drama', 'Western'],
    rating: 8.7,
    description: 'Follows the Dutton family on a journey west through the Great Plains toward the last bastion of untamed America.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/378/947477.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt13991232/img',
    director: 'Taylor Sheridan',
    cast: ['Sam Elliott', 'Tim McGraw', 'Faith Hill'],
    studios: ['Paramount Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: '1883', description: 'The Dutton family embarks on their western journey.', duration: '66m', durationSeconds: 3960, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/378/947477.jpg' }
        ]
      }
    ]
  },
  {
    title: '1923',
    releaseYear: 2022,
    type: 'SERIES',
    language: 'English',
    genres: ['Paramount Pictures', 'Drama', 'Western'],
    rating: 8.4,
    description: 'The Duttons face a new set of challenges in the early 20th century, including the rise of Western expansion, Prohibition, and the Great Depression.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/438/1097241.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt18335752/img',
    director: 'Taylor Sheridan',
    cast: ['Harrison Ford', 'Helen Mirren', 'Brandon Sklenar'],
    studios: ['Paramount Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: '1923', description: 'Jacob and Cara Dutton face drought and range wars.', duration: '67m', durationSeconds: 4020, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/438/1097241.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Mayor of Kingstown',
    releaseYear: 2021,
    type: 'SERIES',
    language: 'English',
    genres: ['Paramount Pictures', 'Crime', 'Drama', 'Thriller'],
    rating: 8.2,
    description: 'The McLusky family are power brokers in Kingstown, Michigan, where the business of incarceration is the only thriving industry.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/442/1107297.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt11712058/img',
    director: 'Hugh Dillon, Taylor Sheridan',
    cast: ['Jeremy Renner', 'Dianne Wiest', 'Hugh Dillon'],
    studios: ['Paramount Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'The Mayor of Kingstown', description: 'Mitch and Mike McLusky broker peace between gangs and guards.', duration: '66m', durationSeconds: 3960, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/442/1107297.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Halo',
    releaseYear: 2022,
    type: 'SERIES',
    language: 'English',
    genres: ['Paramount Pictures', 'Action', 'Adventure', 'Sci-Fi'],
    rating: 7.3,
    description: 'Aliens threaten human existence in an epic 26th-century showdown. TV series based on the video game \'Halo\'.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/400/1000672.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2934286/img',
    director: 'Steven Kane, Kyle Killen',
    cast: ['Pablo Schreiber', 'Shabana Azmi', 'Natascha McElhone'],
    studios: ['Paramount Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Contact', description: 'Master Chief John-117 discovers a Covenant artifact on Madrigal.', duration: '58m', durationSeconds: 3480, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/400/1000672.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Star Trek: Strange New Worlds',
    releaseYear: 2022,
    type: 'SERIES',
    language: 'English',
    genres: ['Paramount Pictures', 'Action', 'Adventure', 'Sci-Fi'],
    rating: 8.3,
    description: 'A prequel to Star Trek: The Original Series, following the crew of the USS Enterprise under the command of Captain Christopher Pike.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/458/1146200.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt12327578/img',
    director: 'Akiva Goldsman, Alex Kurtzman',
    cast: ['Anson Mount', 'Ethan Peck', 'Jess Bush'],
    studios: ['Paramount Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Strange New Worlds', description: 'Captain Pike comes out of self-imposed exile.', duration: '53m', durationSeconds: 3180, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/458/1146200.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Star Trek: The Next Generation',
    releaseYear: 1987,
    type: 'SERIES',
    language: 'English',
    genres: ['Paramount Pictures', 'Action', 'Adventure', 'Sci-Fi'],
    rating: 8.7,
    description: 'Set almost 100 years after Captain Kirk\'s five-year mission, a new generation of Starfleet officers sets off in the U.S.S. Enterprise-D on its own mission to go where no one has gone before.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/148/371900.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0092455/img',
    director: 'Gene Roddenberry',
    cast: ['Patrick Stewart', 'Brent Spiner', 'Jonathan Frakes'],
    studios: ['Paramount Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Encounter at Farpoint', description: 'Captain Picard and the crew face the enigmatic Q.', duration: '90m', durationSeconds: 5400, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/148/371900.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Dexter',
    releaseYear: 2006,
    type: 'SERIES',
    language: 'English',
    genres: ['Paramount Pictures', 'Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.6,
    description: 'A Miami-based blood spatter analyst for the police department leads a secret parallel life as a vigilante serial killer, hunting down the murderers who have slipped through the cracks of the justice system.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/148/371804.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0773262/img',
    director: 'James Manos Jr.',
    cast: ['Michael C. Hall', 'Jennifer Carpenter', 'David Zayas'],
    studios: ['Paramount Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Dexter', description: 'Dexter Morgan balances life as a blood spatter analyst and vigilante.', duration: '53m', durationSeconds: 3180, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/148/371804.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Homeland',
    releaseYear: 2011,
    type: 'SERIES',
    language: 'English',
    genres: ['Paramount Pictures', 'Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.3,
    description: 'A bipolar CIA operative becomes convinced a prisoner of war has been turned by al-Qaeda and is planning to carry out a terrorist attack on American soil.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/238/595963.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1796960/img',
    director: 'Alex Gansa, Howard Gordon',
    cast: ['Claire Danes', 'Mandy Patinkin', 'Damian Lewis'],
    studios: ['Paramount Pictures'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Pilot', description: 'CIA officer Carrie Mathison investigates Sgt. Nicholas Brody.', duration: '55m', durationSeconds: 3300, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/238/595963.jpg' }
        ]
      }
    ]
  }
];

// ── 6. DISNEY (Milestone 1) ──────────────────────────────────────────────────
const DISNEY_MOVIES: StudioItemSeed[] = [
  {
    title: 'The Lion King',
    releaseYear: 1994,
    type: 'MOVIE',
    language: 'English',
    genres: ['Disney', 'Animation', 'Adventure', 'Drama', 'Family', 'Musical'],
    rating: 8.5,
    description: 'Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.',
    poster: 'https://images.metahub.space/poster/medium/tt0110357/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0110357/img',
    runtime: '1h 28m',
    director: 'Roger Allers, Rob Minkoff',
    cast: ['Matthew Broderick', 'Jeremy Irons', 'James Earl Jones'],
    studios: ['Disney']
  },
  {
    title: 'Aladdin',
    releaseYear: 1992,
    type: 'MOVIE',
    language: 'English',
    genres: ['Disney', 'Animation', 'Adventure', 'Comedy', 'Family', 'Fantasy', 'Musical'],
    rating: 8.0,
    description: 'A kind-hearted street urchin and a power-hungry Grand Vizier vie for a magic lamp that has the power to make their deepest wishes come true.',
    poster: 'https://images.metahub.space/poster/medium/tt0103639/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0103639/img',
    runtime: '1h 30m',
    director: 'Ron Clements, John Musker',
    cast: ['Scott Weinger', 'Robin Williams', 'Linda Larkin'],
    studios: ['Disney']
  },
  {
    title: 'Beauty and the Beast',
    releaseYear: 1991,
    type: 'MOVIE',
    language: 'English',
    genres: ['Disney', 'Animation', 'Family', 'Fantasy', 'Musical', 'Romance'],
    rating: 8.0,
    description: 'A prince cursed to spend his days as a hideous monster sets out to regain his humanity by earning a young woman\'s love.',
    poster: 'https://images.metahub.space/poster/medium/tt0101414/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0101414/img',
    runtime: '1h 24m',
    director: 'Gary Trousdale, Kirk Wise',
    cast: ['Paige O\'Hara', 'Robby Benson', 'Richard White'],
    studios: ['Disney']
  },
  {
    title: 'Frozen',
    releaseYear: 2013,
    type: 'MOVIE',
    language: 'English',
    genres: ['Disney', 'Animation', 'Adventure', 'Comedy', 'Family', 'Fantasy', 'Musical'],
    rating: 7.4,
    description: 'When the newly crowned Queen Elsa accidentally uses her power to turn things into ice to curse her home in infinite winter, her sister Anna teams up with a mountain man, his playful reindeer, and a snowman to change the weather condition.',
    poster: 'https://images.metahub.space/poster/medium/tt2294629/img',
    backdrop: 'https://images.metahub.space/background/medium/tt2294629/img',
    runtime: '1h 42m',
    director: 'Chris Buck, Jennifer Lee',
    cast: ['Kristen Bell', 'Idina Menzel', 'Jonathan Groff'],
    studios: ['Disney']
  },
  {
    title: 'Pirates of the Caribbean: The Curse of the Black Pearl',
    releaseYear: 2003,
    type: 'MOVIE',
    language: 'English',
    genres: ['Disney', 'Action', 'Adventure', 'Fantasy'],
    rating: 8.1,
    description: 'Blacksmith Will Turner teams up with eccentric pirate "Captain" Jack Sparrow to save his love, the governor\'s daughter, from Jack\'s former pirate allies, who are now undead.',
    poster: 'https://images.metahub.space/poster/medium/tt0325980/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0325980/img',
    runtime: '2h 23m',
    director: 'Gore Verbinski',
    cast: ['Johnny Depp', 'Geoffrey Rush', 'Orlando Bloom', 'Keira Knightley'],
    studios: ['Disney']
  },
  {
    title: 'Moana',
    releaseYear: 2016,
    type: 'MOVIE',
    language: 'English',
    genres: ['Disney', 'Animation', 'Adventure', 'Comedy', 'Family', 'Fantasy', 'Musical'],
    rating: 7.6,
    description: 'In Ancient Polynesia, when a terrible curse incurred by the Demigod Maui reaches Moana\'s island, she answers the Ocean\'s call to seek out the Demigod to set things right.',
    poster: 'https://images.metahub.space/poster/medium/tt3521164/img',
    backdrop: 'https://images.metahub.space/background/medium/tt3521164/img',
    runtime: '1h 47m',
    director: 'Ron Clements, John Musker',
    cast: ['Auli\'i Cravalho', 'Dwayne Johnson', 'Rachel House'],
    studios: ['Disney']
  },
  {
    title: 'Toy Story',
    releaseYear: 1995,
    type: 'MOVIE',
    language: 'English',
    genres: ['Disney', 'Animation', 'Adventure', 'Comedy', 'Family', 'Fantasy'],
    rating: 8.3,
    description: 'A cowboy doll is profoundly threatened and jealous when a new spaceman action figure supplants him as top toy in a boy\'s bedroom.',
    poster: 'https://images.metahub.space/poster/medium/tt0114709/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0114709/img',
    runtime: '1h 21m',
    director: 'John Lasseter',
    cast: ['Tom Hanks', 'Tim Allen', 'Don Rickles'],
    studios: ['Disney']
  },
  {
    title: 'Coco',
    releaseYear: 2017,
    type: 'MOVIE',
    language: 'English',
    genres: ['Disney', 'Animation', 'Adventure', 'Comedy', 'Family', 'Fantasy', 'Music'],
    rating: 8.4,
    description: 'Aspiring musician Miguel, confronted with his family\'s ancestral ban on music, enters the Land of the Dead to find his great-great-grandfather, a legendary singer.',
    poster: 'https://images.metahub.space/poster/medium/tt2380307/img',
    backdrop: 'https://images.metahub.space/background/medium/tt2380307/img',
    runtime: '1h 45m',
    director: 'Lee Unkrich, Adrian Molina',
    cast: ['Anthony Gonzalez', 'Gael García Bernal', 'Benjamin Bratt'],
    studios: ['Disney']
  },
  {
    title: 'Finding Nemo',
    releaseYear: 2003,
    type: 'MOVIE',
    language: 'English',
    genres: ['Disney', 'Animation', 'Adventure', 'Comedy', 'Family'],
    rating: 8.2,
    description: 'After his son is captured in the Great Barrier Reef and taken to Sydney, a timid clownfish sets out on a journey to bring him home.',
    poster: 'https://images.metahub.space/poster/medium/tt0266543/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0266543/img',
    runtime: '1h 40m',
    director: 'Andrew Stanton, Lee Unkrich',
    cast: ['Albert Brooks', 'Ellen DeGeneres', 'Alexander Gould'],
    studios: ['Disney']
  },
  {
    title: 'Tangled',
    releaseYear: 2010,
    type: 'MOVIE',
    language: 'English',
    genres: ['Disney', 'Animation', 'Adventure', 'Comedy', 'Family', 'Fantasy', 'Musical'],
    rating: 7.7,
    description: 'The magically long-haired Rapunzel has spent her entire life in a tower, but now that a runaway thief has stumbled upon her, she is about to discover the world for the first time, and who she really is.',
    poster: 'https://images.metahub.space/poster/medium/tt0398286/img',
    backdrop: 'https://images.metahub.space/background/medium/tt0398286/img',
    runtime: '1h 40m',
    director: 'Nathan Greno, Byron Howard',
    cast: ['Mandy Moore', 'Zachary Levi', 'Donna Murphy'],
    studios: ['Disney']
  }
];

const DISNEY_SERIES: StudioItemSeed[] = [
  {
    title: 'The Mandalorian',
    releaseYear: 2019,
    type: 'SERIES',
    language: 'English',
    genres: ['Disney', 'Action', 'Adventure', 'Sci-Fi'],
    rating: 8.7,
    description: 'The travels of a lone bounty hunter in the outer reaches of the galaxy, far from the authority of the New Republic.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/442/1105942.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8111088/img',
    director: 'Jon Favreau',
    cast: ['Pedro Pascal', 'Carl Weathers', 'Giancarlo Esposito'],
    studios: ['Disney'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Chapter 1: The Mandalorian', description: 'A Mandalorian bounty hunter tracks a target for a well-paying client.', duration: '39m', durationSeconds: 2340, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/442/1105942.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Andor',
    releaseYear: 2022,
    type: 'SERIES',
    language: 'English',
    genres: ['Disney', 'Action', 'Adventure', 'Drama', 'Sci-Fi', 'Thriller'],
    rating: 8.4,
    description: 'Prequel series to Star Wars\' \'Rogue One\'. In an era filled with danger, deception and intrigue, Cassian will embark on the path that is destined to turn him into a Rebel hero.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/423/1058223.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9253284/img',
    director: 'Tony Gilroy',
    cast: ['Diego Luna', 'Kyle Soller', 'Stellan Skarsgård'],
    studios: ['Disney'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Kassa', description: 'Cassian Andor\'s search for his past makes him a target of Pre-Mor Authority.', duration: '39m', durationSeconds: 2340, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/423/1058223.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Obi-Wan Kenobi',
    releaseYear: 2022,
    type: 'SERIES',
    language: 'English',
    genres: ['Disney', 'Action', 'Adventure', 'Sci-Fi'],
    rating: 7.1,
    description: 'Jedi Master Obi-Wan Kenobi has to save young Leia after she is kidnapped, all the while being pursued by Imperial Inquisitors and his former Padawan, now known as Darth Vader.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/406/1017387.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8466564/img',
    director: 'Deborah Chow',
    cast: ['Ewan McGregor', 'Moses Ingram', 'Vivien Lyra Blair', 'Hayden Christensen'],
    studios: ['Disney'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Part I', description: 'Obi-Wan lives in hiding on Tatooine while watching over Luke Skywalker.', duration: '53m', durationSeconds: 3180, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/406/1017387.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Ahsoka',
    releaseYear: 2023,
    type: 'SERIES',
    language: 'English',
    genres: ['Disney', 'Action', 'Adventure', 'Drama', 'Fantasy', 'Sci-Fi'],
    rating: 7.5,
    description: 'After the fall of the Galactic Empire, former Jedi Knight Ahsoka Tano investigates an emerging threat to a vulnerable galaxy.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/472/1181283.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt13622776/img',
    director: 'Dave Filoni',
    cast: ['Rosario Dawson', 'Natasha Liu Bordizzo', 'Mary Elizabeth Winstead'],
    studios: ['Disney'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Part One: Master and Apprentice', description: 'Ahsoka investigates the secret return of Grand Admiral Thrawn.', duration: '54m', durationSeconds: 3240, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/472/1181283.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Percy Jackson and the Olympians',
    releaseYear: 2023,
    type: 'SERIES',
    language: 'English',
    genres: ['Disney', 'Action', 'Adventure', 'Family', 'Fantasy'],
    rating: 7.2,
    description: 'Demigod Percy Jackson leads a quest across America to prevent a war among the Olympian gods.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/487/1218552.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt12324366/img',
    director: 'Rick Riordan, Jonathan E. Steinberg',
    cast: ['Walker Scobell', 'Leah Jeffries', 'Aryan Simhadri'],
    studios: ['Disney'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'I Accidentally Vaporize My Pre-Algebra Teacher', description: 'Percy discovers the truth about his heritage.', duration: '38m', durationSeconds: 2280, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/487/1218552.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Gravity Falls',
    releaseYear: 2012,
    type: 'SERIES',
    language: 'English',
    genres: ['Disney', 'Animation', 'Adventure', 'Comedy', 'Family', 'Fantasy', 'Mystery', 'Sci-Fi'],
    rating: 8.9,
    description: 'Twin brother and sister Dipper and Mabel Pines are in for an unexpected adventure when they spend the summer helping their great uncle Stan run a tourist trap in the mysterious town of Gravity Falls, Oregon.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/1/4096.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1865718/img',
    director: 'Alex Hirsch',
    cast: ['Jason Ritter', 'Alex Hirsch', 'Kristen Schaal'],
    studios: ['Disney'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Tourist Trapped', description: 'Dipper and Mabel Pines arrive in Gravity Falls.', duration: '22m', durationSeconds: 1320, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/1/4096.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Phineas and Ferb',
    releaseYear: 2007,
    type: 'SERIES',
    language: 'English',
    genres: ['Disney', 'Animation', 'Action', 'Comedy', 'Family', 'Musical', 'Sci-Fi'],
    rating: 8.1,
    description: 'Stepbrothers Phineas and Ferb determine to make each day of summer vacation count, while their pet platypus leads a double life as a secret agent.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/1/4097.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0852863/img',
    director: 'Dan Povenmire, Jeff "Swampy" Marsh',
    cast: ['Vincent Martella', 'Thomas Brodie-Sangster', 'Ashley Tisdale'],
    studios: ['Disney'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Rollercoaster', description: 'Phineas and Ferb build a giant rollercoaster.', duration: '22m', durationSeconds: 1320, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/1/4097.jpg' }
        ]
      }
    ]
  },
  {
    title: 'DuckTales',
    releaseYear: 2017,
    type: 'SERIES',
    language: 'English',
    genres: ['Disney', 'Animation', 'Action', 'Adventure', 'Comedy', 'Family', 'Fantasy', 'Sci-Fi'],
    rating: 8.2,
    description: 'The comedy-adventure series chronicles the high-flying adventures of Duckburg\'s most famous trillionaire Scrooge McDuck, his mischievous triplet grandnephews Huey, Dewey, and Louie, and temperamental nephew Donald Duck.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/124/311956.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt5531466/img',
    director: 'Francisco Angones, Matt Youngberg',
    cast: ['David Tennant', 'Ben Schwartz', 'Danny Pudi', 'Bobby Moynihan'],
    studios: ['Disney'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Woo-oo!', description: 'Donald Duck takes his nephews to meet their great-uncle Scrooge McDuck.', duration: '44m', durationSeconds: 2640, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/124/311956.jpg' }
        ]
      }
    ]
  },
  {
    title: 'Star Wars: The Clone Wars',
    releaseYear: 2008,
    type: 'SERIES',
    language: 'English',
    genres: ['Disney', 'Animation', 'Action', 'Adventure', 'Drama', 'Fantasy', 'Sci-Fi'],
    rating: 8.4,
    description: 'Jedi Knights lead the Grand Army of the Republic against the droid armies of the Separatists.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/238/595962.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1185834/img',
    director: 'Dave Filoni',
    cast: ['Tom Kane', 'Dee Bradley Baker', 'Matt Lanter', 'James Arnold Taylor'],
    studios: ['Disney'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'Ambush', description: 'Jedi Master Yoda is on a secret mission.', duration: '22m', durationSeconds: 1320, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/238/595962.jpg' }
        ]
      }
    ]
  },
  {
    title: 'High School Musical: The Musical: The Series',
    releaseYear: 2019,
    type: 'SERIES',
    language: 'English',
    genres: ['Disney', 'Comedy', 'Drama', 'Musical'],
    rating: 7.1,
    description: 'The students of East High stage a production of High School Musical for their school\'s theater production.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/385/964319.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8510382/img',
    director: 'Tim Federle',
    cast: ['Olivia Rodrigo', 'Joshua Bassett', 'Matt Cornett'],
    studios: ['Disney'],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          { episodeNumber: 1, title: 'The Auditions', description: 'East High students audition for High School Musical: The Musical.', duration: '31m', durationSeconds: 1860, thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/385/964319.jpg' }
        ]
      }
    ]
  }
];

// ── Helper to tag content with studios ────────────────────────────────────────
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

async function run() {
  const db = getAdapter();
  console.log('=== STARTING EXTENDED STUDIOS & SPIDER-MAN SEED ===\n');

  // A. Tag existing catalog items with appropriate studios
  const EXISTING_STUDIO_TAGS: { title: string; studios: string[] }[] = [
    // Warner Bros.
    { title: 'Inception', studios: ['Warner Bros.'] },
    { title: 'The Matrix', studios: ['Warner Bros.'] },
    { title: 'Interstellar', studios: ['Warner Bros.', 'Paramount Pictures'] },
    { title: 'The Dark Knight', studios: ['Warner Bros.', 'DC'] },
    { title: 'The Batman', studios: ['Warner Bros.', 'DC'] },
    { title: 'The Dark Knight Rises', studios: ['Warner Bros.', 'DC'] },
    { title: 'Friends', studios: ['Warner Bros.'] },
    { title: 'The Flash', studios: ['Warner Bros.', 'DC'] },
    { title: 'Arrow', studios: ['Warner Bros.', 'DC'] },
    { title: 'Lucifer', studios: ['Warner Bros.', 'DC'] },
    { title: 'Westworld', studios: ['Warner Bros.', 'HBO'] },
    { title: 'Succession', studios: ['Warner Bros.', 'HBO'] },
    { title: 'Chernobyl', studios: ['Warner Bros.', 'HBO'] },
    // Universal Pictures
    { title: 'Gladiator', studios: ['Universal Pictures', 'DreamWorks'] },
    { title: 'Schindler\'s List', studios: ['Universal Pictures'] },
    { title: 'The Office', studios: ['Universal Pictures'] },
    // Sony Pictures
    { title: 'Breaking Bad', studios: ['Sony Pictures'] },
    { title: 'Better Call Saul', studios: ['Sony Pictures'] },
    { title: 'The Boys', studios: ['Sony Pictures'] },
    { title: 'The Crown', studios: ['Sony Pictures'] },
    { title: 'Spider-Man: Into the Spider-Verse', studios: ['Spider-Man', 'Sony Pictures', 'Marvel'] },
    { title: 'Spider-Man: No Way Home', studios: ['Spider-Man', 'Sony Pictures', 'Marvel'] },
    // Paramount Pictures
    { title: 'The Godfather', studios: ['Paramount Pictures'] },
    { title: 'The Godfather Part II', studios: ['Paramount Pictures'] },
    { title: 'Forrest Gump', studios: ['Paramount Pictures'] }
  ];

  for (const item of EXISTING_STUDIO_TAGS) {
    const { rows } = await db.query('SELECT id FROM content WHERE LOWER(title) = LOWER(?);', [item.title]);
    if (rows[0]?.id) {
      for (const st of item.studios) {
        await tagWithGenre(rows[0].id, st);
      }
      console.log(`Tagged existing item "${item.title}" with [${item.studios.join(', ')}]`);
    }
  }

  // B. Add all new studio items
  const ALL_NEW_ITEMS: StudioItemSeed[] = [
    ...SPIDERMAN_MOVIES,
    ...WARNER_BROS_MOVIES,
    ...WARNER_BROS_SERIES,
    ...UNIVERSAL_MOVIES,
    ...UNIVERSAL_SERIES,
    ...SONY_MOVIES,
    ...SONY_SERIES,
    ...PARAMOUNT_MOVIES,
    ...PARAMOUNT_SERIES,
    ...DISNEY_MOVIES,
    ...DISNEY_SERIES
  ];

  let addedCount = 0;
  let skippedCount = 0;

  for (const item of ALL_NEW_ITEMS) {
    const { rows: existing } = await db.query(
      'SELECT id FROM content WHERE LOWER(title) = LOWER(?) AND type = ?;',
      [item.title, item.type]
    );

    if (existing && existing.length > 0) {
      console.log(`[SKIPPED DUPLICATE] "${item.title}" (${item.type}) already exists.`);
      skippedCount++;
      for (const st of item.studios) {
        await tagWithGenre(existing[0].id, st);
      }
      continue;
    }

    try {
      const result = await metadataImportService.importContent(item);
      for (const st of item.studios) {
        await tagWithGenre(result.contentId, st);
      }
      addedCount++;
      console.log(`[ADDED] ${item.studios[0]} ${item.type}: "${item.title}" (${item.releaseYear})`);
    } catch (err: any) {
      console.error(`Failed to import "${item.title}":`, err.message);
    }
  }

  console.log('\n==================================================');
  console.log(`STUDIO EXPANSION COMPLETE! Added: ${addedCount}, Skipped: ${skippedCount}`);
  console.log('==================================================');

  // Verify counts for each collection
  const studiosToCheck = [
    'Marvel',
    'DC',
    'HBO',
    'Warner Bros.',
    'Universal Pictures',
    'Sony Pictures',
    'Paramount Pictures',
    'Disney',
    'Spider-Man'
  ];

  console.log('\n--- VERIFIED STUDIO / FRANCHISE COLLECTION COUNTS ---');
  for (const st of studiosToCheck) {
    const { rows } = await db.query(
      `SELECT c.title, c.type FROM content c
       JOIN content_genres cg ON c.id = cg.content_id
       JOIN genres g ON cg.genre_id = g.id
       WHERE LOWER(g.name) = LOWER(?) ORDER BY c.type, c.title;`,
      [st]
    );
    const movies = rows.filter((r: any) => r.type === 'MOVIE').length;
    const series = rows.filter((r: any) => r.type === 'SERIES').length;
    console.log(`- ${st}: ${rows.length} total (Movies: ${movies}, Series: ${series})`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
