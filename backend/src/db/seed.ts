import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDatabase, runTransaction } from './connection.js';
import { config } from '../config/env.js';

// Royalty-free open demo video URLs
const DEMO_VIDEO_1 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";
const DEMO_VIDEO_2 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const DEMO_VIDEO_3 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";

export interface SeedReport {
  genresCount: number;
  contentCount: number;
  seasonsCount: number;
  episodesCount: number;
  adminCreated: boolean;
  adminEmail?: string;
  adminGeneratedPassword?: string;
}

export function seedDatabase(): SeedReport {
  const db = getDatabase();
  const now = new Date().toISOString();

  let adminCreated = false;
  let adminGeneratedPassword: string | undefined;

  runTransaction(txDb => {
    // ------------------------------------------------------------------------
    // 1. SEED GENRES
    // ------------------------------------------------------------------------
    const genres = [
      { id: 'genre-drama', name: 'Drama', slug: 'drama' },
      { id: 'genre-indie', name: 'Indie', slug: 'indie' },
      { id: 'genre-mystery', name: 'Mystery', slug: 'mystery' },
      { id: 'genre-thriller', name: 'Thriller', slug: 'thriller' },
      { id: 'genre-crime', name: 'Crime', slug: 'crime' },
      { id: 'genre-scifi', name: 'Sci-Fi', slug: 'sci-fi' },
      { id: 'genre-documentary', name: 'Documentary', slug: 'documentary' },
      { id: 'genre-nature', name: 'Nature', slug: 'nature' },
      { id: 'genre-action', name: 'Action', slug: 'action' },
      { id: 'genre-romance', name: 'Romance', slug: 'romance' },
      { id: 'genre-comedy', name: 'Comedy', slug: 'comedy' },
      { id: 'genre-adventure', name: 'Adventure', slug: 'adventure' },
      { id: 'genre-biography', name: 'Biography', slug: 'biography' },
      { id: 'genre-history', name: 'History', slug: 'history' }
    ];

    const insertGenre = txDb.prepare(`
      INSERT OR IGNORE INTO genres (id, name, slug)
      VALUES (?, ?, ?);
    `);

    for (const g of genres) {
      insertGenre.run(g.id, g.name, g.slug);
    }

    // ------------------------------------------------------------------------
    // 2. SEED DEMO CATALOG (Movies & Series)
    // ------------------------------------------------------------------------
    const catalogItems = [
      {
        id: 'afterglow-2025',
        type: 'MOVIE',
        title: 'Afterglow',
        slug: 'afterglow-2025',
        category_label: 'FEATURED PREMIERE',
        tagline: 'One last story waiting in the light between two monsoons.',
        description: 'A celebrated photographer returns to the city she left behind and finds one last story waiting in the light between two monsoons.',
        about: 'Shot with vintage anamorphic lenses across 35 locations during an actual coastal monsoon season, Afterglow is a quiet, contemplative exploration of nostalgia, unresolved grief, and the elusive nature of memory. Director Arjun Verma crafts a slow-burn masterpiece featuring award-winning sound design and radiant cinematography.',
        rating: 8.7,
        release_year: 2025,
        duration: '2h 08m',
        language: 'Hindi',
        price: 1000, // ₹10 = 1000 paise
        featured: 1,
        status: 'PUBLISHED',
        director: 'Arjun Verma',
        cast: ['Radhika Sen', 'Vikramaditya Roy', 'Kabir Khan', 'Meera Joshi'],
        backdrop: 'https://m.media-amazon.com/images/M/MV5BNzUzNDU1Y2MtNjQ5Mi00NDM0LWI5MDgtZDBjYjYzMTM2MzFhXkEyXkFqcGc@._V1_.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BMjEyNzQzNzk2NV5BMl5BanBnXkFtZTcwNTI3NTk3NA@@._V1_.jpg',
        video_url: DEMO_VIDEO_1,
        genres: ['genre-drama', 'genre-indie']
      },
      {
        id: 'monsoon-files-2024',
        type: 'SERIES',
        title: 'The Monsoon Files',
        slug: 'monsoon-files-2024',
        category_label: 'SERIES • MYSTERY',
        tagline: "When the rain reveals a city's oldest secret.",
        description: "When the rain reveals a city's oldest secret, a young journalist follows a trail that leads much closer to home.",
        about: 'Set against the waterlogged alleys and colonial stone archways of an historic port city, The Monsoon Files follows investigative journalist Tara Roy as she unravels a 25-year-old hydro-engineering conspiracy. With gripping multi-layered storylines and complex characters, this series is widely hailed as a watershed moment for modern Indian mystery dramas.',
        rating: 9.1,
        release_year: 2024,
        duration: '2 Seasons',
        language: 'Hindi',
        price: 2000, // ₹20 = 2000 paise
        featured: 0,
        status: 'PUBLISHED',
        director: 'S. Banerjee',
        cast: ['Tara Roy', 'Devendra Mehta', 'Zoya Qureshi', 'Nikhil Nair', 'Ananya Basu'],
        backdrop: 'https://m.media-amazon.com/images/M/MV5BN2Y2NDgwYTYtZDRiYy00NThjLWJmOTUtYTUxYWEyNzhlNmRiXkEyXkFqcGc@._V1_.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BZDVjNmQyM2MtYmIxNS00ZDk1LTg2N2QtMDQ4YTM0MzE5MDcxXkEyXkFqcGc@._V1_.jpg',
        video_url: DEMO_VIDEO_2,
        genres: ['genre-mystery', 'genre-thriller', 'genre-crime']
      },
      {
        id: 'city-of-dreams-2023',
        type: 'MOVIE',
        title: 'City of Dreams',
        slug: 'city-of-dreams-2023',
        category_label: 'NEO-NOIR THRILLER',
        tagline: 'Lights conceal what shadows whisper.',
        description: 'In a metropolis illuminated by neon and shadowed by ambition, two detectives navigate a web of deception that stretches from street alleys to corporate penthouses.',
        about: 'A gripping neo-noir crime thriller set in the humid underbelly of a mega-city. Pulsing with synthwave rhythms and drenched in cyan-magenta aesthetics, City of Dreams delivers relentless tension and moral complexity.',
        rating: 8.4,
        release_year: 2023,
        duration: '1h 55m',
        language: 'Hindi',
        price: 1000, // ₹10
        featured: 0,
        status: 'PUBLISHED',
        director: 'Karan Kashyap',
        cast: ['Sameer Sen', 'Pooja Hegde', 'Manoj Bajpayee', 'Farhan Akhtar'],
        backdrop: 'https://m.media-amazon.com/images/M/MV5BN2E0NGY1MTYtN2Q2Ni00NDRhLThlYjYtYWIyZWVjMzA4OTRiXkEyXkFqcGc@._V1_.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/345/864565.jpg',
        video_url: DEMO_VIDEO_2,
        genres: ['genre-thriller', 'genre-crime']
      },
      {
        id: 'winter-signal-2024',
        type: 'MOVIE',
        title: 'Winter Signal',
        slug: 'winter-signal-2024',
        category_label: 'SCI-FI SUSPENSE',
        tagline: 'Some transmissions should never be answered.',
        description: 'Deep in the Himalayan snowpack, an isolated monitoring outpost intercepts an acoustic broadcast that does not originate from Earth.',
        about: 'Winter Signal blends atmospheric psychological tension with hard science fiction. As sub-zero storms cut all communications with the valley, four scientists must decide whether to relay a cryptic binary pattern to global satellites or silence it forever.',
        rating: 8.6,
        release_year: 2024,
        duration: '2h 15m',
        language: 'Hindi',
        price: 1000, // ₹10
        featured: 0,
        status: 'PUBLISHED',
        director: 'Aditya Chopra',
        cast: ['Rahul Bose', 'Konkona Sensharma', 'Kay Kay Menon', 'Jim Sarbh'],
        backdrop: 'https://m.media-amazon.com/images/M/MV5BMTQ0MzMyOTcwMF5BMl5BanBnXkFtZTgwNjQ2Nzg5MTE@._V1_.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BMTY3OTAyNjg0Ml5BMl5BanBnXkFtZTgwNTQ2Nzg5MTE@._V1_.jpg',
        video_url: DEMO_VIDEO_3,
        genres: ['genre-scifi', 'genre-mystery']
      },
      {
        id: 'red-earth-2025',
        type: 'MOVIE',
        title: 'Red Earth',
        slug: 'red-earth-2025',
        category_label: 'EXPEDITION DOCUMENTARY',
        tagline: 'The living soul of timeless landscapes.',
        description: 'An evocative visual journey across ancient red clay canyons and resilient communities adapting to the changing rhythms of nature.',
        about: 'Captured over three years of intensive field documentary work, Red Earth provides breathtaking panoramic vistas of untouched terrain, geological wonders, and the resilient human spirit that thrives in severe arid climates.',
        rating: 8.9,
        release_year: 2025,
        duration: '1h 40m',
        language: 'Hindi',
        price: 0, // Free content
        featured: 0,
        status: 'PUBLISHED',
        director: 'Nandita Das',
        cast: ['Narrated by Naseeruddin Shah'],
        backdrop: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BMTUyMTAwMzMwNV5BMl5BanBnXkFtZTcwOTQyNTQ0Mg@@._V1_.jpg',
        video_url: DEMO_VIDEO_1,
        genres: ['genre-documentary', 'genre-nature']
      },
      {
        id: 'midnight-express-2024',
        type: 'MOVIE',
        title: 'Midnight Express',
        slug: 'midnight-express-2024',
        category_label: 'ACTION THRILLER',
        tagline: 'Speed is the only shield.',
        description: 'A covert courier aboard an overnight transcontinental train discovers his cargo is a ticking biological catastrophe.',
        about: 'A high-octane locked-room action spectacle set inside a speeding steel bullet. With adrenaline-pumping close-quarters stunt choreography, Midnight Express keeps audiences breathless until the terminal stop.',
        rating: 8.2,
        release_year: 2024,
        duration: '2h 02m',
        language: 'Hindi',
        price: 1000, // ₹10
        featured: 0,
        status: 'PUBLISHED',
        director: 'Ali Abbas Zafar',
        cast: ['Vidyut Jammwal', 'Rakul Preet Singh', 'Jaideep Ahlawat'],
        backdrop: 'https://m.media-amazon.com/images/M/MV5BMjA5OTgxMTIxNF5BMl5BanBnXkFtZTgwNzYwNDY1MDE@._V1_.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BZTRiOGMxYzctMTk3Ny00ODBkLWIyNTMtOGZhMWY0MjZiYzAxXkEyXkFqcGc@._V1_.jpg',
        video_url: DEMO_VIDEO_2,
        genres: ['genre-action', 'genre-thriller']
      },
      {
        id: 'chronicles-kashi-2025',
        type: 'SERIES',
        title: 'Chronicles of Kashi',
        slug: 'chronicles-kashi-2025',
        category_label: 'HISTORICAL DRAMA',
        tagline: 'The river never forgets.',
        description: 'Generations of silk weavers and river boatmen preserve an ancient mystery along the timeless ghats of Varanasi.',
        about: 'An opulent multi-generational saga spanning seventy years of India\'s cultural tapestry. Chronicles of Kashi immerses viewers into sacred rituals, hidden guild rivalries, and philosophical triumphs along the banks of the Ganges.',
        rating: 9.3,
        release_year: 2025,
        duration: '1 Season',
        language: 'Hindi',
        price: 2000, // ₹20
        featured: 0,
        status: 'PUBLISHED',
        director: 'Anurag Kashyap',
        cast: ['Pankaj Tripathi', 'Tillotama Shome', 'Vijay Varma', 'Shweta Tripathi'],
        backdrop: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BN2E0NGY1MTYtN2Q2Ni00NDRhLThlYjYtYWIyZWVjMzA4OTRiXkEyXkFqcGc@._V1_.jpg',
        video_url: DEMO_VIDEO_3,
        genres: ['genre-drama', 'genre-mystery']
      },
      {
        id: 'the-last-ghazal-2025',
        type: 'MOVIE',
        title: 'The Last Ghazal',
        slug: 'the-last-ghazal-2025',
        category_label: 'MUSICAL ROMANCE',
        tagline: 'Two voices. One eternal harmony.',
        description: 'A fading classical maestro and a rebellious indie lyricist collide in Old Delhi to craft one timeless melody.',
        about: 'Filled with soulful thumris and modern indie-fusion anthems, The Last Ghazal is a tender romantic drama about generational reconciliation, heritage, and the healing power of acoustic resonance.',
        rating: 8.8,
        release_year: 2025,
        duration: '2h 12m',
        language: 'Hindi',
        price: 1000, // ₹10
        featured: 0,
        trending_position: null,
        display_priority: 20,
        status: 'PUBLISHED',
        director: 'Mira Nair',
        cast: ['Shubha Mudgal', 'Ishaan Khatter', 'Wamiqa Gabbi'],
        backdrop: 'https://m.media-amazon.com/images/M/MV5BN2E0NGY1MTYtN2Q2Ni00NDRhLThlYjYtYWIyZWVjMzA4OTRiXkEyXkFqcGc@._V1_.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BNzUzNDU1Y2MtNjQ5Mi00NDM0LWI5MDgtZDBjYjYzMTM2MzFhXkEyXkFqcGc@._V1_.jpg',
        trailer_url: DEMO_VIDEO_3,
        video_url: DEMO_VIDEO_3,
        genres: ['genre-romance', 'genre-drama']
      },
      {
        id: 'dhurandhar-2025',
        type: 'MOVIE',
        title: 'Dhurandhar',
        slug: 'dhurandhar-2025',
        category_label: 'HIGH OCTANE ESPIONAGE',
        tagline: 'When the game turns lethal, legends rise.',
        description: 'An elite covert agent operates behind enemy lines in an international web of geopolitics and pulse-pounding tactical operations.',
        about: 'Starring Ranveer Singh and Sanjay Dutt, Dhurandhar is an adrenaline-fueled geopolitical espionage thriller directed by Aditya Dhar. Featuring international stunt coordination and authentic covert operation choreography.',
        rating: 9.2,
        release_year: 2025,
        duration: '2h 25m',
        language: 'Hindi',
        price: 1500, // ₹15
        featured: 1,
        trending_position: null,
        display_priority: 100,
        status: 'PUBLISHED',
        director: 'Aditya Dhar',
        cast: ['Ranveer Singh', 'Sanjay Dutt', 'R. Madhavan', 'Akshaye Khanna', 'Arjun Rampal'],
        backdrop: 'https://img.youtube.com/vi/FjU_x1106e8/hqdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BMzFiNTVkZjYtM2I3Yi00MGNjLWEyYTAtMGViNGExZmMzMGMzXkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=FjU_x1106e8',
        video_url: null, // Unconfigured until admin adds authorized video
        genres: ['genre-action', 'genre-thriller']
      },
      {
        id: 'inception-2010',
        type: 'MOVIE',
        title: 'Inception',
        slug: 'inception-2010',
        category_label: 'SCI-FI MASTERPIECE',
        tagline: 'Your mind is the scene of the crime.',
        description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
        about: 'Christopher Nolan directs this visually astonishing heist thriller delving into the depths of the subconscious mind. Winner of 4 Academy Awards.',
        rating: 8.8,
        release_year: 2010,
        duration: '2h 28m',
        language: 'English',
        price: 1000, // ₹10
        featured: 0,
        trending_position: 2,
        display_priority: 80,
        status: 'PUBLISHED',
        director: 'Christopher Nolan',
        cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy'],
        backdrop: 'https://img.youtube.com/vi/YoHD9XEInc0/maxresdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
        video_url: null,
        genres: ['genre-scifi', 'genre-thriller']
      },
      {
        id: 'breaking-bad',
        type: 'SERIES',
        title: 'Breaking Bad',
        slug: 'breaking-bad',
        category_label: 'LEGENDARY CRIME SAGA',
        tagline: 'Change the equation.',
        description: 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student.',
        about: 'Widely considered one of the greatest television dramas of all time, Breaking Bad chronicles the metamorphosis of Walter White from mild-mannered high school teacher into ruthless cartel kingpin Heisenberg.',
        rating: 9.5,
        release_year: 2008,
        duration: '5 Seasons',
        language: 'English',
        price: 2500, // ₹25
        featured: 1,
        trending_position: 3,
        display_priority: 90,
        status: 'PUBLISHED',
        director: 'Vince Gilligan',
        cast: ['Bryan Cranston', 'Aaron Paul', 'Anna Gunn', 'Dean Norris'],
        backdrop: 'https://img.youtube.com/vi/HhesaQXLuRY/maxresdefault.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/501/1253519.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=HhesaQXLuRY',
        video_url: null,
        genres: ['genre-crime', 'genre-drama', 'genre-thriller']
      },
      {
        id: 'the-8-show',
        type: 'SERIES',
        title: 'The 8 Show',
        slug: 'the-8-show',
        category_label: 'PSYCHOLOGICAL SURVIVAL',
        tagline: 'Time is money. Pain is entertainment.',
        description: 'Eight individuals trapped in a mysterious 8-story building participate in a tempting but brutal game show where money accumulates as time passes.',
        about: 'A dark and gripping Korean psychological thriller series examining social hierarchy, human greed, and morality under extreme gamified surveillance.',
        rating: 8.6,
        release_year: 2024,
        duration: '1 Season',
        language: 'Korean',
        price: 2000, // ₹20
        featured: 0,
        trending_position: 4,
        display_priority: 70,
        status: 'PUBLISHED',
        director: 'Han Jae-rim',
        cast: ['Ryu Jun-yeol', 'Chun Woo-hee', 'Park Jeong-min'],
        backdrop: 'https://img.youtube.com/vi/d_5h3E5z4wM/hqdefault.jpg',
        poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgzKpyMXh1Hj8GtQJBnGBoyZY_V2TuadqPD1kI6teqYLcX6h4bXk6mIgyh&s=10',
        trailer_url: 'https://www.youtube.com/watch?v=d_5h3E5z4wM',
        video_url: null,
        genres: ['genre-thriller', 'genre-mystery']
      },
      {
        id: 'money-heist',
        type: 'SERIES',
        title: 'Money Heist',
        slug: 'money-heist',
        category_label: 'INTERNATIONAL THRILLER',
        tagline: 'The greatest robbery in history.',
        description: 'An unusual group of robbers attempt to carry out the most perfect robbery in Spanish history - stealing 2.4 billion euros from the Royal Mint of Spain.',
        about: 'Created by Álex Pina, La Casa de Papel (Money Heist) became a worldwide cultural phenomenon known for iconic red jumpsuits, Salvador Dalí masks, and brilliant strategic heists led by El Profesor.',
        rating: 8.2,
        release_year: 2017,
        duration: '5 Parts',
        language: 'Spanish',
        price: 2000,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Álex Pina',
        cast: ['Úrsula Corberó', 'Álvaro Morte', 'Itziar Ituño', 'Pedro Alonso'],
        backdrop: 'https://img.youtube.com/vi/_InqQJRqGW4/maxresdefault.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/430/1076004.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=_InqQJRqGW4',
        video_url: null,
        genres: ['genre-crime', 'genre-action', 'genre-thriller']
      },
      // --- 10 RECOGNIZABLE INDIAN TITLES ---
      {
        id: 'tumbbad-2018',
        type: 'MOVIE',
        title: 'Tumbbad',
        slug: 'tumbbad-2018',
        category_label: 'FOLK HORROR MASTERPIECE',
        tagline: 'Fear greed. Respect the curse of Hastar.',
        description: 'A mythological horror saga following three generations of a Brahmin family caught in a decaying Konkan mansion hiding the forbidden gold of Hastar.',
        about: 'Directed by Rahi Anil Barve, Tumbbad is an atmospheric visual triumph filmed entirely in natural monsoon rain across remote Konkan landscapes. Praised worldwide for its breathtaking cinematography, practical production design, and chilling folklore.',
        rating: 8.3,
        release_year: 2018,
        duration: '1h 44m',
        language: 'Hindi',
        price: 1000,
        featured: 1,
        status: 'PUBLISHED',
        director: 'Rahi Anil Barve',
        cast: ['Sohum Shah', 'Jyoti Malshe', 'Anita Date-Kelkar', 'Mohammad Samad'],
        backdrop: 'https://img.youtube.com/vi/sN75MPxgvX8/hqdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BOTY0YzY3MTMtOWQ5Yi00ODY2LThhOGMtMzFlMjhlODcxOGU1XkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=sN75MPxgvX8',
        video_url: null,
        genres: ['genre-mystery', 'genre-thriller', 'genre-drama']
      },
      {
        id: 'gangs-of-wasseypur-2012',
        type: 'MOVIE',
        title: 'Gangs of Wasseypur',
        slug: 'gangs-of-wasseypur-2012',
        category_label: 'EPIC CRIME CHRONICLE',
        tagline: 'Vengeance has a soundtrack in the coalfields.',
        description: 'A clash between Sultan and Shahid Khan leads to the expulsion of Khan from Wasseypur, sparking a generational blood feud spanning six decades.',
        about: 'Anurag Kashyap’s gritty two-part magnum opus that revolutionized modern Indian cinema, featuring legendary performances, authentic coalfield textures, and unforgettable music by Sneha Khanwalkar.',
        rating: 8.2,
        release_year: 2012,
        duration: '5h 21m',
        language: 'Hindi',
        price: 1500,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Anurag Kashyap',
        cast: ['Manoj Bajpayee', 'Nawazuddin Siddiqui', 'Richa Chadha', 'Pankaj Tripathi', 'Huma Qureshi'],
        backdrop: 'https://img.youtube.com/vi/j-AkWDkXcZU/hqdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BNWQyMmJkYTItNDUyYS00MjgwLWFmYjUtOWQ1NmRjOGZlOTZhXkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=j-AkWDkXcZU',
        video_url: null,
        genres: ['genre-crime', 'genre-action', 'genre-drama']
      },
      {
        id: '3-idiots-2009',
        type: 'MOVIE',
        title: '3 Idiots',
        slug: '3-idiots-2009',
        category_label: 'INSPIRATIONAL COMEDY-DRAMA',
        tagline: 'Chase excellence, and success will follow.',
        description: 'Two friends search for their long-lost college companion while revisiting their humorous and poignant university days under a draconian engineering dean.',
        about: 'Directed by Rajkumar Hirani, 3 Idiots is one of India\'s most celebrated cinematic touchstones, blending laugh-out-loud collegiate comedy with profound critiques of rote learning and societal expectations.',
        rating: 8.4,
        release_year: 2009,
        duration: '2h 50m',
        language: 'Hindi',
        price: 1000,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Rajkumar Hirani',
        cast: ['Aamir Khan', 'R. Madhavan', 'Sharman Joshi', 'Kareena Kapoor Khan', 'Boman Irani'],
        backdrop: 'https://img.youtube.com/vi/K0eDlFX9GMc/maxresdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BNzc4ZWQ3NmYtODE0Ny00YTQ4LTlkZWItNTBkMGQ0MmUwMmJlXkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=K0eDlFX9GMc',
        video_url: null,
        genres: ['genre-comedy', 'genre-drama']
      },
      {
        id: 'drishyam-2015',
        type: 'MOVIE',
        title: 'Drishyam',
        slug: 'drishyam-2015',
        category_label: 'EDGE-OF-THE-SEAT THRILLER',
        tagline: 'Visuals can be deceptive.',
        description: 'When the son of a stern Inspector General of Police vanishes, a simple cinema-loving cable operator uses his movie knowledge to construct an unbreakable alibi for his family.',
        about: 'Nishikant Kamat crafts a psychological game of chess between Vijay Salgaonkar and IG Meera Deshmukh. A masterclass in suspense, tension, and paternal devotion.',
        rating: 8.2,
        release_year: 2015,
        duration: '2h 43m',
        language: 'Hindi',
        price: 1000,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Nishikant Kamat',
        cast: ['Ajay Devgn', 'Tabu', 'Shriya Saran', 'Rajat Kapoor', 'Ishita Dutta'],
        backdrop: 'https://img.youtube.com/vi/AuuX2j14NBg/hqdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BYjMzZTU0NzUtZGQ0MC00Y2M4LWI5ZDUtZjY1YmNjMjNmNmI3XkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=AuuX2j14NBg',
        video_url: null,
        genres: ['genre-crime', 'genre-thriller', 'genre-mystery']
      },
      {
        id: 'rrr-2022',
        type: 'MOVIE',
        title: 'RRR',
        slug: 'rrr-2022',
        category_label: 'REVOLUTIONARY ACTION SPECTACLE',
        tagline: 'Rise. Roar. Revolt.',
        description: 'A fearless revolutionary and a dedicated officer serving the British Crown forge an unbreakable brotherhood before discovering each other\'s true identities in pre-independence India.',
        about: 'Directed by visionary filmmaker S.S. Rajamouli, RRR is a high-octane theatrical tour de force combining dazzling action set-pieces, mythological undertones, and the Oscar-winning song Naatu Naatu.',
        rating: 8.8,
        release_year: 2022,
        duration: '3h 07m',
        language: 'Telugu',
        price: 1500,
        featured: 1,
        status: 'PUBLISHED',
        director: 'S.S. Rajamouli',
        cast: ['N.T. Rama Rao Jr.', 'Ram Charan', 'Alia Bhatt', 'Ajay Devgn', 'Shriya Saran'],
        backdrop: 'https://img.youtube.com/vi/NgBoMJy386M/maxresdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BNWMwODYyMjQtMTczMi00NTQ1LWFkYjItMGJhMWRkY2E3NDAyXkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=NgBoMJy386M',
        video_url: null,
        genres: ['genre-action', 'genre-drama', 'genre-history']
      },
      {
        id: 'sacred-games',
        type: 'SERIES',
        title: 'Sacred Games',
        slug: 'sacred-games',
        category_label: 'CRIME ANTHOLOGY SAGA',
        tagline: '25 days to save Mumbai.',
        description: 'A disillusioned Mumbai police inspector receives a chilling call from infamous gangster Ganesh Gaitonde with an ultimatum: save the city within 25 days or face annihilation.',
        about: 'India\'s ground-breaking neo-noir drama series directed by Vikramaditya Motwane and Anurag Kashyap. Adapting Vikram Chandra\'s acclaimed novel with unflinching grit and philosophical depth.',
        rating: 8.5,
        release_year: 2018,
        duration: '2 Seasons',
        language: 'Hindi',
        price: 2500,
        featured: 1,
        status: 'PUBLISHED',
        director: 'Vikramaditya Motwane & Anurag Kashyap',
        cast: ['Saif Ali Khan', 'Nawazuddin Siddiqui', 'Radhika Apte', 'Pankaj Tripathi', 'Kalki Koechlin'],
        backdrop: 'https://img.youtube.com/vi/28j8h0RRsf4/hqdefault.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/204/511629.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=28j8h0RRsf4',
        video_url: null,
        genres: ['genre-crime', 'genre-thriller', 'genre-drama']
      },
      {
        id: 'mirzapur',
        type: 'SERIES',
        title: 'Mirzapur',
        slug: 'mirzapur',
        category_label: 'PURVANCHAL CRIME DRAMA',
        tagline: 'Kings rule with fear. Brothers rule with blood.',
        description: 'Akhandanand Tripathi is the undisputed carpet magnate and underworld kingpin of Mirzapur. But when his reckless son Munna starts a war, two upright brothers become his deadliest rivals.',
        about: 'Created by Puneet Krishna, Mirzapur became a roaring pop-culture sensation across India with razor-sharp Purvanchal dialect, visceral action, and iconic multi-dimensional anti-heroes.',
        rating: 8.5,
        release_year: 2018,
        duration: '3 Seasons',
        language: 'Hindi',
        price: 2500,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Gurmmeet Singh & Mihir Desai',
        cast: ['Pankaj Tripathi', 'Ali Fazal', 'Divyenndu', 'Shweta Tripathi', 'Rasika Dugal', 'Vijay Varma'],
        backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/176/441459.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/619/1549499.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=ZNeGF-PvRHY',
        video_url: null,
        genres: ['genre-crime', 'genre-action', 'genre-thriller']
      },
      {
        id: 'the-family-man',
        type: 'SERIES',
        title: 'The Family Man',
        slug: 'the-family-man',
        category_label: 'ESPIONAGE ACTION COMEDY',
        tagline: 'Middle class guy. World class spy.',
        description: 'Srikant Tiwari navigates domestic marital bickering and teenage drama at home while covertly thwarting catastrophic terror conspiracies across the country as a senior intelligence agent.',
        about: 'Created by Raj & DK, The Family Man earned widespread acclaim for seamlessly pairing realistic geopolitical counter-terror operations with deeply relatable middle-class Indian humor.',
        rating: 8.7,
        release_year: 2019,
        duration: '2 Seasons',
        language: 'Hindi',
        price: 2000,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Raj Nidimoru & Krishna D.K.',
        cast: ['Manoj Bajpayee', 'Priyamani', 'Sharib Hashmi', 'Samantha Ruth Prabhu', 'Sharad Kelkar'],
        backdrop: 'https://img.youtube.com/vi/NGf_B81Kr2g/hqdefault.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/599/1498893.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=NGf_B81Kr2g',
        video_url: null,
        genres: ['genre-action', 'genre-thriller', 'genre-drama', 'genre-comedy']
      },
      {
        id: 'paatal-lok',
        type: 'SERIES',
        title: 'Paatal Lok',
        slug: 'paatal-lok',
        category_label: 'NEO-NOIR INVESTIGATION',
        tagline: 'The netherworld holds the darkest mirror.',
        description: 'A washed-up Outer Jamuna police inspector is assigned a routine assassination conspiracy case that drags him down through the darkest strata of India\'s criminal underworld.',
        about: 'Produced by Clean Slate Filmz and created by Sudip Sharma, Paatal Lok is a searing indictment of caste, political corruption, and journalistic sensationalism.',
        rating: 8.1,
        release_year: 2020,
        duration: '1 Season',
        language: 'Hindi',
        price: 2000,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Avinash Arun & Prosit Roy',
        cast: ['Jaideep Ahlawat', 'Ishwak Singh', 'Neeraj Kabi', 'Abhishek Banerjee', 'Swastika Mukherjee'],
        backdrop: 'https://img.youtube.com/vi/cNwkdZhuDvg/hqdefault.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/254/635178.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=cNwkdZhuDvg',
        video_url: null,
        genres: ['genre-crime', 'genre-mystery', 'genre-drama']
      },
      {
        id: 'panchayat',
        type: 'SERIES',
        title: 'Panchayat',
        slug: 'panchayat',
        category_label: 'HEARTWARMING RURAL COMEDY',
        tagline: 'Phulera is not a place, it is an emotion.',
        description: 'An engineering graduate with limited job options reluctantly becomes the secretary of a village Panchayat in remote Uttar Pradesh, discovering an eccentric family of villagers.',
        about: 'Created by The Viral Fever (TVF), Panchayat won millions of hearts with its gentle humor, brilliant character arcs, and an authentic tribute to rural Indian village life.',
        rating: 8.9,
        release_year: 2020,
        duration: '3 Seasons',
        language: 'Hindi',
        price: 1500,
        featured: 1,
        status: 'PUBLISHED',
        director: 'Deepak Kumar Mishra',
        cast: ['Jitendra Kumar', 'Neena Gupta', 'Raghubir Yadav', 'Chandan Roy', 'Faisal Malik', 'Sanvikaa'],
        backdrop: 'https://img.youtube.com/vi/mojZJ7oeD_g/maxresdefault.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/517/1293627.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=mojZJ7oeD_g',
        video_url: null,
        genres: ['genre-comedy', 'genre-drama', 'genre-indie']
      },

      // --- 12 RECOGNIZABLE INTERNATIONAL TITLES ---
      {
        id: 'interstellar-2014',
        type: 'MOVIE',
        title: 'Interstellar',
        slug: 'interstellar-2014',
        category_label: 'COSMIC SCI-FI DRAMA',
        tagline: 'Mankind was born on Earth. It was never meant to die here.',
        description: 'When Earth becomes uninhabitable in the future, a former NASA pilot leads an interstellar voyage through a newly opened wormhole to find humanity\'s next home.',
        about: 'Christopher Nolan\'s breathtaking exploration of gravitational theory, relativity, and the timeless gravitational pull of human love. Scored by Hans Zimmer\'s iconic organ composition.',
        rating: 8.7,
        release_year: 2014,
        duration: '2h 49m',
        language: 'English',
        price: 1500,
        featured: 1,
        status: 'PUBLISHED',
        director: 'Christopher Nolan',
        cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine', 'Matt Damon'],
        backdrop: 'https://img.youtube.com/vi/zSWdZVtXT7E/maxresdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
        video_url: null,
        genres: ['genre-scifi', 'genre-drama', 'genre-adventure']
      },
      {
        id: 'the-dark-knight-2008',
        type: 'MOVIE',
        title: 'The Dark Knight',
        slug: 'the-dark-knight-2008',
        category_label: 'DEFINITIVE SUPERHERO NOIR',
        tagline: 'Why so serious?',
        description: 'When a psychopathic criminal mastermind known as the Joker unleashes unprecedented anarchy upon Gotham, Batman must accept one of the greatest psychological tests of his ability to fight injustice.',
        about: 'Widely recognized as one of the greatest films ever made. Heath Ledger’s posthumous Oscar-winning portrayal of the Joker redefined the villain archetype in modern world cinema.',
        rating: 9.0,
        release_year: 2008,
        duration: '2h 32m',
        language: 'English',
        price: 1000,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Christopher Nolan',
        cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine', 'Gary Oldman', 'Morgan Freeman'],
        backdrop: 'https://img.youtube.com/vi/EXeTwQWrcwY/maxresdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=EXeTwQWrcwY',
        video_url: null,
        genres: ['genre-action', 'genre-crime', 'genre-drama']
      },
      {
        id: 'parasite-2019',
        type: 'MOVIE',
        title: 'Parasite',
        slug: 'parasite-2019',
        category_label: 'OSCAR-WINNING THRILLER',
        tagline: 'Act like you own the place.',
        description: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan in modern Seoul.',
        about: 'Bong Joon-ho’s historic masterpiece that swept the 92nd Academy Awards, becoming the first non-English language film to win Best Picture in Oscar history.',
        rating: 8.5,
        release_year: 2019,
        duration: '2h 12m',
        language: 'Korean',
        price: 1000,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Bong Joon-ho',
        cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik', 'Park So-dam'],
        backdrop: 'https://img.youtube.com/vi/5xH0RzeSojI/hqdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BYjk1Y2U4MjQtY2ZiNS00OWQyLWI3MmYtZWUwNmRjYWRiNWNhXkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=5xH0RzeSojI',
        video_url: null,
        genres: ['genre-drama', 'genre-thriller', 'genre-indie']
      },
      {
        id: 'oppenheimer-2023',
        type: 'MOVIE',
        title: 'Oppenheimer',
        slug: 'oppenheimer-2023',
        category_label: 'HISTORICAL BIOPIC',
        tagline: 'Now I am become Death, the destroyer of worlds.',
        description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during the Manhattan Project.',
        about: 'Christopher Nolan directs a 7-time Academy Award-winning historical tour de force, examining genius, guilt, and geopolitical fallout during the dawn of the atomic age.',
        rating: 8.9,
        release_year: 2023,
        duration: '3h 00m',
        language: 'English',
        price: 1500,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Christopher Nolan',
        cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.', 'Florence Pugh'],
        backdrop: 'https://img.youtube.com/vi/uYPbbksJxIg/maxresdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BN2JkMDc5MGQtZjg3YS00NmFiLWIyZmQtZTJmNTM5MjVmYTQ4XkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
        video_url: null,
        genres: ['genre-biography', 'genre-drama', 'genre-history']
      },
      {
        id: 'pulp-fiction-1994',
        type: 'MOVIE',
        title: 'Pulp Fiction',
        slug: 'pulp-fiction-1994',
        category_label: 'NEO-NOIR CLASSIC',
        tagline: 'You won\'t know the facts until you\'ve seen the fiction.',
        description: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
        about: 'Quentin Tarantino\'s Palme d\'Or-winning cinematic milestone, renowned for non-linear storytelling, eclectic soundtrack, and electric dialogue that changed 90s cinema forever.',
        rating: 8.9,
        release_year: 1994,
        duration: '2h 34m',
        language: 'English',
        price: 1000,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Quentin Tarantino',
        cast: ['John Travolta', 'Samuel L. Jackson', 'Uma Thurman', 'Bruce Willis', 'Ving Rhames'],
        backdrop: 'https://img.youtube.com/vi/s7EdQ4FqbhY/maxresdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BYTViYTE3ZGQtNDBlMC00ZTAyLTkyODMtZGRiZDg0MjA2YThkXkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=s7EdQ4FqbhY',
        video_url: null,
        genres: ['genre-crime', 'genre-drama']
      },
      {
        id: 'the-matrix-1999',
        type: 'MOVIE',
        title: 'The Matrix',
        slug: 'the-matrix-1999',
        category_label: 'CYBERPUNK MASTERPIECE',
        tagline: 'Welcome to the Real World.',
        description: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth: our reality is an elaborate simulation run by machines.',
        about: 'Written and directed by the Wachowskis, The Matrix transformed the action and visual effects landscape with bullet-time cinematography, philosophical allegories, and martial arts mastery.',
        rating: 8.7,
        release_year: 1999,
        duration: '2h 16m',
        language: 'English',
        price: 1000,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Lana & Lilly Wachowski',
        cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving', 'Joe Pantoliano'],
        backdrop: 'https://img.youtube.com/vi/vKQi3bBA1y8/maxresdefault.jpg',
        poster: 'https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODE2ZTY0ODQyNDRhXkEyXkFqcGc@._V1_.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=vKQi3bBA1y8',
        video_url: null,
        genres: ['genre-scifi', 'genre-action']
      },
      {
        id: 'stranger-things',
        type: 'SERIES',
        title: 'Stranger Things',
        slug: 'stranger-things',
        category_label: 'SUPERNATURAL NOSTALGIA',
        tagline: 'One summer can change everything.',
        description: 'When a young boy vanishes in Hawkins, Indiana, his mother and friends uncover a dark government conspiracy, secret laboratory experiments, and a telekinetic girl.',
        about: 'The Duffer Brothers channel Spielbergian 80s warmth and Stephen King cosmic terror into a beloved global sci-fi phenomenon featuring Eleven and the Upside Down.',
        rating: 8.7,
        release_year: 2016,
        duration: '4 Seasons',
        language: 'English',
        price: 2500,
        featured: 1,
        status: 'PUBLISHED',
        director: 'The Duffer Brothers',
        cast: ['Millie Bobby Brown', 'Finn Wolfhard', 'Winona Ryder', 'David Harbour', 'Gaten Matarazzo'],
        backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/70/175852.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/595/1489169.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=b9EkMc79ZSU',
        video_url: null,
        genres: ['genre-scifi', 'genre-mystery', 'genre-drama']
      },
      {
        id: 'chernobyl',
        type: 'SERIES',
        title: 'Chernobyl',
        slug: 'chernobyl',
        category_label: 'HISTORICAL MINI-SERIES',
        tagline: 'What is the cost of lies?',
        description: 'In April 1986, an explosion at the Chernobyl nuclear power station becomes one of the world\'s worst man-made catastrophes and sparks an untold battle of truth against bureaucratic lies.',
        about: 'Craig Mazin and Johan Renck deliver an Emmy-winning five-part masterpiece highlighting the extraordinary sacrifice of firefighters, engineers, and scientists.',
        rating: 9.3,
        release_year: 2019,
        duration: '1 Season',
        language: 'English',
        price: 2000,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Johan Renck',
        cast: ['Jared Harris', 'Stellan Skarsgård', 'Emily Watson', 'Paul Ritter', 'Jessie Buckley'],
        backdrop: 'https://img.youtube.com/vi/s9APLXM9Ei8/maxresdefault.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/193/482599.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=s9APLXM9Ei8',
        video_url: null,
        genres: ['genre-drama', 'genre-history', 'genre-thriller']
      },
      {
        id: 'dark',
        type: 'SERIES',
        title: 'Dark',
        slug: 'dark',
        category_label: 'COMPLEX TIME-LOOP SCI-FI',
        tagline: 'The question isn\'t where, but when.',
        description: 'A missing child sets four families in the German town of Winden on a frantic hunt for answers as they unearth a mind-bending mystery spanning three generations.',
        about: 'Baran bo Odar and Jantje Friese weave an intricate, meticulously planned existential time-travel mystery hailed by critics as one of the smartest sci-fi television narratives ever written.',
        rating: 8.7,
        release_year: 2017,
        duration: '3 Seasons',
        language: 'German',
        price: 2500,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Baran bo Odar',
        cast: ['Louis Hofmann', 'Oliver Masucci', 'Jördis Triebel', 'Maja Schöne', 'Karoline Eichhorn'],
        backdrop: 'https://img.youtube.com/vi/rrwycJ08PSA/maxresdefault.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/504/1262352.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=rrwycJ08PSA',
        video_url: null,
        genres: ['genre-scifi', 'genre-mystery', 'genre-thriller']
      },
      {
        id: 'succession',
        type: 'SERIES',
        title: 'Succession',
        slug: 'succession',
        category_label: 'CORPORATE DYNASTY SATIRE',
        tagline: 'Make your move.',
        description: 'The Roy family is known for controlling Waystar RoyCo, one of the biggest media and entertainment conglomerates in the world. However, the aging patriarch\'s retirement ignites a cutthroat war.',
        about: 'Jesse Armstrong’s biting, multi-Emmy-winning masterpiece featuring peerless dialogue, Shakespearean corporate ruthlessness, and Nicholas Britell\'s unforgettable classical theme.',
        rating: 8.9,
        release_year: 2018,
        duration: '4 Seasons',
        language: 'English',
        price: 2500,
        featured: 0,
        status: 'PUBLISHED',
        director: 'Jesse Armstrong',
        cast: ['Brian Cox', 'Jeremy Strong', 'Sarah Snook', 'Kieran Culkin', 'Matthew Macfadyen', 'Nicholas Braun'],
        backdrop: 'https://img.youtube.com/vi/OzYxJV_rmE8/maxresdefault.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/453/1134275.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=OzYxJV_rmE8',
        video_url: null,
        genres: ['genre-drama']
      },
      {
        id: 'severance',
        type: 'SERIES',
        title: 'Severance',
        slug: 'severance',
        category_label: 'DYSTOPIAN OFFICE THRILLER',
        tagline: 'Please do not adjust your screen. This is reality.',
        description: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears, a web of sinister corporate conspiracies emerges.',
        about: 'Directed by Ben Stiller, Severance is a visual and thematic triumph exploring identity, grief, and modern corporate dehumanization with eerie sterile aesthetics and razor-sharp suspense.',
        rating: 8.7,
        release_year: 2022,
        duration: '1 Season',
        language: 'English',
        price: 2000,
        featured: 1,
        status: 'PUBLISHED',
        director: 'Ben Stiller & Aoife McArdle',
        cast: ['Adam Scott', 'Zach Cherry', 'Britt Lower', 'Patricia Arquette', 'John Turturro', 'Christopher Walken'],
        backdrop: 'https://img.youtube.com/vi/xEQP4VVuyrY/maxresdefault.jpg',
        poster: 'https://static.tvmaze.com/uploads/images/original_untouched/548/1371406.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=xEQP4VVuyrY',
        video_url: null,
        genres: ['genre-scifi', 'genre-thriller', 'genre-mystery']
      }
    ];

    const insertContent = txDb.prepare(`
      INSERT OR IGNORE INTO content (
        id, type, title, slug, description, poster, backdrop,
        trailer_url, video_url, price, language, release_year,
        duration, age_rating, status, featured, trending_position, display_priority, category_label,
        tagline, about, rating, director, cast_json, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      );
    `);

    const insertContentGenre = txDb.prepare(`
      INSERT OR IGNORE INTO content_genres (content_id, genre_id)
      VALUES (?, ?);
    `);

    const insertMedia = txDb.prepare(`
      INSERT OR IGNORE INTO media (
        id, content_id, episode_id, media_type, source_type,
        url, mime_type, duration, duration_seconds, thumbnail,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const item of catalogItems) {
      insertContent.run(
        item.id,
        item.type,
        item.title,
        item.slug,
        item.description,
        item.poster,
        item.backdrop,
        item.trailer_url || null,
        item.video_url || null,
        item.price,
        item.language,
        item.release_year,
        item.duration,
        'U/A 13+',
        item.status,
        item.featured,
        (item as any).trending_position ?? null,
        (item as any).display_priority ?? 0,
        item.category_label,
        item.tagline,
        item.about,
        item.rating,
        item.director,
        JSON.stringify(item.cast),
        now,
        now
      );

      const contentRow = txDb.prepare('SELECT id FROM content WHERE id = ?').get(item.id);
      if (contentRow) {
        for (const genreId of item.genres) {
          insertContentGenre.run(item.id, genreId);
        }

        // Seed trailer media
        if (item.trailer_url) {
          const isYt = item.trailer_url.includes('youtube.com') || item.trailer_url.includes('youtu.be');
          insertMedia.run(
            `med-trailer-${item.id}`,
            item.id,
            null,
            'TRAILER',
            isYt ? 'YOUTUBE' : 'DIRECT_URL',
            item.trailer_url,
            isYt ? 'video/youtube' : 'video/mp4',
            null,
            0,
            item.backdrop,
            1,
            now,
            now
          );
        }

        // Seed main media if present
        if (item.video_url) {
          insertMedia.run(
            `med-main-${item.id}`,
            item.id,
            null,
            'MAIN',
            'DIRECT_URL',
            item.video_url,
            'video/mp4',
            item.duration,
            0,
            item.poster,
            1,
            now,
            now
          );
        }
      }
    }

    // ------------------------------------------------------------------------
    // 3. SEED SEASONS & EPISODES FOR SERIES
    // ------------------------------------------------------------------------
    const insertSeason = txDb.prepare(`
      INSERT OR IGNORE INTO seasons (id, content_id, season_number, title, created_at)
      VALUES (?, ?, ?, ?, ?);
    `);

    const insertEpisode = txDb.prepare(`
      INSERT OR IGNORE INTO episodes (
        id, season_id, episode_number, title, description,
        thumbnail, duration, duration_seconds, video_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    // The Monsoon Files: Season 1 & 2
    insertSeason.run('tmf-season-1', 'monsoon-files-2024', 1, 'Season 1: The First Deluge', now);
    insertSeason.run('tmf-season-2', 'monsoon-files-2024', 2, 'Season 2: Submerged Truths', now);

    const tmfS1Episodes = [
      {
        id: 'tmf-s1-e1',
        season_id: 'tmf-season-1',
        episode_number: 1,
        title: 'Episode 1: The First Deluge',
        description: 'An unidentified artifact surfaces after the century\'s heaviest cloudburst, pulling rookie reporter Tara into a forgotten cold case.',
        thumbnail: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80',
        duration: '48m',
        duration_seconds: 2880,
        video_url: DEMO_VIDEO_1
      },
      {
        id: 'tmf-s1-e2',
        season_id: 'tmf-season-1',
        episode_number: 2,
        title: 'Episode 2: Shadows on Water',
        description: 'A cryptic ledger found in the old colonial dockyards points toward high-ranking city officials.',
        thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80',
        duration: '51m',
        duration_seconds: 3060,
        video_url: DEMO_VIDEO_2
      },
      {
        id: 'tmf-s1-e3',
        season_id: 'tmf-season-1',
        episode_number: 3,
        title: 'Episode 3: Rising Tide',
        description: 'Tara faces anonymous threats as the timeline of the 1998 flood incident unmasks a hidden municipal conspiracy.',
        thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        duration: '46m',
        duration_seconds: 2760,
        video_url: DEMO_VIDEO_3
      },
      {
        id: 'tmf-s1-e4',
        season_id: 'tmf-season-1',
        episode_number: 4,
        title: 'Episode 4: The Reservoir',
        description: 'An explosive standoff at the old reservoir reveals who controlled the floodgates on that fateful night.',
        thumbnail: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80',
        duration: '55m',
        duration_seconds: 3300,
        video_url: DEMO_VIDEO_1
      }
    ];

    for (const ep of tmfS1Episodes) {
      insertEpisode.run(
        ep.id,
        ep.season_id,
        ep.episode_number,
        ep.title,
        ep.description,
        ep.thumbnail,
        ep.duration,
        ep.duration_seconds,
        ep.video_url,
        now,
        now
      );
    }

    const tmfS2Episodes = [
      {
        id: 'tmf-s2-e1',
        season_id: 'tmf-season-2',
        episode_number: 1,
        title: 'Episode 1: Submerged Truths',
        description: 'One year later, an unexpected coastal earthquake triggers tremors across the docklands and brings new questions to light.',
        thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
        duration: '50m',
        duration_seconds: 3000,
        video_url: DEMO_VIDEO_2
      },
      {
        id: 'tmf-s2-e2',
        season_id: 'tmf-season-2',
        episode_number: 2,
        title: 'Episode 2: Echoes in the Silt',
        description: 'Dredging operations near the backwater creek unearth forensic evidence that turns the original inquiry upside down.',
        thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80',
        duration: '49m',
        duration_seconds: 2940,
        video_url: DEMO_VIDEO_3
      },
      {
        id: 'tmf-s2-e3',
        season_id: 'tmf-season-2',
        episode_number: 3,
        title: 'Episode 3: Broken Levees',
        description: 'Tara partners with a disgraced archivist to break the cipher protecting 30-year-old civic records.',
        thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
        duration: '53m',
        duration_seconds: 3180,
        video_url: DEMO_VIDEO_1
      },
      {
        id: 'tmf-s2-e4',
        season_id: 'tmf-season-2',
        episode_number: 4,
        title: 'Episode 4: The Clear Horizon',
        description: 'The climactic truth forces Tara to choose between personal retribution and protecting vulnerable communities.',
        thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
        duration: '58m',
        duration_seconds: 3480,
        video_url: DEMO_VIDEO_2
      }
    ];

    for (const ep of tmfS2Episodes) {
      insertEpisode.run(
        ep.id,
        ep.season_id,
        ep.episode_number,
        ep.title,
        ep.description,
        ep.thumbnail,
        ep.duration,
        ep.duration_seconds,
        ep.video_url,
        now,
        now
      );
    }

    // Chronicles of Kashi: Season 1
    insertSeason.run('ck-season-1', 'chronicles-kashi-2025', 1, 'Season 1: Golden Silks', now);
    const ckEpisodes = [
      {
        id: 'ck-s1-e1',
        season_id: 'ck-season-1',
        episode_number: 1,
        title: 'Episode 1: The Weaver\'s Loom',
        description: 'In 1952, a master artisan hides an imperial heirloom inside the weave of a consecrated prayer mantle.',
        thumbnail: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=600&q=80',
        duration: '54m',
        duration_seconds: 3240,
        video_url: DEMO_VIDEO_3
      },
      {
        id: 'ck-s1-e2',
        season_id: 'ck-season-1',
        episode_number: 2,
        title: 'Episode 2: River at Midnight',
        description: 'The boatmen\'s guild encounters an unmoored skiff bearing sealed urns from the northern foothills.',
        thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        duration: '49m',
        duration_seconds: 2940,
        video_url: DEMO_VIDEO_1
      },
      {
        id: 'ck-s1-e3',
        season_id: 'ck-season-1',
        episode_number: 3,
        title: 'Episode 3: The Brass Bell',
        description: 'A sacred bell silenced for forty years chimes during an eclipse, setting off rival family claims.',
        thumbnail: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80',
        duration: '52m',
        duration_seconds: 3120,
        video_url: DEMO_VIDEO_2
      }
    ];

    for (const ep of ckEpisodes) {
      insertEpisode.run(
        ep.id,
        ep.season_id,
        ep.episode_number,
        ep.title,
        ep.description,
        ep.thumbnail,
        ep.duration,
        ep.duration_seconds,
        ep.video_url,
        now,
        now
      );
    }

    // Breaking Bad: Season 1
    insertSeason.run('bb-season-1', 'breaking-bad', 1, 'Season 1', now);
    const bbEpisodes = [
      {
        id: 'bb-s1-e1',
        season_id: 'bb-season-1',
        episode_number: 1,
        title: 'Episode 1: Pilot',
        description: 'Diagnosed with terminal lung cancer, a high school chemistry teacher teams with a former student to manufacture methamphetamine.',
        thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
        duration: '58m',
        duration_seconds: 3480,
        video_url: '' // Unconfigured main video - ready for admin upload/URL
      },
      {
        id: 'bb-s1-e2',
        season_id: 'bb-season-1',
        episode_number: 2,
        title: "Episode 2: Cat's in the Bag...",
        description: 'Walt and Jesse attempt to dispose of two rival drug dealers in a remote RV.',
        thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        duration: '48m',
        duration_seconds: 2880,
        video_url: ''
      },
      {
        id: 'bb-s1-e3',
        season_id: 'bb-season-1',
        episode_number: 3,
        title: "...And the Bag's in the River",
        description: 'Walt grapples with an agonizing moral dilemma regarding Krazy-8 in Jesse\'s basement.',
        thumbnail: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80',
        duration: '48m',
        duration_seconds: 2880,
        video_url: ''
      }
    ];

    for (const ep of bbEpisodes) {
      insertEpisode.run(
        ep.id,
        ep.season_id,
        ep.episode_number,
        ep.title,
        ep.description,
        ep.thumbnail,
        ep.duration,
        ep.duration_seconds,
        ep.video_url,
        now,
        now
      );
    }

    // The 8 Show: Season 1
    insertSeason.run('t8s-season-1', 'the-8-show', 1, 'Season 1', now);
    const t8sEpisodes = [
      {
        id: 't8s-s1-e1',
        season_id: 't8s-season-1',
        episode_number: 1,
        title: 'Episode 1: Floor 3',
        description: 'Desperate for money, a young man accepts an anonymous invitation to a surreal multi-level reality contest where every minute spent earns cash.',
        thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        duration: '50m',
        duration_seconds: 3000,
        video_url: ''
      },
      {
        id: 't8s-s1-e2',
        season_id: 't8s-season-1',
        episode_number: 2,
        title: 'Episode 2: The Price of Time',
        description: 'The contestants discover the brutal rules of resource scarcity and the dark methods required to keep the clock ticking.',
        thumbnail: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80',
        duration: '53m',
        duration_seconds: 3180,
        video_url: ''
      }
    ];

    for (const ep of t8sEpisodes) {
      insertEpisode.run(
        ep.id,
        ep.season_id,
        ep.episode_number,
        ep.title,
        ep.description,
        ep.thumbnail,
        ep.duration,
        ep.duration_seconds,
        ep.video_url,
        now,
        now
      );
    }

    // Additional Series Seasons & Episodes (with unconfigured main video, ready for admin)
    const seriesCatalog = [
      {
        contentId: 'money-heist',
        seasonId: 'mh-season-1',
        seasonTitle: 'Part 1',
        episodes: [
          { id: 'mh-s1-e1', epNum: 1, title: 'Episode 1: Do As Planned', desc: 'The Professor recruits eight thieves for an ambitious heist to infiltrate the Royal Mint of Spain.', duration: '47m', durSec: 2820, thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80' },
          { id: 'mh-s1-e2', epNum: 2, title: 'Episode 2: Lethal Negligence', desc: 'Hostage negotiator Raquel Murillo makes first contact with The Professor as police surround the building.', duration: '42m', durSec: 2520, thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        contentId: 'sacred-games',
        seasonId: 'sg-season-1',
        seasonTitle: 'Season 1',
        episodes: [
          { id: 'sg-s1-e1', epNum: 1, title: 'Episode 1: Ashwathama', desc: 'A mysterious phone call from fugitive crime boss Ganesh Gaitonde gives Sartaj Singh 25 days to save Mumbai.', duration: '50m', durSec: 3000, thumb: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80' },
          { id: 'sg-s1-e2', epNum: 2, title: 'Episode 2: Halahala', desc: 'Sartaj pursues leads into Gaitonde’s past while RAW analyst Anjali Radhika investigates suspicious bunker constructions.', duration: '46m', durSec: 2760, thumb: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        contentId: 'mirzapur',
        seasonId: 'mzp-season-1',
        seasonTitle: 'Season 1',
        episodes: [
          { id: 'mzp-s1-e1', epNum: 1, title: 'Episode 1: Jhandu', desc: 'A wedding procession shooting brings the hotheaded Munna Tripathi into conflict with upright lawyer Ramakant Pandit and his sons.', duration: '54m', durSec: 3240, thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80' },
          { id: 'mzp-s1-e2', epNum: 2, title: 'Episode 2: Gooda', desc: 'Guddu and Bablu are forced to make a dangerous choice when Akhandanand Tripathi offers them a seat at his table.', duration: '48m', durSec: 2880, thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        contentId: 'the-family-man',
        seasonId: 'tfm-season-1',
        seasonTitle: 'Season 1',
        episodes: [
          { id: 'tfm-s1-e1', epNum: 1, title: 'Episode 1: The Kalam Factor', desc: 'Srikant Tiwari juggles the demands of his suburban middle-class family while covertly intercepting ISIS operatives for TASC.', duration: '52m', durSec: 3120, thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80' },
          { id: 'tfm-s1-e2', epNum: 2, title: 'Episode 2: Sleepers', desc: 'A chemical plant conspiracy surfaces in Balochistan while Srikant faces disciplinary scrutiny from his daughter’s school principal.', duration: '49m', durSec: 2940, thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        contentId: 'paatal-lok',
        seasonId: 'plk-season-1',
        seasonTitle: 'Season 1',
        episodes: [
          { id: 'plk-s1-e1', epNum: 1, title: 'Episode 1: A Bridge Across the Netherworld', desc: 'Cynical Outer Jamuna Paar cop Hathiram Chaudhary is handed a high-profile assassination investigation involving journalist Sanjeev Mehra.', duration: '46m', durSec: 2760, thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80' },
          { id: 'plk-s1-e2', epNum: 2, title: 'Episode 2: Lost in Transit', desc: 'Interrogating Vishal "Hathoda" Tyagi reveals sinister links stretching from rural Chitrakoot to power corridors of Lutyens Delhi.', duration: '44m', durSec: 2640, thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        contentId: 'panchayat',
        seasonId: 'pan-season-1',
        seasonTitle: 'Season 1',
        episodes: [
          { id: 'pan-s1-e1', epNum: 1, title: 'Episode 1: Gram Panchayat Phulera', desc: 'Engineering graduate Abhishek Tripathi reluctantly joins as Panchayat Secretary in remote rural Uttar Pradesh.', duration: '35m', durSec: 2100, thumb: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80' },
          { id: 'pan-s1-e2', epNum: 2, title: 'Episode 2: Bhoomi Pujan', desc: 'An eco-friendly solar-powered street light installation sparks hilarious turf wars among village elders and Pradhan-Pati.', duration: '34m', durSec: 2040, thumb: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        contentId: 'stranger-things',
        seasonId: 'st-season-1',
        seasonTitle: 'Season 1',
        episodes: [
          { id: 'st-s1-e1', epNum: 1, title: 'Episode 1: Chapter One: The Vanishing of Will Byers', desc: 'On his way home from a friend’s house, young Will Byers encounters something terrifying in Hawkins, Indiana.', duration: '49m', durSec: 2940, thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80' },
          { id: 'st-s1-e2', epNum: 2, title: 'Episode 2: Chapter Two: The Weirdo on Maple Street', desc: 'Lucas, Mike, and Dustin try to talk to the girl they found in the woods as Hopper uncovers government secrets.', duration: '56m', durSec: 3360, thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        contentId: 'chernobyl',
        seasonId: 'chb-season-1',
        seasonTitle: 'Miniseries',
        episodes: [
          { id: 'chb-s1-e1', epNum: 1, title: 'Episode 1: 1:23:45', desc: 'Plant workers and firefighters risk their lives to control a catastrophic 1986 explosion at the Chernobyl nuclear station.', duration: '60m', durSec: 3600, thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80' },
          { id: 'chb-s1-e2', epNum: 2, title: 'Episode 2: Please Remain Calm', desc: 'Valery Legasov and Boris Shcherbina race against time as the raging nuclear graphite fire threatens millions across Europe.', duration: '65m', durSec: 3900, thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        contentId: 'dark',
        seasonId: 'drk-season-1',
        seasonTitle: 'Season 1',
        episodes: [
          { id: 'drk-s1-e1', epNum: 1, title: 'Episode 1: Secrets', desc: 'In 2019, a local boy’s disappearance stokes fear in the residents of Winden, a small German town with a strange history.', duration: '52m', durSec: 3120, thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80' },
          { id: 'drk-s1-e2', epNum: 2, title: 'Episode 2: Lies', desc: 'When a grim discovery baffles the police, Ulrich seeks a search warrant for the nuclear power plant caves.', duration: '45m', durSec: 2700, thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        contentId: 'succession',
        seasonId: 'succ-season-1',
        seasonTitle: 'Season 1',
        episodes: [
          { id: 'succ-s1-e1', epNum: 1, title: 'Episode 1: Celebration', desc: 'On his 80th birthday, media titan Logan Roy shocks his family and board of directors with a surprise announcement.', duration: '61m', durSec: 3660, thumb: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80' },
          { id: 'succ-s1-e2', epNum: 2, title: 'Episode 2: Shit Show at the Factory', desc: 'Logan’s incapacitated condition triggers an internal civil war between Kendall, Roman, Shiv, and company executives.', duration: '57m', durSec: 3420, thumb: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80' }
        ]
      },
      {
        contentId: 'severance',
        seasonId: 'sev-season-1',
        seasonTitle: 'Season 1',
        episodes: [
          { id: 'sev-s1-e1', epNum: 1, title: 'Episode 1: Good News About Hell', desc: 'Mark Scout leads a team at Lumon Industries whose memories have been surgically divided between their work and personal lives.', duration: '57m', durSec: 3420, thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80' },
          { id: 'sev-s1-e2', epNum: 2, title: 'Episode 2: Half Loop', desc: 'The Macrodata Refinement department trains newly severed Helly as Mark meets a mysterious stranger outside work.', duration: '53m', durSec: 3180, thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80' }
        ]
      }
    ];

    for (const s of seriesCatalog) {
      insertSeason.run(s.seasonId, s.contentId, 1, s.seasonTitle, now);
      for (const ep of s.episodes) {
        insertEpisode.run(
          ep.id,
          s.seasonId,
          ep.epNum,
          ep.title,
          ep.desc,
          ep.thumb,
          ep.duration,
          ep.durSec,
          '', // Unconfigured video_url - ready for admin upload/URL
          now,
          now
        );
      }
    }

    // ------------------------------------------------------------------------
    // 4. SEED ADMIN ACCOUNT (SAFE MECHANISM - NO COMMITTED HARDCODED PASSWORDS)
    // ------------------------------------------------------------------------
    let adminPassword = config.devAdminPassword;

    if (!adminPassword) {
      // Auto-generate a random secure development password
      adminGeneratedPassword = crypto.randomBytes(12).toString('base64url') + '!A1';
      adminPassword = adminGeneratedPassword;
      console.log('------------------------------------------------------------');
      console.log('NOTICE: DEV_ADMIN_PASSWORD was not specified.');
      console.log(`Generated development admin password: ${adminGeneratedPassword}`);
      console.log('------------------------------------------------------------');
    }

    const adminSalt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync(adminPassword, adminSalt);
    const adminEmail = config.devAdminEmail.toLowerCase().trim();
    const adminId = 'admin-dev-01';

    const insertAdmin = txDb.prepare(`
      INSERT OR IGNORE INTO users (
        id, name, email, password_hash, role, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE', ?, ?);
    `);
    insertAdmin.run(adminId, 'FLOPSHOW System Admin', adminEmail, adminPasswordHash, now, now);

    const insertAdminWallet = txDb.prepare(`
      INSERT OR IGNORE INTO wallets (user_id, balance, updated_at)
      VALUES (?, 0, ?);
    `);
    insertAdminWallet.run(adminId, now);

    adminCreated = true;
  });

  // Query counts to verify
  const genresCount = (db.prepare('SELECT COUNT(*) as c FROM genres').get() as { c: number }).c;
  const contentCount = (db.prepare('SELECT COUNT(*) as c FROM content').get() as { c: number }).c;
  const seasonsCount = (db.prepare('SELECT COUNT(*) as c FROM seasons').get() as { c: number }).c;
  const episodesCount = (db.prepare('SELECT COUNT(*) as c FROM episodes').get() as { c: number }).c;

  return {
    genresCount,
    contentCount,
    seasonsCount,
    episodesCount,
    adminCreated,
    adminEmail: config.devAdminEmail,
    adminGeneratedPassword
  };
}

// Allow direct CLI execution: tsx backend/src/db/seed.ts
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  try {
    const report = seedDatabase();
    console.log('✓ Database seeded successfully:');
    console.log(`  - Genres: ${report.genresCount}`);
    console.log(`  - Content: ${report.contentCount}`);
    console.log(`  - Seasons: ${report.seasonsCount}`);
    console.log(`  - Episodes: ${report.episodesCount}`);
    console.log(`  - Admin user created: ${report.adminCreated} (${report.adminEmail})`);
    if (report.adminGeneratedPassword) {
      console.log(`  - Temporary admin password: ${report.adminGeneratedPassword}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Database seeding failed:', err);
    process.exit(1);
  }
}
