import { ContentItem } from '../types/content';

// Safe demo video sources (Royalty-free open media)
const DEMO_VIDEO_1 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";
const DEMO_VIDEO_2 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const DEMO_VIDEO_3 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";

/**
 * CENTRALIZED DEMO CATALOG FOR FLOPSHOW
 * All titles, metadata, seasons, and episodes are managed here.
 */
export const DEMO_CATALOG: ContentItem[] = [
  {
    id: "afterglow-2025",
    title: "Afterglow",
    type: "movie",
    categoryLabel: "FEATURED PREMIERE",
    tagline: "One last story waiting in the light between two monsoons.",
    description: "A celebrated photographer returns to the city she left behind and finds one last story waiting in the light between two monsoons.",
    about: "Shot with vintage anamorphic lenses across 35 locations during an actual coastal monsoon season, Afterglow is a quiet, contemplative exploration of nostalgia, unresolved grief, and the elusive nature of memory. Director Arjun Verma crafts a slow-burn masterpiece featuring award-winning sound design and radiant cinematography.",
    rating: 8.7,
    releaseYear: 2025,
    runtime: "2h 08m",
    language: "Hindi",
    genres: ["Drama", "Indie"],
    price: 10,
    isNow: true,
    isFeatured: true,
    director: "Arjun Verma",
    cast: ["Radhika Sen", "Vikramaditya Roy", "Kabir Khan", "Meera Joshi"],
    backdropUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80",
    posterUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80",
    videoUrl: DEMO_VIDEO_1
  },
  {
    id: "monsoon-files-2024",
    title: "The Monsoon Files",
    type: "series",
    categoryLabel: "SERIES • MYSTERY",
    tagline: "When the rain reveals a city's oldest secret.",
    description: "When the rain reveals a city's oldest secret, a young journalist follows a trail that leads much closer to home.",
    about: "Set against the waterlogged alleys and colonial stone archways of an historic port city, The Monsoon Files follows investigative journalist Tara Roy as she unravels a 25-year-old hydro-engineering conspiracy. With gripping multi-layered storylines and complex characters, this series is widely hailed as a watershed moment for modern Indian mystery dramas.",
    rating: 9.1,
    releaseYear: 2024,
    seasonsCount: 2,
    language: "Hindi",
    genres: ["Mystery", "Thriller", "Crime"],
    price: 20,
    isNow: true,
    isFeatured: false,
    director: "S. Banerjee",
    cast: ["Tara Roy", "Devendra Mehta", "Zoya Qureshi", "Nikhil Nair", "Ananya Basu"],
    backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
    posterUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    seasons: [
      {
        seasonNumber: 1,
        title: "Season 1: The First Deluge",
        episodes: [
          {
            id: "tmf-s1-e1",
            seriesId: "monsoon-files-2024",
            seasonNumber: 1,
            episodeNumber: 1,
            title: "Episode 1: The First Deluge",
            duration: "48m",
            durationSeconds: 2880,
            thumbnailUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_1,
            synopsis: "An unidentified artifact surfaces after the century's heaviest cloudburst, pulling rookie reporter Tara into a forgotten cold case."
          },
          {
            id: "tmf-s1-e2",
            seriesId: "monsoon-files-2024",
            seasonNumber: 1,
            episodeNumber: 2,
            title: "Episode 2: Shadows on Water",
            duration: "51m",
            durationSeconds: 3060,
            thumbnailUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_2,
            synopsis: "A cryptic ledger found in the old colonial dockyards points toward high-ranking city officials."
          },
          {
            id: "tmf-s1-e3",
            seriesId: "monsoon-files-2024",
            seasonNumber: 1,
            episodeNumber: 3,
            title: "Episode 3: Rising Tide",
            duration: "46m",
            durationSeconds: 2760,
            thumbnailUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_3,
            synopsis: "Tara faces anonymous threats as the timeline of the 1998 flood incident unmasks a hidden municipal conspiracy."
          },
          {
            id: "tmf-s1-e4",
            seriesId: "monsoon-files-2024",
            seasonNumber: 1,
            episodeNumber: 4,
            title: "Episode 4: The Reservoir",
            duration: "55m",
            durationSeconds: 3300,
            thumbnailUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_1,
            synopsis: "An explosive standoff at the old reservoir reveals who controlled the floodgates on that fateful night."
          }
        ]
      },
      {
        seasonNumber: 2,
        title: "Season 2: Submerged Truths",
        episodes: [
          {
            id: "tmf-s2-e1",
            seriesId: "monsoon-files-2024",
            seasonNumber: 2,
            episodeNumber: 1,
            title: "Episode 1: Submerged Truths",
            duration: "50m",
            durationSeconds: 3000,
            thumbnailUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_2,
            synopsis: "One year later, an unexpected coastal earthquake triggers tremors across the docklands and brings new questions to light."
          },
          {
            id: "tmf-s2-e2",
            seriesId: "monsoon-files-2024",
            seasonNumber: 2,
            episodeNumber: 2,
            title: "Episode 2: Echoes in the Silt",
            duration: "49m",
            durationSeconds: 2940,
            thumbnailUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_3,
            synopsis: "Dredging operations near the backwater creek unearth forensic evidence that turns the original inquiry upside down."
          },
          {
            id: "tmf-s2-e3",
            seriesId: "monsoon-files-2024",
            seasonNumber: 2,
            episodeNumber: 3,
            title: "Episode 3: Broken Levees",
            duration: "53m",
            durationSeconds: 3180,
            thumbnailUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_1,
            synopsis: "Tara partners with a disgraced archivist to break the cipher protecting 30-year-old civic records."
          },
          {
            id: "tmf-s2-e4",
            seriesId: "monsoon-files-2024",
            seasonNumber: 2,
            episodeNumber: 4,
            title: "Episode 4: The Clear Horizon",
            duration: "58m",
            durationSeconds: 3480,
            thumbnailUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_2,
            synopsis: "The climactic truth forces Tara to choose between personal retribution and protecting vulnerable communities."
          }
        ]
      }
    ]
  },
  {
    id: "city-of-dreams-2023",
    title: "City of Dreams",
    type: "movie",
    categoryLabel: "NEO-NOIR THRILLER",
    tagline: "Lights conceal what shadows whisper.",
    description: "In a metropolis illuminated by neon and shadowed by ambition, two detectives navigate a web of deception that stretches from street alleys to corporate penthouses.",
    about: "A gripping neo-noir crime thriller set in the humid underbelly of a mega-city. Pulsing with synthwave rhythms and drenched in cyan-magenta aesthetics, City of Dreams delivers relentless tension and moral complexity.",
    rating: 8.4,
    releaseYear: 2023,
    runtime: "1h 55m",
    language: "Hindi",
    genres: ["Thriller", "Crime"],
    price: 10,
    isNow: false,
    isFeatured: false,
    director: "Karan Kashyap",
    cast: ["Sameer Sen", "Pooja Hegde", "Manoj Bajpayee", "Farhan Akhtar"],
    backdropUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80",
    posterUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80",
    videoUrl: DEMO_VIDEO_2
  },
  {
    id: "winter-signal-2024",
    title: "Winter Signal",
    type: "movie",
    categoryLabel: "SCI-FI SUSPENSE",
    tagline: "Some transmissions should never be answered.",
    description: "Deep in the Himalayan snowpack, an isolated monitoring outpost intercepts an acoustic broadcast that does not originate from Earth.",
    about: "Winter Signal blends atmospheric psychological tension with hard science fiction. As sub-zero storms cut all communications with the valley, four scientists must decide whether to relay a cryptic binary pattern to global satellites or silence it forever.",
    rating: 8.6,
    releaseYear: 2024,
    runtime: "2h 15m",
    language: "Hindi",
    genres: ["Sci-Fi", "Mystery"],
    price: 10,
    isNow: false,
    isFeatured: false,
    director: "Aditya Chopra",
    cast: ["Rahul Bose", "Konkona Sensharma", "Kay Kay Menon", "Jim Sarbh"],
    backdropUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80",
    posterUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80",
    videoUrl: DEMO_VIDEO_3
  },
  {
    id: "red-earth-2025",
    title: "Red Earth",
    type: "movie",
    categoryLabel: "EXPEDITION DOCUMENTARY",
    tagline: "The living soul of timeless landscapes.",
    description: "An evocative visual journey across ancient red clay canyons and resilient communities adapting to the changing rhythms of nature.",
    about: "Captured over three years of intensive field documentary work, Red Earth provides breathtaking panoramic vistas of untouched terrain, geological wonders, and the resilient human spirit that thrives in severe arid climates.",
    rating: 8.9,
    releaseYear: 2025,
    runtime: "1h 40m",
    language: "Hindi",
    genres: ["Documentary", "Nature"],
    price: 0,
    isFree: true,
    isNow: true,
    isFeatured: false,
    director: "Nandita Das",
    cast: ["Narrated by Naseeruddin Shah"],
    backdropUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80",
    posterUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
    videoUrl: DEMO_VIDEO_1
  },
  {
    id: "midnight-express-2024",
    title: "Midnight Express",
    type: "movie",
    categoryLabel: "ACTION THRILLER",
    tagline: "Speed is the only shield.",
    description: "A covert courier aboard an overnight transcontinental train discovers his cargo is a ticking biological catastrophe.",
    about: "A high-octane locked-room action spectacle set inside a speeding steel bullet. With adrenaline-pumping close-quarters stunt choreography, Midnight Express keeps audiences breathless until the terminal stop.",
    rating: 8.2,
    releaseYear: 2024,
    runtime: "2h 02m",
    language: "Hindi",
    genres: ["Action", "Thriller"],
    price: 10,
    isNow: false,
    isFeatured: false,
    director: "Ali Abbas Zafar",
    cast: ["Vidyut Jammwal", "Rakul Preet Singh", "Jaideep Ahlawat"],
    backdropUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1600&q=80",
    posterUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=600&q=80",
    videoUrl: DEMO_VIDEO_2
  },
  {
    id: "chronicles-kashi-2025",
    title: "Chronicles of Kashi",
    type: "series",
    categoryLabel: "HISTORICAL DRAMA",
    tagline: "The river never forgets.",
    description: "Generations of silk weavers and river boatmen preserve an ancient mystery along the timeless ghats of Varanasi.",
    about: "An opulent multi-generational saga spanning seventy years of India's cultural tapestry. Chronicles of Kashi immerses viewers into sacred rituals, hidden guild rivalries, and philosophical triumphs along the banks of the Ganges.",
    rating: 9.3,
    releaseYear: 2025,
    seasonsCount: 1,
    language: "Hindi",
    genres: ["Drama", "Mystery"],
    price: 20,
    isNow: true,
    isFeatured: false,
    director: "Anurag Kashyap",
    cast: ["Pankaj Tripathi", "Tillotama Shome", "Vijay Varma", "Shweta Tripathi"],
    backdropUrl: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1600&q=80",
    posterUrl: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=600&q=80",
    seasons: [
      {
        seasonNumber: 1,
        title: "Season 1: Golden Silks",
        episodes: [
          {
            id: "ck-s1-e1",
            seriesId: "chronicles-kashi-2025",
            seasonNumber: 1,
            episodeNumber: 1,
            title: "Episode 1: The Weaver's Loom",
            duration: "54m",
            durationSeconds: 3240,
            thumbnailUrl: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_3,
            synopsis: "In 1952, a master artisan hides an imperial heirloom inside the weave of a consecrated prayer mantle."
          },
          {
            id: "ck-s1-e2",
            seriesId: "chronicles-kashi-2025",
            seasonNumber: 1,
            episodeNumber: 2,
            title: "Episode 2: River at Midnight",
            duration: "49m",
            durationSeconds: 2940,
            thumbnailUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_1,
            synopsis: "The boatmen's guild encounters an unmoored skiff bearing sealed urns from the northern foothills."
          },
          {
            id: "ck-s1-e3",
            seriesId: "chronicles-kashi-2025",
            seasonNumber: 1,
            episodeNumber: 3,
            title: "Episode 3: The Brass Bell",
            duration: "52m",
            durationSeconds: 3120,
            thumbnailUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80",
            videoUrl: DEMO_VIDEO_2,
            synopsis: "A sacred bell silenced for forty years chimes during an eclipse, setting off rival family claims."
          }
        ]
      }
    ]
  },
  {
    id: "the-last-ghazal-2025",
    title: "The Last Ghazal",
    type: "movie",
    categoryLabel: "MUSICAL ROMANCE",
    tagline: "Two voices. One eternal harmony.",
    description: "A fading classical maestro and a rebellious indie lyricist collide in Old Delhi to craft one timeless melody.",
    about: "Filled with soulful thumris and modern indie-fusion anthems, The Last Ghazal is a tender romantic drama about generational reconciliation, heritage, and the healing power of acoustic resonance.",
    rating: 8.8,
    releaseYear: 2025,
    runtime: "2h 12m",
    language: "Hindi",
    genres: ["Romance", "Drama"],
    price: 10,
    isNow: false,
    isFeatured: false,
    director: "Mira Nair",
    cast: ["Shubha Mudgal", "Ishaan Khatter", "Wamiqa Gabbi"],
    backdropUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80",
    posterUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    videoUrl: DEMO_VIDEO_3
  }
];

export const GENRE_LIST = [
  "All",
  "Drama",
  "Mystery",
  "Thriller",
  "Sci-Fi",
  "Documentary",
  "Action",
  "Romance",
  "Indie"
];
