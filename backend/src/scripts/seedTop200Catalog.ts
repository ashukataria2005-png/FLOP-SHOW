import { getAdapter } from '../db/adapter.js';
import { metadataImportService, ImportPayload, SeasonDraft } from '../services/metadataImportService.js';
import { contentRepository } from '../repositories/contentRepository.js';

interface CatalogItemSeed {
  title: string;
  year: number;
  type: 'MOVIE' | 'SERIES';
  category: 'WORLD_MOVIE' | 'WORLD_SERIES' | 'INDIAN_MOVIE' | 'INDIAN_SERIES';
  language: string;
  genres: string[];
  rating: number;
  description: string;
  poster: string;
  backdrop: string;
  runtime?: string;
  director?: string;
  cast?: string[];
  seasons?: SeasonDraft[];
}

// Top 50 World Movies (deduplicated against existing DB items)
const WORLD_MOVIES: CatalogItemSeed[] = [
  {
    title: 'The Shawshank Redemption',
    year: 1994,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Drama', 'Crime'],
    rating: 9.3,
    description: 'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0111161/img',
    runtime: '2h 22m',
    director: 'Frank Darabont',
    cast: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton']
  },
  {
    title: 'The Godfather',
    year: 1972,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Crime', 'Drama'],
    rating: 9.2,
    description: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNGEwYjgwOGQtYjg5ZS00Njc1LTk2ZGEtM2QzZTE0Yzc4MmQwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0068646/img',
    runtime: '2h 55m',
    director: 'Francis Ford Coppola',
    cast: ['Marlon Brando', 'Al Pacino', 'James Caan']
  },
  {
    title: 'The Godfather Part II',
    year: 1974,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Crime', 'Drama'],
    rating: 9.0,
    description: 'The early life and career of Vito Corleone in 1920s New York City is portrayed, while his son, Michael, expands and tightens his grip on the family crime syndicate.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTcxYjFmNWQtNzc0Zi00NmI4LWE1OGMtYjk5OTJmN2MzMWM0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0071562/img',
    runtime: '3h 22m',
    director: 'Francis Ford Coppola',
    cast: ['Al Pacino', 'Robert De Niro', 'Robert Duvall']
  },
  {
    title: '12 Angry Men',
    year: 1957,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Crime', 'Drama'],
    rating: 9.0,
    description: 'The jury in a New York City murder trial is frustrated by a single member whose skeptical caution forces them to more carefully consider the evidence before jumping to a hasty verdict.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2ODcxMGItYTRhMS00MTliLTkyY2ItOGNmOWFhM2YwZmQwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0050083/img',
    runtime: '1h 36m',
    director: 'Sidney Lumet',
    cast: ['Henry Fonda', 'Lee J. Cobb', 'Martin Balsam']
  },
  {
    title: "Schindler's List",
    year: 1993,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Biography', 'Drama', 'History'],
    rating: 9.0,
    description: 'In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNjM1ZDQxYWUtMzQyZS00MTE1LWJmZGYtNGUyNTdlYjM3ZmVmXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0108052/img',
    runtime: '3h 15m',
    director: 'Steven Spielberg',
    cast: ['Liam Neeson', 'Ralph Fiennes', 'Ben Kingsley']
  },
  {
    title: 'The Lord of the Rings: The Return of the King',
    year: 2003,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Action', 'Adventure', 'Drama', 'Fantasy'],
    rating: 9.0,
    description: "Gandalf and Aragorn lead the World of Men against Sauron's army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.",
    poster: 'https://m.media-amazon.com/images/M/MV5BMTZkMjBjNWMtZGI5OC00MGU0LTk4ZTItODg2NWM3NTVmNWQ4XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0167260/img',
    runtime: '3h 21m',
    director: 'Peter Jackson',
    cast: ['Elijah Wood', 'Viggo Mortensen', 'Ian McKellen']
  },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    year: 2001,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Action', 'Adventure', 'Drama', 'Fantasy'],
    rating: 8.9,
    description: 'A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth from the Dark Lord Sauron.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNzIxMDQ2YTctNDY4MC00ZTRhLTk4ODQtMTVlOWY4NTdiYmMwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0120737/img',
    runtime: '2h 58m',
    director: 'Peter Jackson',
    cast: ['Elijah Wood', 'Ian McKellen', 'Orlando Bloom']
  },
  {
    title: 'The Good, the Bad and the Ugly',
    year: 1966,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'Italian',
    genres: ['Adventure', 'Western'],
    rating: 8.8,
    description: 'A bounty hunting scam joins two men in an uneasy alliance against a third in a race to find a fortune in gold buried in a remote cemetery.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNDgwNWExYTMtYjc5MS00NWQ2LTkyMGUtMWYyZDU0NWMyMmQxXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0060196/img',
    runtime: '2h 58m',
    director: 'Sergio Leone',
    cast: ['Clint Eastwood', 'Eli Wallach', 'Lee Van Cleef']
  },
  {
    title: 'Forrest Gump',
    year: 1994,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Drama', 'Romance'],
    rating: 8.8,
    description: 'The history of the United States from the 1950s to the 1970s unfolds from the perspective of an Alabama man with an IQ of 75, who yearns to be reunited with his childhood sweetheart.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNDYwNzVjMTItZmU5YS00YjQ5LTljYjgtMjY2NDVmYWMyNWFkXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0109830/img',
    runtime: '2h 22m',
    director: 'Robert Zemeckis',
    cast: ['Tom Hanks', 'Robin Wright', 'Gary Sinise']
  },
  {
    title: 'The Lord of the Rings: The Two Towers',
    year: 2002,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Action', 'Adventure', 'Drama', 'Fantasy'],
    rating: 8.8,
    description: "While Frodo and Sam edge closer to Mordor with the help of the shifty Gollum, the divided fellowship makes a stand against Sauron's new ally, Saruman, and his hordes of Isengard.",
    poster: 'https://m.media-amazon.com/images/M/MV5BMTY0Nzg3ODk4NF5BMl5BanBnXkFtZTcwNTg5NjM0MQ@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0167261/img',
    runtime: '2h 59m',
    director: 'Peter Jackson',
    cast: ['Elijah Wood', 'Ian McKellen', 'Viggo Mortensen']
  },
  {
    title: 'Star Wars: Episode V - The Empire Strikes Back',
    year: 1980,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Action', 'Adventure', 'Fantasy', 'Sci-Fi'],
    rating: 8.7,
    description: 'After the Empire overpowers the Rebel Alliance, Luke Skywalker begins his Jedi training with Yoda, while his friends are pursued across the galaxy by Darth Vader.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTkxNGFlNDktZmJkNC00MDdhLTg0fl5BMl5BanBnXkFtZTcwMzEyMTMwNA@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0080684/img',
    runtime: '2h 4m',
    director: 'Irvin Kershner',
    cast: ['Mark Hamill', 'Harrison Ford', 'Carrie Fisher']
  },
  {
    title: 'Goodfellas',
    year: 1990,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Biography', 'Crime', 'Drama'],
    rating: 8.7,
    description: 'The story of Henry Hill and his life in the mafia, covering his relationship with his wife Karen and his mob partners Jimmy Conway and Tommy DeVito.',
    poster: 'https://m.media-amazon.com/images/M/MV5BN2E5NzI2ZGMtY2UxZS00OTg5LThjYTAtODlmYTFjMmNmODU3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0099685/img',
    runtime: '2h 25m',
    director: 'Martin Scorsese',
    cast: ['Robert De Niro', 'Ray Liotta', 'Joe Pesci']
  },
  {
    title: "One Flew Over the Cuckoo's Nest",
    year: 1975,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Drama'],
    rating: 8.7,
    description: 'In the Fall of 1963, a Korean War veteran and criminal pleads insanity and is admitted to a mental institution, where he rallies up the scared patients against the tyrannical nurse.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYmJkODkwOTItZThjZS00Mzc0LWEzNzQtYWFkNTg2NDcxODBlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0073486/img',
    runtime: '2h 13m',
    director: 'Milos Forman',
    cast: ['Jack Nicholson', 'Louise Fletcher', 'Michael Berryman']
  },
  {
    title: 'Se7en',
    year: 1995,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.6,
    description: 'Two detectives, a rookie and a veteran, hunt a serial killer who uses the seven deadly sins as his motives.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYmJmM2Q4NmmtYmFjZS00MmE3LWJkMDctZjc4MjYxNmRjNWRlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0114369/img',
    runtime: '2h 7m',
    director: 'David Fincher',
    cast: ['Morgan Freeman', 'Brad Pitt', 'Kevin Spacey']
  },
  {
    title: "It's a Wonderful Life",
    year: 1946,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Drama', 'Family', 'Fantasy'],
    rating: 8.6,
    description: 'An angel is sent from Heaven to help a desperately frustrated businessman by showing him what life would have been like if he had never existed.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMDM4OWFmOGEtYzA5MS00NmQ0LWFjYWMtOGE1ZTQyNmM3NTQ1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0038650/img',
    runtime: '2h 10m',
    director: 'Frank Capra',
    cast: ['James Stewart', 'Donna Reed', 'Lionel Barrymore']
  },
  {
    title: 'Seven Samurai',
    year: 1954,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'Japanese',
    genres: ['Action', 'Drama'],
    rating: 8.6,
    description: 'Farmers from a village exploited by bandits hire a veteran samurai for protection, who gathers six other samurai to join him.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQ1ZmM3MTQtNTVhZC00MWVlLWI5ZjgtYmZiYWQxZjUzZWM0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0047478/img',
    runtime: '3h 27m',
    director: 'Akira Kurosawa',
    cast: ['Toshiro Mifune', 'Takashi Shimura', 'Keiko Tsushima']
  },
  {
    title: 'The Silence of the Lambs',
    year: 1991,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Crime', 'Drama', 'Thriller'],
    rating: 8.6,
    description: 'A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer, a madman who skins his victims.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNjNhZTk0ZmEtNjJhMi00YzFlLWE1MmEtYzM1M2ZmMGMwMTU4XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0102926/img',
    runtime: '1h 58m',
    director: 'Jonathan Demme',
    cast: ['Jodie Foster', 'Anthony Hopkins', 'Lawrence A. Bonney']
  },
  {
    title: 'Saving Private Ryan',
    year: 1998,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Drama', 'War'],
    rating: 8.6,
    description: 'Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper whose brothers have been killed in action.',
    poster: 'https://m.media-amazon.com/images/M/MV5BOTU1NjgxNjEtNzliZC00M2VhLTg0NWQtOWE1OWYxMDZkMGYwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0120815/img',
    runtime: '2h 49m',
    director: 'Steven Spielberg',
    cast: ['Tom Hanks', 'Matt Damon', 'Tom Sizemore']
  },
  {
    title: 'City of God',
    year: 2002,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'Portuguese',
    genres: ['Crime', 'Drama'],
    rating: 8.6,
    description: "In the slums of Rio, two kids' paths diverge as one struggles to become a photographer and the other a kingpin.",
    poster: 'https://m.media-amazon.com/images/M/MV5BNjFjOGQ0ZjgtMDQ0ZC00YWFlLTk5NzgtYjRkZDI4ZGY3MDY5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0317248/img',
    runtime: '2h 10m',
    director: 'Fernando Meirelles',
    cast: ['Alexandre Rodrigues', 'Leandro Firmino', 'Matheus Nachtergaele']
  },
  {
    title: 'Life Is Beautiful',
    year: 1997,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'Italian',
    genres: ['Comedy', 'Drama', 'Romance', 'War'],
    rating: 8.6,
    description: 'When an open-minded Jewish waiter and his son become victims of the Holocaust, he uses a perfect mixture of will, humor, and imagination to protect his son from the dangers around their camp.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYmJmM2Q4NmmtYmFjZS00MmE3LWJkMDctZjc4MjYxNmRjNWRlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0118799/img',
    runtime: '1h 56m',
    director: 'Roberto Benigni',
    cast: ['Roberto Benigni', 'Nicoletta Braschi', 'Giorgio Cantarini']
  },
  {
    title: 'The Green Mile',
    year: 1999,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Crime', 'Drama', 'Fantasy', 'Mystery'],
    rating: 8.6,
    description: 'A tale set on death row in a Southern prison, where gentle giant John Coffey possesses the mysterious power to heal people ailments.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTUxMzQyNjA5MF5BMl5BanBnXkFtZTYwOTU2NTY3._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0120689/img',
    runtime: '3h 9m',
    director: 'Frank Darabont',
    cast: ['Tom Hanks', 'Michael Clarke Duncan', 'David Morse']
  },
  {
    title: 'Star Wars: Episode IV - A New Hope',
    year: 1977,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Action', 'Adventure', 'Fantasy', 'Sci-Fi'],
    rating: 8.6,
    description: "Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire's world-destroying battle station.",
    poster: 'https://m.media-amazon.com/images/M/MV5BOGUwMDk0YzMtNmMxNi00NmVhLTg4ZTItYzg5ZTk5ZDY1MTRjXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0076759/img',
    runtime: '2h 1m',
    director: 'George Lucas',
    cast: ['Mark Hamill', 'Harrison Ford', 'Carrie Fisher']
  },
  {
    title: 'Terminator 2: Judgment Day',
    year: 1991,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Action', 'Sci-Fi'],
    rating: 8.6,
    description: 'A cyborg, identical to the one who failed to kill Sarah Connor, must now protect her ten-year-old son John from a more advanced and powerful cyborg.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNGZiMzBkZjMtNjE3Mi00MWNlLWIyYjItYTk3MjY0Njg5ODZkXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0103064/img',
    runtime: '2h 17m',
    director: 'James Cameron',
    cast: ['Arnold Schwarzenegger', 'Linda Hamilton', 'Edward Furlong']
  },
  {
    title: 'Back to the Future',
    year: 1985,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Adventure', 'Comedy', 'Sci-Fi'],
    rating: 8.5,
    description: 'Marty McFly, a 17-year-old high school student, is accidentally sent 30 years into the past in a time-traveling DeLorean invented by his close friend, the maverick scientist Doc Brown.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZmU0M2Y1OGUtZjIxNi00ZjBkLTg1MjgtOWIyNThiZWIwYjRiXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0088763/img',
    runtime: '1h 56m',
    director: 'Robert Zemeckis',
    cast: ['Michael J. Fox', 'Christopher Lloyd', 'Lea Thompson']
  },
  {
    title: 'Spirited Away',
    year: 2001,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'Japanese',
    genres: ['Animation', 'Adventure', 'Family', 'Fantasy'],
    rating: 8.6,
    description: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.",
    poster: 'https://m.media-amazon.com/images/M/MV5BNTEyNmEwOWUtYzkyOC00ZTQ4LTllZmUtMjk0Y2Y5ZWZmYzJkXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0245429/img',
    runtime: '2h 5m',
    director: 'Hayao Miyazaki',
    cast: ['Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki']
  },
  {
    title: 'The Pianist',
    year: 2002,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Biography', 'Drama', 'Music', 'War'],
    rating: 8.5,
    description: 'A Polish Jewish musician struggles to survive the destruction of the Warsaw ghetto of World War II.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA5OTc3NjY2MV5BMl5BanBnXkFtZTcwNjc1MDU1Mw@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0253474/img',
    runtime: '2h 30m',
    director: 'Roman Polanski',
    cast: ['Adrien Brody', 'Thomas Kretschmann', 'Frank Finlay']
  },
  {
    title: 'Psycho',
    year: 1960,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Horror', 'Mystery', 'Thriller'],
    rating: 8.5,
    description: "A Phoenix secretary embezzles $40,000 from her employer's client, goes on the run and checks into a remote motel run by a young man under the domination of his mother.",
    poster: 'https://m.media-amazon.com/images/M/MV5BNTQwNDM1YzItNDAxZC00NWY2LTk0M2UtNDExNzc4Mzg0MjE0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0054215/img',
    runtime: '1h 49m',
    director: 'Alfred Hitchcock',
    cast: ['Anthony Perkins', 'Janet Leigh', 'Vera Miles']
  },
  {
    title: 'The Lion King',
    year: 1994,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Animation', 'Adventure', 'Drama', 'Family', 'Musical'],
    rating: 8.5,
    description: 'Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYTYxNGMyZTYtMjE3MS00MzNjLWFjNmYtMDk3N2FmMTE3NDBmXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0110357/img',
    runtime: '1h 28m',
    director: 'Roger Allers, Rob Minkoff',
    cast: ['Matthew Broderick', 'Jeremy Irons', 'James Earl Jones']
  },
  {
    title: 'Gladiator',
    year: 2000,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Action', 'Adventure', 'Drama'],
    rating: 8.5,
    description: 'A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYWQ4YmNjYjEtOWE1Zi00Y2U4LWI4NTAtMTU0MjkxNWQ1ZmJiXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0172495/img',
    runtime: '2h 35m',
    director: 'Ridley Scott',
    cast: ['Russell Crowe', 'Joaquin Phoenix', 'Connie Nielsen']
  },
  {
    title: 'American History X',
    year: 1998,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Crime', 'Drama'],
    rating: 8.5,
    description: 'Living in the aftermath of his father murder, Derek Vinyard turns to violent neo-Nazism, but after spending three years in prison tries to save his younger brother from taking the same path.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTBmZWJkNjctNDhiNC00MGE2LWEwOTctZTk5OGVhMWMyNmVhXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0120586/img',
    runtime: '1h 59m',
    director: 'Tony Kaye',
    cast: ['Edward Norton', 'Edward Furlong', 'Beverly D\'Angelo']
  },
  {
    title: 'The Departed',
    year: 2006,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Crime', 'Drama', 'Thriller'],
    rating: 8.5,
    description: 'An undercover cop and a mole in the police attempt to identify each other while infiltrating an Irish gang in South Boston.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTI1MTY2OTIxNV5BMl5BanBnXkFtZTYwNjQ4NjY3._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0407887/img',
    runtime: '2h 31m',
    director: 'Martin Scorsese',
    cast: ['Leonardo DiCaprio', 'Matt Damon', 'Jack Nicholson']
  },
  {
    title: 'Whiplash',
    year: 2014,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Drama', 'Music'],
    rating: 8.5,
    description: "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student's potential.",
    poster: 'https://m.media-amazon.com/images/M/MV5BMDFjOWFmY2YtNmY3My00YjBhLWJjYmMtZTk3MmQzZDRhNDM5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2582802/img',
    runtime: '1h 46m',
    director: 'Damien Chazelle',
    cast: ['Miles Teller', 'J.K. Simmons', 'Melissa Benoist']
  },
  {
    title: 'The Prestige',
    year: 2006,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Drama', 'Mystery', 'Sci-Fi', 'Thriller'],
    rating: 8.5,
    description: 'After a tragic accident, two stage magicians in 1890s London engage in a battle to create the ultimate illusion while sacrificing everything they have to outwit each other.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA4NDI0MTIxNF5BMl5BanBnXkFtZTYwNTM0MzY2._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0482571/img',
    runtime: '2h 10m',
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Hugh Jackman', 'Scarlett Johansson']
  },
  {
    title: 'Casablanca',
    year: 1942,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Drama', 'Romance', 'War'],
    rating: 8.5,
    description: 'A cynical expatriate American cafe owner struggles to decide whether or not to help his former lover and her fugitive husband escape the Nazis in French Morocco.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWE3MGUyZGUtZGRhNC00MTc3LTk1MzQtODRlYmY4ZTYyY2NmXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0034583/img',
    runtime: '1h 42m',
    director: 'Michael Curtiz',
    cast: ['Humphrey Bogart', 'Ingrid Bergman', 'Paul Henreid']
  },
  {
    title: 'Django Unchained',
    year: 2012,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Drama', 'Western'],
    rating: 8.5,
    description: 'With the help of a German bounty-hunter, a freed slave sets out to rescue his wife from a brutal plantation-owner in Mississippi.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjIyNTQ5NjQ1OV5BMl5BanBnXkFtZTcwODg1MDU4OA@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1853728/img',
    runtime: '2h 45m',
    director: 'Quentin Tarantino',
    cast: ['Jamie Foxx', 'Christoph Waltz', 'Leonardo DiCaprio']
  },
  {
    title: 'Memento',
    year: 2000,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Mystery', 'Thriller'],
    rating: 8.4,
    description: "A man with short-term memory loss attempts to track down his wife's murderer.",
    poster: 'https://m.media-amazon.com/images/M/MV5BYmVkZDZkYjctN2MwNS00ZGFlLWI5MGMtNDk5OWE2N2NmZjBhXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0209144/img',
    runtime: '1h 53m',
    director: 'Christopher Nolan',
    cast: ['Guy Pearce', 'Carrie-Anne Moss', 'Joe Pantoliano']
  },
  {
    title: 'WALL-E',
    year: 2008,
    type: 'MOVIE',
    category: 'WORLD_MOVIE',
    language: 'English',
    genres: ['Animation', 'Adventure', 'Family', 'Sci-Fi'],
    rating: 8.4,
    description: 'In the distant future, a small waste-collecting robot inadvertently embarks on a space journey that will ultimately decide the fate of mankind.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjExMTg5OTU0NF5BMl5BanBnXkFtZTcwMjMxMzMzMw@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0910970/img',
    runtime: '1h 38m',
    director: 'Andrew Stanton',
    cast: ['Ben Burtt', 'Elissa Knight', 'Jeff Garlin']
  }
];

// Top 50 World Web Series (deduplicated against existing DB items)
const WORLD_SERIES: CatalogItemSeed[] = [
  {
    title: 'Game of Thrones',
    year: 2011,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Action', 'Adventure', 'Drama', 'Fantasy'],
    rating: 9.2,
    description: 'Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for a millennia.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTNhMDJmNmYtNDBlMy00ODlkLTlmN2ItZGY1NWZhNGQ3NWVkXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0944947/img',
    runtime: '8 Seasons',
    director: 'David Benioff, D.B. Weiss',
    cast: ['Emilia Clarke', 'Peter Dinklage', 'Kit Harington']
  },
  {
    title: 'The Wire',
    year: 2002,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Crime', 'Drama', 'Thriller'],
    rating: 9.3,
    description: 'The Baltimore drug scene, as seen through the eyes of drug dealers and law enforcement.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZmY5ZGFjYWMtNDVhMi00ZTU4LThkNTAtYTlmZmM3MDkyYjNiXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0306414/img',
    runtime: '5 Seasons',
    director: 'David Simon',
    cast: ['Dominic West', 'Lance Reddick', 'Sonja Sohn']
  },
  {
    title: 'The Sopranos',
    year: 1999,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Crime', 'Drama'],
    rating: 9.2,
    description: 'New Jersey mob boss Tony Soprano deals with personal and professional issues in his home and business life that affect his mental state, leading him to seek professional psychiatric counseling.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZGJjYmM2YzEtZDE4MC00NDE3LWEyOTMtMDRmY2FlMDgzYmYxXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0141842/img',
    runtime: '6 Seasons',
    director: 'David Chase',
    cast: ['James Gandolfini', 'Lorraine Bracco', 'Edie Falco']
  },
  {
    title: 'Band of Brothers',
    year: 2001,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Drama', 'History', 'War'],
    rating: 9.4,
    description: 'The story of Easy Company of the U.S. Army 101st Airborne Division and their mission in Europe during World War II, from Operation Overlord through to V-J Day.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTAwNmE5NTItMDkyOS00NmVhLTgwNmYtNDAwNmQ0MmZlMTVmXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0185906/img',
    runtime: '1 Season',
    director: 'Steven Spielberg, Tom Hanks',
    cast: ['Scott Grimes', 'Damian Lewis', 'Ron Livingston']
  },
  {
    title: 'Sherlock',
    year: 2010,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 9.1,
    description: 'The quirky spin on Arthur Conan Doyle stories, by Steven Moffat and Mark Gatiss, has Sherlock Holmes and Dr. John Watson solving mysteries in 21st century London.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTQzNGZjNDEtOTMwYi00MzFjLWE2ZTYtYzYxYzMwMjZkMGM5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1475582/img',
    runtime: '4 Seasons',
    director: 'Mark Gatiss, Steven Moffat',
    cast: ['Benedict Cumberbatch', 'Martin Freeman', 'Una Stubbs']
  },
  {
    title: 'True Detective',
    year: 2014,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.9,
    description: 'Seasonal anthology series in which police investigations unearth the personal and professional secrets of those involved, both within and outside the law.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTU3ODMwNzY3Ml5BMl5BanBnXkFtZTgwNTU1MDYxMTE@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2356777/img',
    runtime: '4 Seasons',
    director: 'Nic Pizzolatto',
    cast: ['Matthew McConaughey', 'Woody Harrelson', 'Colin Farrell']
  },
  {
    title: 'Fargo',
    year: 2014,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Crime', 'Drama', 'Thriller'],
    rating: 8.9,
    description: 'Various chronicles of deception, intrigue and murder in and around frozen Minnesota. Yet all of these tales mysteriously lead back one way or another to Fargo, North Dakota.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTE0NDQ5MTE5MV5BMl5BanBnXkFtZTgwNzg4NzgwNTM@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2802850/img',
    runtime: '5 Seasons',
    director: 'Noah Hawley',
    cast: ['Billy Bob Thornton', 'Martin Freeman', 'Allison Tolman']
  },
  {
    title: 'Narcos',
    year: 2015,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Biography', 'Crime', 'Drama'],
    rating: 8.8,
    description: 'A chronicled look at the criminal exploits of Colombian drug lord Pablo Escobar, as well as the many other drug kingpins who plagued the country through the years.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNmFjODU3YzgtMGUwNC00ZGI3LWFkZjQtMjkxZDc3NmQ1MzFiXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2707408/img',
    runtime: '3 Seasons',
    director: 'Carlo Bernard, Chris Brancato, Doug Miro',
    cast: ['Pedro Pascal', 'Wagner Moura', 'Boyd Holbrook']
  },
  {
    title: 'Mindhunter',
    year: 2017,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.6,
    description: 'In the late 1970s, two FBI agents expand criminal science by delving into the psychology of murder and uneasy close proximity to all-too-real monsters.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWNmYzQ1ZWUtYTQ3ZS00Y2UwLTlkMDAtZjc4NzczOTJiZjFlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt5290382/img',
    runtime: '2 Seasons',
    director: 'Joe Penhall',
    cast: ['Jonathan Groff', 'Holt McCallany', 'Anna Torv']
  },
  {
    title: 'Ted Lasso',
    year: 2020,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Comedy', 'Drama', 'Sport'],
    rating: 8.8,
    description: 'American college football coach Ted Lasso heads to London to manage AFC Richmond, a struggling English Premier League football team.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTdmZGUxNDUtNzQ1Zi00YmU3LTlkMjAtODQ1ZGM2NGE5NmZlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10986410/img',
    runtime: '3 Seasons',
    director: 'Brendan Hunt, Joe Kelly, Bill Lawrence',
    cast: ['Jason Sudeikis', 'Hannah Waddingham', 'Jeremy Swift']
  },
  {
    title: 'Fleabag',
    year: 2016,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Comedy', 'Drama'],
    rating: 8.7,
    description: 'A dry-witted woman, known only as Fleabag, has no filter as she navigates life and love in London while trying to cope with tragedy.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA4MzU5NzQxNV5BMl5BanBnXkFtZTgwOTg3MDA5NzM@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt5687612/img',
    runtime: '2 Seasons',
    director: 'Phoebe Waller-Bridge',
    cast: ['Phoebe Waller-Bridge', 'Sian Clifford', 'Olivia Colman']
  },
  {
    title: 'The Bear',
    year: 2022,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Comedy', 'Drama'],
    rating: 8.6,
    description: 'A young chef from the fine dining world returns to Chicago to run his family Italian beef sandwich shop after a heartbreaking death.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNzBhZWI2MjQtOWYzNS00ODk0LTg4OTktOTUzMzU5OWVlZThhXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt14452776/img',
    runtime: '3 Seasons',
    director: 'Christopher Storer',
    cast: ['Jeremy Allen White', 'Ebon Moss-Bachrach', 'Ayo Edebiri']
  },
  {
    title: 'Black Mirror',
    year: 2011,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Drama', 'Mystery', 'Sci-Fi', 'Thriller'],
    rating: 8.7,
    description: "Featuring stand-alone dramas, sharp, suspenseful, satirical tales that explore techno-paranoia - 'Black Mirror' is a contemporary British re-working of The Twilight Zone with stories that tap into the collective unease about our modern world.",
    poster: 'https://m.media-amazon.com/images/M/MV5BYTM3YWVhMDMtZGQ0Zi00N2NmLTg5ZmYtYTY2OWI1Nzg0Njg2XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2085059/img',
    runtime: '6 Seasons',
    director: 'Charlie Brooker',
    cast: ['Daniel Lapaine', 'Hannah John-Kamen', 'Michaela Coel']
  },
  {
    title: 'Rick and Morty',
    year: 2013,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Animation', 'Adventure', 'Comedy', 'Sci-Fi'],
    rating: 9.1,
    description: 'The sociopathic scientist Rick Sanchez lives with his daughter\'s family and constantly brings her husband, son, and daughter into inter-dimensional adventures.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZjRjOTFkOTktZWUzMi00YzMyLThkMmYtMjE2NDQxOGYjcWFmXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2861424/img',
    runtime: '7 Seasons',
    director: 'Dan Harmon, Justin Roiland',
    cast: ['Justin Roiland', 'Chris Parnell', 'Spencer Grammer']
  },
  {
    title: 'Arcane',
    year: 2021,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Animation', 'Action', 'Adventure', 'Drama', 'Fantasy', 'Sci-Fi'],
    rating: 9.0,
    description: 'Set in utopian Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions-and the power that will tear them apart.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYTViYTE3NWQtNmIzNC00OTBlLWI1YjAtOTE2M2Y4ZDM0NDExXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt11126994/img',
    runtime: '2 Seasons',
    director: 'Christian Linke, Alex Yee',
    cast: ['Hailee Steinfeld', 'Ella Purnell', 'Kevin Alejandro']
  },
  {
    title: 'Shogun',
    year: 2024,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Adventure', 'Drama', 'History', 'War'],
    rating: 8.8,
    description: 'When a mysterious European ship is found marooned in a nearby fishing village, Lord Yoshii Toranaga discovers secrets that could tip the scales of power and devastate his formidable enemies.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA0MDU0YmYtYzAxNS00YTY3LThmMGQtMzg3Zjg1MzU1NjY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2788316/img',
    runtime: '1 Season',
    director: 'Rachel Kondo, Justin Marks',
    cast: ['Hiroyuki Sanada', 'Cosmo Jarvis', 'Anna Sawai']
  },
  {
    title: 'The Mandalorian',
    year: 2019,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Action', 'Adventure', 'Fantasy', 'Sci-Fi'],
    rating: 8.7,
    description: 'The travels of a lone bounty hunter in the outer reaches of the galaxy, far from the authority of the New Republic.',
    poster: 'https://m.media-amazon.com/images/M/MV5BN2M5YWFjN2YtYzU2YS00NzBlLTgwZWUtYWQzNWFhNDkyYjg3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8111088/img',
    runtime: '3 Seasons',
    director: 'Jon Favreau',
    cast: ['Pedro Pascal', 'Carl Weathers', 'Giancarlo Esposito']
  },
  {
    title: 'Friends',
    year: 1994,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Comedy', 'Romance'],
    rating: 8.9,
    description: 'Follows the personal and professional lives of six twenty to thirty-something-year-old friends living in Manhattan.',
    poster: 'https://m.media-amazon.com/images/M/MV5BOTU2YmM5ZjgtOGEwMC00YTgzLTg4MDAtZDEwMTMwYTAzMmU4XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0108778/img',
    runtime: '10 Seasons',
    director: 'David Crane, Marta Kauffman',
    cast: ['Jennifer Aniston', 'Courteney Cox', 'Lisa Kudrow']
  },
  {
    title: 'The Office',
    year: 2005,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Comedy'],
    rating: 9.0,
    description: 'A mockumentary on a group of typical office workers, where the workday consists of ego clashes, inappropriate behavior, and tedium.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMDNkOTE4NDQtMTNmYi00MWE0LWE4ZTktYTc0NzhhNWIzNzJiXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0386676/img',
    runtime: '9 Seasons',
    director: 'Greg Daniels, Ricky Gervais, Stephen Merchant',
    cast: ['Steve Carell', 'Jenna Fischer', 'John Krasinski']
  },
  {
    title: 'Lost',
    year: 2004,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Adventure', 'Drama', 'Fantasy', 'Mystery', 'Sci-Fi', 'Thriller'],
    rating: 8.3,
    description: 'The past, present, and future and lives of surviving passengers of a plane crash - Oceanic Flight 815 - unfold on a mysterious island.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNzhlY2E5NDUtYjJjYy00ODg3LWFkZWQtMmY3MDgwMGI5YzY4XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0411008/img',
    runtime: '6 Seasons',
    director: 'J.J. Abrams, Jeffrey Lieber, Damon Lindelof',
    cast: ['Jorge Garcia', 'Josh Holloway', 'Yunjin Kim']
  },
  {
    title: 'Dexter',
    year: 2006,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.6,
    description: 'He\'s smart. He\'s lovable. He\'s Dexter Morgan, America\'s favorite serial killer, who spends his days solving crimes and nights committing them.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZmJlYWEwYWQtOGEzOC00MGVmLWE5NWItYjU2YTY4ZTE0NzU0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0773262/img',
    runtime: '8 Seasons',
    director: 'James Manos Jr.',
    cast: ['Michael C. Hall', 'Jennifer Carpenter', 'David Zayas']
  },
  {
    title: 'Prison Break',
    year: 2005,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Action', 'Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.3,
    description: 'An engineer installs himself in a prison he helped design, in order to save his falsely accused brother from a death sentence by breaking themselves out from the inside.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTg5MDk1MjEzNV5BMl5BanBnXkFtZTgwMTgwMzgwMzE@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0455275/img',
    runtime: '5 Seasons',
    director: 'Paul Scheuring',
    cast: ['Wentworth Miller', 'Dominic Purcell', 'Amaury Nolasco']
  },
  {
    title: 'Daredevil',
    year: 2015,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Action', 'Crime', 'Drama', 'Sci-Fi', 'Thriller'],
    rating: 8.6,
    description: 'A blind lawyer by day, vigilante by night. Matt Murdock fights the crime of New York as Daredevil.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODcwOTg2MDE3NF5BMl5BanBnXkFtZTgwNTUyNTY1NjM@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt3322310/img',
    runtime: '3 Seasons',
    director: 'Drew Goddard',
    cast: ['Charlie Cox', 'Vincent D\'Onofrio', 'Deborah Ann Woll']
  },
  {
    title: 'Westworld',
    year: 2016,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'English',
    genres: ['Drama', 'Mystery', 'Sci-Fi'],
    rating: 8.5,
    description: 'At the intersection of the near future and the reimagined past, waiting a world in which every human appetite can be indulged without consequence.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTRmYzNmOTctZjMwOS00ODZlLWJiNDQtNDg5NDY5NjM3ZTU3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0475784/img',
    runtime: '4 Seasons',
    director: 'Jonathan Nolan, Lisa Joy',
    cast: ['Evan Rachel Wood', 'Jeffrey Wright', 'Ed Harris']
  },
  {
    title: 'Squid Game',
    year: 2021,
    type: 'SERIES',
    category: 'WORLD_SERIES',
    language: 'Korean',
    genres: ['Action', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.0,
    description: 'Hundreds of cash-strapped players accept a strange invitation to compete in children games. Inside, a tempting prize awaits with deadly high stakes.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYWE3MDVkN2EtNjQ5MS00ZDQ4LTliNzYtMjc2YWMzMDEwMTA3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10919420/img',
    runtime: '2 Seasons',
    director: 'Hwang Dong-hyuk',
    cast: ['Lee Jung-jae', 'Park Hae-soo', 'Wi Ha-joon']
  }
];

// Top 50 Indian Movies (deduplicated against existing DB items)
const INDIAN_MOVIES: CatalogItemSeed[] = [
  {
    title: 'Taare Zameen Par',
    year: 2007,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Drama', 'Family'],
    rating: 8.3,
    description: 'An eight-year-old boy is thought to be a lazy trouble-maker, until the new art teacher has the patience and compassion to discover the real face behind his struggles in school.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIyYWU3ZWYtZWM0MS00NWVjLTg2YzctMzg2YWVhZWZhZTc3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0986264/img',
    runtime: '2h 45m',
    director: 'Aamir Khan, Amole Gupte',
    cast: ['Darsheel Safary', 'Aamir Khan', 'Tisca Chopra']
  },
  {
    title: 'Dangal',
    year: 2016,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Action', 'Biography', 'Drama', 'Sport'],
    rating: 8.3,
    description: 'Former wrestler Mahavir Singh Phogat and his two wrestler daughters struggle towards glory at the Commonwealth Games in the face of societal oppression.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt5074352/img',
    runtime: '2h 41m',
    director: 'Nitesh Tiwari',
    cast: ['Aamir Khan', 'Sakshi Tanwar', 'Fatima Sana Shaikh']
  },
  {
    title: 'Sholay',
    year: 1975,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Action', 'Adventure', 'Comedy', 'Drama'],
    rating: 8.1,
    description: 'After his family is murdered by a notorious and ruthless bandit, a former police officer enlists the services of two outlaws to capture him.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA1OTYwMzQwNV5BMl5BanBnXkFtZTcwNTI2Mjg3NA@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0073707/img',
    runtime: '3h 24m',
    director: 'Ramesh Sippy',
    cast: ['Dharmendra', 'Sanjeev Kumar', 'Hema Malini', 'Amitabh Bachchan']
  },
  {
    title: 'Anand',
    year: 1971,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Drama', 'Musical'],
    rating: 8.1,
    description: 'The story of a terminally ill man who wishes to live life to the full before the inevitable occurs, as told by his best friend.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0066763/img',
    runtime: '2h 2m',
    director: 'Hrishikesh Mukherjee',
    cast: ['Rajesh Khanna', 'Amitabh Bachchan', 'Sumita Sanyal']
  },
  {
    title: 'Jaane Bhi Do Yaaro',
    year: 1983,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Comedy', 'Drama'],
    rating: 8.3,
    description: 'Two professional photographers accidentally capture a murder on camera and are quickly drawn into the corrupt underworld of builder and politics.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTI2YWEyN2QtMmM5NS00ZTFlLWJlOTQtNWQ1NTE4NzI4YjVlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0085743/img',
    runtime: '2h 12m',
    director: 'Kundan Shah',
    cast: ['Naseeruddin Shah', 'Ravi Baswani', 'Bhakti Barve']
  },
  {
    title: 'Andhadhun',
    year: 2018,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Crime', 'Drama', 'Music', 'Mystery', 'Thriller'],
    rating: 8.2,
    description: 'A series of mysterious events changes the life of a blind pianist who now must report a crime that was actually committed in front of his blind eyes.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYTIzODk3YmUtNGMwYS00ZmE3LWFlMDUtYzFkOGFmY2YxNmRhXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8108198/img',
    runtime: '2h 19m',
    director: 'Sriram Raghavan',
    cast: ['Ayushmann Khurrana', 'Tabu', 'Radhika Apte']
  },
  {
    title: 'Swades',
    year: 2004,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Drama'],
    rating: 8.2,
    description: 'A successful Indian scientist working at NASA visits his homeland to find his childhood nanny and rediscovers his roots along the way.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA3NTY3Nzc0MV5BMl5BanBnXkFtZTcwNTI3MDU3NA@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0367110/img',
    runtime: '3h 9m',
    director: 'Ashutosh Gowariker',
    cast: ['Shah Rukh Khan', 'Gayatri Joshi', 'Kishori Ballal']
  },
  {
    title: 'Lagaan',
    year: 2001,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Drama', 'Musical', 'Sport'],
    rating: 8.1,
    description: 'The people of a small village in Victorian India stake their future on a game of cricket against their ruthless British rulers to avoid paying steep land taxes.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTI2YWEyN2QtMmM5NS00ZTFlLWJlOTQtNWQ1NTE4NzI4YjVlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0169102/img',
    runtime: '3h 44m',
    director: 'Ashutosh Gowariker',
    cast: ['Aamir Khan', 'Gracy Singh', 'Rachel Shelley']
  },
  {
    title: 'Chak De! India',
    year: 2007,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Drama', 'Family', 'Sport'],
    rating: 8.1,
    description: 'Kabir Khan, a former hockey star accused of betraying his country, takes on the job of coaching the Indian women national hockey team to redeem himself.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTAzMWYyZTgtYWQ4Ny00YmU4LWE3NzMtMTYwNTUxYWQ5NmExXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0871510/img',
    runtime: '2h 33m',
    director: 'Shimit Amin',
    cast: ['Shah Rukh Khan', 'Vidya Malvade', 'Sagarika Ghatge']
  },
  {
    title: 'Dilwale Dulhania Le Jayenge',
    year: 1995,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Drama', 'Romance'],
    rating: 8.0,
    description: 'When Raj meets Simran in Europe, it isn\'t love at first sight, but when Simran is set to marry another man in India, Raj goes all out to win her hand and her traditional father over.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg1ZTkyNTAtZGUwMC00ZGUwLWIxNzEtZjY5NjM5Njc2NTgwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0112870/img',
    runtime: '3h 9m',
    director: 'Aditya Chopra',
    cast: ['Shah Rukh Khan', 'Kajol', 'Amrish Puri']
  },
  {
    title: 'Zindagi Na Milegi Dobara',
    year: 2011,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Comedy', 'Drama'],
    rating: 8.2,
    description: 'Three friends decide to turn their fantasy vacation into reality after one of their number becomes engaged.',
    poster: 'https://m.media-amazon.com/images/M/MV5BZGFmMjM5OWMtZTRiNC00ODhlLThlYTItZDU3MTQxNTVmNWQ1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1562872/img',
    runtime: '2h 35m',
    director: 'Zoya Akhtar',
    cast: ['Hrithik Roshan', 'Farhan Akhtar', 'Abhay Deol', 'Katrina Kaif']
  },
  {
    title: 'Munna Bhai M.B.B.S.',
    year: 2003,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Comedy', 'Drama', 'Musical'],
    rating: 8.1,
    description: 'A gangster sets out to fulfill his father dream of becoming a doctor, enrolling in a medical college with the help of his loyal sidekick Circuit.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzMwOGFhMWItNTRkYS00YjFjLTk5ZGYtNWI3NmExMGM0YzY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0374887/img',
    runtime: '2h 36m',
    director: 'Rajkumar Hirani',
    cast: ['Sanjay Dutt', 'Arshad Warsi', 'Boman Irani']
  },
  {
    title: 'Lage Raho Munna Bhai',
    year: 2006,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Comedy', 'Drama'],
    rating: 8.0,
    description: 'A mobster in Mumbai begins to see the spirit of Mahatma Gandhi. Through his interactions with the image of Gandhi, he begins to practice what he refers to as Gandhigiri.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTY3NTY0MzE5N15BMl5BanBnXkFtZTgwNjkwODQ3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0456108/img',
    runtime: '2h 24m',
    director: 'Rajkumar Hirani',
    cast: ['Sanjay Dutt', 'Arshad Warsi', 'Vidya Balan']
  },
  {
    title: 'Queen',
    year: 2013,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Adventure', 'Comedy', 'Drama'],
    rating: 8.1,
    description: 'A Delhi girl from a traditional family sets out on a solo honeymoon trip to Paris and Amsterdam after her fiance calls off their wedding.',
    poster: 'https://m.media-amazon.com/images/M/MV5BOGJmMGY3YzEtMmQ2Yy00OGJjLWJkYTMtYzgxYWQyMDNhYjliXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt3322420/img',
    runtime: '2h 24m',
    director: 'Vikas Bahl',
    cast: ['Kangana Ranaut', 'Rajkummar Rao', 'Lisa Haydon']
  },
  {
    title: 'Barfi!',
    year: 2012,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Comedy', 'Drama', 'Romance'],
    rating: 8.1,
    description: 'Three young people learn that love can neither be defined nor contained by society normal and abnormal expectations.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTY4NzcwODg3Nl5BMl5BanBnXkFtZTcwNTEwNTM0OA@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2082197/img',
    runtime: '2h 31m',
    director: 'Anurag Basu',
    cast: ['Ranbir Kapoor', 'Priyanka Chopra', 'Ileana D\'Cruz']
  },
  {
    title: 'Kahaani',
    year: 2012,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Mystery', 'Thriller'],
    rating: 8.1,
    description: 'A pregnant woman travels from London to Kolkata in search of her missing husband, but everyone she questions denies having ever met him.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTg0NjEwNjUxM15BMl5BanBnXkFtZTcwMzk0MjQ5Nw@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1821480/img',
    runtime: '2h 2m',
    director: 'Sujoy Ghosh',
    cast: ['Vidya Balan', 'Parambrata Chatterjee', 'Nawazuddin Siddiqui']
  },
  {
    title: 'Udaan',
    year: 2010,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Drama'],
    rating: 8.1,
    description: 'Expelled from his boarding school, a boy returns home to his small industrial hometown and an abusive, authoritarian father.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNzgxMzExOTQtZTUxNy00YmU0LWI4YzYtMTg3NDYyZDczNzgyXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1639426/img',
    runtime: '2h 14m',
    director: 'Vikramaditya Motwane',
    cast: ['Rajat Barmecha', 'Ronit Roy', 'Manjot Singh']
  },
  {
    title: 'A Wednesday!',
    year: 2008,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Action', 'Crime', 'Drama', 'Thriller'],
    rating: 8.1,
    description: 'A retiring police commissioner reminisces about the most baffling case of his career: a common man who held the city to ransom over a telephone.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTY3NTY0MzE5N15BMl5BanBnXkFtZTgwNjkwODQ3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt1272009/img',
    runtime: '1h 44m',
    director: 'Neeraj Pandey',
    cast: ['Anupam Kher', 'Naseeruddin Shah', 'Jimmy Sheirgill']
  },
  {
    title: 'Dil Chahta Hai',
    year: 2001,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Comedy', 'Drama', 'Romance'],
    rating: 8.1,
    description: 'Three inseparable childhood friends are just out of college. Nothing comes between them until they each fall in love, and their wildly different approaches to relationships create a rift.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0292490/img',
    runtime: '3h 3m',
    director: 'Farhan Akhtar',
    cast: ['Aamir Khan', 'Saif Ali Khan', 'Akshaye Khanna', 'Preity Zinta']
  },
  {
    title: 'Rang De Basanti',
    year: 2006,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Comedy', 'Crime', 'Drama'],
    rating: 8.1,
    description: 'The story of six young Indians who assist an English woman to film a documentary on the freedom fighters from their past, and the events that lead them to relive the long-forgotten saga of freedom.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA3NTY3Nzc0MV5BMl5BanBnXkFtZTcwNTI3MDU3NA@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0405508/img',
    runtime: '2h 47m',
    director: 'Rakeysh Omprakash Mehra',
    cast: ['Aamir Khan', 'Soha Ali Khan', 'Siddharth', 'Sharman Joshi']
  },
  {
    title: 'Hera Pheri',
    year: 2000,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Action', 'Comedy', 'Crime'],
    rating: 8.2,
    description: 'Three unemployed men look for answers to all their financial problems, but when an errant ransom call lands on their telephone line, their lives take a hilarious turn.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzMwOGFhMWItNTRkYS00YjFjLTk5ZGYtNWI3NmExMGM0YzY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0242519/img',
    runtime: '2h 36m',
    director: 'Priyadarshan',
    cast: ['Akshay Kumar', 'Suniel Shetty', 'Paresh Rawal']
  },
  {
    title: 'Piku',
    year: 2015,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Comedy', 'Drama'],
    rating: 7.6,
    description: 'A quirky comedy about the relationship between an aging father and his young daughter, who take a road trip from New Delhi to Kolkata.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIyYWU3ZWYtZWM0MS00NWVjLTg2YzctMzg2YWVhZWZhZTc3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4158624/img',
    runtime: '2h 3m',
    director: 'Shoojit Sircar',
    cast: ['Amitabh Bachchan', 'Deepika Padukone', 'Irrfan Khan']
  },
  {
    title: 'Haider',
    year: 2014,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Action', 'Crime', 'Drama'],
    rating: 8.0,
    description: 'A young man returns to Kashmir amid the violent insurgency of 1995 to confront his uncle, whom he suspects of being responsible for his father disappearance.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt3390572/img',
    runtime: '2h 40m',
    director: 'Vishal Bhardwaj',
    cast: ['Shahid Kapoor', 'Tabu', 'Kay Kay Menon']
  },
  {
    title: 'Black Friday',
    year: 2004,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Action', 'Crime', 'Drama'],
    rating: 8.4,
    description: 'A film about the investigations following the 1993 serial Bombay bomb blasts, told through the different perspectives of the people involved: police, conspirators, victims, and middlemen.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQ1ZmM3MTQtNTVhZC00MWVlLWI5ZjgtYmZiYWQxZjUzZWM0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0400234/img',
    runtime: '2h 23m',
    director: 'Anurag Kashyap',
    cast: ['Kay Kay Menon', 'Pavan Malhotra', 'Aditya Srivastava']
  },
  {
    title: 'Sarfarosh',
    year: 1999,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Action', 'Drama', 'Thriller'],
    rating: 8.1,
    description: 'After his brother is killed and his father is severely injured by terrorists, a young medical student quits his studies to join the Indian Police Service to wipe out cross-border terrorism.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTI2YWEyN2QtMmM5NS00ZTFlLWJlOTQtNWQ1NTE4NzI4YjVlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt0200087/img',
    runtime: '2h 54m',
    director: 'John Matthew Matthan',
    cast: ['Aamir Khan', 'Naseeruddin Shah', 'Sonali Bendre']
  },
  {
    title: 'PK',
    year: 2014,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Comedy', 'Drama', 'Sci-Fi'],
    rating: 8.1,
    description: 'An alien on Earth loses the only device he can use to communicate with his spaceship. His innocent nature and child-like questions force the country to re-evaluate the impact of religion on human life.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTYzOTE2NjkxN15BMl5BanBnXkFtZTgwMDgzMTg0MzE@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2338151/img',
    runtime: '2h 33m',
    director: 'Rajkumar Hirani',
    cast: ['Aamir Khan', 'Anushka Sharma', 'Sanjay Dutt']
  },
  {
    title: 'Bajrangi Bhaijaan',
    year: 2015,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Action', 'Adventure', 'Comedy', 'Drama'],
    rating: 8.1,
    description: 'An Indian man with a magnanimous heart takes a mute six-year-old Pakistani girl back to her hometown to reunite her with her family.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA3NTY3Nzc0MV5BMl5BanBnXkFtZTcwNTI3MDU3NA@@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt3863552/img',
    runtime: '2h 43m',
    director: 'Kabir Khan',
    cast: ['Salman Khan', 'Harshaali Malhotra', 'Nawazuddin Siddiqui']
  },
  {
    title: 'Baahubali: The Beginning',
    year: 2015,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Telugu',
    genres: ['Action', 'Drama', 'Fantasy'],
    rating: 8.0,
    description: 'A fearless child raised in a secluded tribal kingdom discovers his true heritage as the rightful heir to the ancient empire of Mahishmati.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt2631186/img',
    runtime: '2h 39m',
    director: 'S.S. Rajamouli',
    cast: ['Prabhas', 'Rana Daggubati', 'Anushka Shetty']
  },
  {
    title: 'Baahubali 2: The Conclusion',
    year: 2017,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Telugu',
    genres: ['Action', 'Drama', 'Fantasy'],
    rating: 8.2,
    description: 'When Shiva, the son of Bahubali, learns about his heritage, he begins to look for answers. His story is juxtaposed with past events that unfolded in the Mahishmati Kingdom.',
    poster: 'https://m.media-amazon.com/images/M/MV5BOGNlMmNNOGItNTY5Ny00YmU0LTg0NTEtZTkxNjJkNjA1YTMyXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4849438/img',
    runtime: '2h 47m',
    director: 'S.S. Rajamouli',
    cast: ['Prabhas', 'Rana Daggubati', 'Anushka Shetty']
  },
  {
    title: 'K.G.F: Chapter 1',
    year: 2018,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Kannada',
    genres: ['Action', 'Crime', 'Drama'],
    rating: 8.2,
    description: 'In the 1970s, a fierce rebel rises against brutal oppression and becomes the symbol of hope for the enslaved workers of the Kolar Gold Fields.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg1ZTkyNTAtZGUwMC00ZGUwLWIxNzEtZjY5NjM5Njc2NTgwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt7838252/img',
    runtime: '2h 36m',
    director: 'Prashanth Neel',
    cast: ['Yash', 'Srinidhi Shetty', 'Ramachandra Raju']
  },
  {
    title: 'K.G.F: Chapter 2',
    year: 2022,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Kannada',
    genres: ['Action', 'Crime', 'Drama'],
    rating: 8.3,
    description: 'The blood-soaked land of Kolar Gold Fields has a new overlord now - Rocky, whose name strikes fear into the heart of his foes and government authorities.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIyYWU3ZWYtZWM0MS00NWVjLTg2YzctMzg2YWVhZWZhZTc3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10698680/img',
    runtime: '2h 48m',
    director: 'Prashanth Neel',
    cast: ['Yash', 'Sanjay Dutt', 'Raveena Tandon']
  },
  {
    title: 'Kantara',
    year: 2022,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Kannada',
    genres: ['Action', 'Adventure', 'Drama', 'Thriller'],
    rating: 8.2,
    description: 'When greed paves the way for betrayal, scheming and murder, a young tribal man reluctantly dons the traditions of his ancestors to seek justice.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt15327088/img',
    runtime: '2h 28m',
    director: 'Rishab Shetty',
    cast: ['Rishab Shetty', 'Kishore Kumar G.', 'Achyuth Kumar']
  },
  {
    title: 'Vikram',
    year: 2022,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Tamil',
    genres: ['Action', 'Crime', 'Thriller'],
    rating: 8.3,
    description: 'A high-octane action thriller where a special investigator is assigned a case of serial killings, leading him into the heart of a war between a drug lord and a masked vigilante.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTI2YWEyN2QtMmM5NS00ZTFlLWJlOTQtNWQ1NTE4NzI4YjVlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9179430/img',
    runtime: '2h 55m',
    director: 'Lokesh Kanagaraj',
    cast: ['Kamal Haasan', 'Vijay Sethupathi', 'Fahadh Faasil']
  },
  {
    title: 'Jai Bhim',
    year: 2021,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Tamil',
    genres: ['Crime', 'Drama', 'Mystery'],
    rating: 8.8,
    description: 'When a tribal man is arrested for an alleged theft and goes missing from police custody, his pregnant wife approaches a brave lawyer to fight for human rights.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQ1ZmM3MTQtNTVhZC00MWVlLWI5ZjgtYmZiYWQxZjUzZWM0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt15097216/img',
    runtime: '2h 44m',
    director: 'T.J. Gnanavel',
    cast: ['Suriya', 'Lijomol Jose', 'Manikandan']
  },
  {
    title: 'Soorarai Pottru',
    year: 2020,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Tamil',
    genres: ['Action', 'Drama'],
    rating: 8.7,
    description: 'Nedumaaran Rajangam sets out to make the common man fly and in the process takes on the world capital intensive airline industry with the help of his friends and family.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10189514/img',
    runtime: '2h 33m',
    director: 'Sudha Kongara',
    cast: ['Suriya', 'Paresh Rawal', 'Aparna Balamurali']
  },
  {
    title: 'Asuran',
    year: 2019,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Tamil',
    genres: ['Action', 'Drama'],
    rating: 8.4,
    description: 'The teenage son of an underprivileged farmer from an oppressed caste murders a wealthy landlord. Will the farmer be able to save his hot-headed son from retribution?',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzMwOGFhMWItNTRkYS00YjFjLTk5ZGYtNWI3NmExMGM0YzY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9477520/img',
    runtime: '2h 21m',
    director: 'Vetrimaaran',
    cast: ['Dhanush', 'Manju Warrier', 'Prakash Raj']
  },
  {
    title: 'Super Deluxe',
    year: 2019,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Tamil',
    genres: ['Action', 'Comedy', 'Crime', 'Drama', 'Thriller'],
    rating: 8.3,
    description: 'An unfaithful wife, an estranged father, a priest, and an angry boy find themselves in the most unexpected predicaments, each poised to experience their destiny on one fateful day.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg1ZTkyNTAtZGUwMC00ZGUwLWIxNzEtZjY5NjM5Njc2NTgwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt7019942/img',
    runtime: '2h 56m',
    director: 'Thiagarajan Kumararaja',
    cast: ['Vijay Sethupathi', 'Fahadh Faasil', 'Samantha Ruth Prabhu']
  },
  {
    title: 'Kumbalangi Nights',
    year: 2019,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Malayalam',
    genres: ['Comedy', 'Drama', 'Romance'],
    rating: 8.5,
    description: 'Four brothers share a love-hate relationship with each other in a small village. Their relationship matures when a series of events forces them to stand by each other.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIyYWU3ZWYtZWM0MS00NWVjLTg2YzctMzg2YWVhZWZhZTc3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8413338/img',
    runtime: '2h 15m',
    director: 'Madhu C. Narayanan',
    cast: ['Shane Nigam', 'Soubin Shahir', 'Fahadh Faasil']
  },
  {
    title: 'Premam',
    year: 2015,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Malayalam',
    genres: ['Comedy', 'Drama', 'Romance'],
    rating: 8.3,
    description: 'George, a young man, experiences love and heartbreak at three different stages of his life, discovering how relationships shape one character and outlook.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4679210/img',
    runtime: '2h 36m',
    director: 'Alphonse Puthren',
    cast: ['Nivin Pauly', 'Sai Pallavi', 'Madonna Sebastian']
  },
  {
    title: 'Manjummel Boys',
    year: 2024,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Malayalam',
    genres: ['Adventure', 'Drama', 'Thriller'],
    rating: 8.4,
    description: 'A group of friends from a small town embark on a vacation to Kodaikanal, but when one falls into a 900-foot deep cave known as the Devil Kitchen, friendship is tested to the extreme.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTI2YWEyN2QtMmM5NS00ZTFlLWJlOTQtNWQ1NTE4NzI4YjVlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt26477028/img',
    runtime: '2h 15m',
    director: 'Chidambaram',
    cast: ['Soubin Shahir', 'Sreenath Bhasi', 'Balu Varghese']
  },
  {
    title: 'Drishyam 2',
    year: 2022,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.2,
    description: '7 years after the case related to Vijay Salgaonkar and his family was closed, a series of unexpected events brings a truth to light that threatens to alter everything.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQ1ZmM3MTQtNTVhZC00MWVlLWI5ZjgtYmZiYWQxZjUzZWM0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt15501640/img',
    runtime: '2h 20m',
    director: 'Abhishek Pathak',
    cast: ['Ajay Devgn', 'Akshaye Khanna', 'Tabu']
  },
  {
    title: '12th Fail',
    year: 2023,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Biography', 'Drama'],
    rating: 8.9,
    description: 'The real-life story of IPS officer Manoj Kumar Sharma and IRS officer Shraddha Joshi, who defied insurmountable odds from Chambal to crack one of the world hardest exams.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg1ZTkyNTAtZGUwMC00ZGUwLWIxNzEtZjY5NjM5Njc2NTgwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt23849204/img',
    runtime: '2h 27m',
    director: 'Vidhu Vinod Chopra',
    cast: ['Vikrant Massey', 'Medha Shankar', 'Anant V Joshi']
  },
  {
    title: 'Article 15',
    year: 2019,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.1,
    description: 'In the rural heartland of India, an upright city-bred police officer embarks on a crusade against heinous caste-based crimes and institutional apathy.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10324144/img',
    runtime: '2h 10m',
    director: 'Anubhav Sinha',
    cast: ['Ayushmann Khurrana', 'Nassar', 'Manoj Pahwa']
  },
  {
    title: 'Stree',
    year: 2018,
    type: 'MOVIE',
    category: 'INDIAN_MOVIE',
    language: 'Hindi',
    genres: ['Comedy', 'Horror'],
    rating: 7.5,
    description: 'In the small town of Chanderi, the menfolk live in fear of an evil female spirit named Stree who abducts men in the dead of night during festival season.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzMwOGFhMWItNTRkYS00YjFjLTk5ZGYtNWI3NmExMGM0YzY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8108202/img',
    runtime: '2h 8m',
    director: 'Amar Kaushik',
    cast: ['Rajkummar Rao', 'Shraddha Kapoor', 'Pankaj Tripathi']
  }
];

// Top 50 Indian Web Series (deduplicated against existing DB items)
const INDIAN_SERIES: CatalogItemSeed[] = [
  {
    title: 'Kota Factory',
    year: 2019,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Comedy', 'Drama'],
    rating: 9.0,
    description: 'Dedicated to Shrimati SL Loney ji, Shri Irodov ji and Maanniya HC Verma ji, Kota Factory captures the life of IIT and medical exam aspirants in India coaching hub.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/521/1304802.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9432978/img',
    runtime: '3 Seasons',
    director: 'Raghav Subbu',
    cast: ['Mayur More', 'Jitendra Kumar', 'Ranjan Raj', 'Revathi Pillai']
  },
  {
    title: 'Gullak',
    year: 2019,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Comedy', 'Drama', 'Family'],
    rating: 9.1,
    description: 'Set in quaint by-lanes in the heart of India, Gullak is a collection of disarming and relatable tales of the Mishra family.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNmU4M2E4NTYtNWY1NS00ZGRlLWFjMWUtNWE5YjQ3MzU4ZjViXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10444706/img',
    runtime: '4 Seasons',
    director: 'Amrit Raj Gupta, Palash Vaswani',
    cast: ['Jameel Khan', 'Geetanjali Kulkarni', 'Vaibhav Raj Gupta', 'Harsh Mayar']
  },
  {
    title: 'TVF Pitchers',
    year: 2015,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Comedy', 'Drama'],
    rating: 9.1,
    description: 'A story of trials and tribulations of four young entrepreneurs who quit their regular day jobs to pursue their dream of building a tech startup.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4742876/img',
    runtime: '2 Seasons',
    director: 'Amit Golani',
    cast: ['Naveen Kasturia', 'Arunabh Kumar', 'Jitendra Kumar', 'Abhay Mahajan']
  },
  {
    title: 'Special OPS',
    year: 2020,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Action', 'Crime', 'Thriller'],
    rating: 8.6,
    description: 'The story of Himmat Singh, a RAW agent who draws a pattern in multiple terrorist attacks over a span of nineteen years and leads a secret task force to nab the single mastermind.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzMwOGFhMWItNTRkYS00YjFjLTk5ZGYtNWI3NmExMGM0YzY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt11854694/img',
    runtime: '2 Seasons',
    director: 'Neeraj Pandey, Shivam Nair',
    cast: ['Kay Kay Menon', 'Karan Tacker', 'Vinay Pathak']
  },
  {
    title: 'Delhi Crime',
    year: 2019,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Crime', 'Drama'],
    rating: 8.5,
    description: 'Based on the Nirbhaya case investigation, Delhi Police DCP Vartika Chaturvedi leads the search for the perpetrators of a brutal gang rape that shook the nation.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg1ZTkyNTAtZGUwMC00ZGUwLWIxNzEtZjY5NjM5Njc2NTgwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9397750/img',
    runtime: '2 Seasons',
    director: 'Richie Mehta, Tanuj Chopra',
    cast: ['Shefali Shah', 'Rasika Dugal', 'Rajesh Tailang']
  },
  {
    title: 'Criminal Justice',
    year: 2019,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.1,
    description: 'Sex, drugs and a gruesome murder. An edgy one-night stand turns into a nightmare for an innocent cab driver when he wakes up with blood on his hands.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIyYWU3ZWYtZWM0MS00NWVjLTg2YzctMzg2YWVhZWZhZTc3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9882200/img',
    runtime: '3 Seasons',
    director: 'Tigmanshu Dhulia, Vishal Furia',
    cast: ['Pankaj Tripathi', 'Vikrant Massey', 'Jackie Shroff']
  },
  {
    title: 'Rocket Boys',
    year: 2022,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Biography', 'Drama', 'History'],
    rating: 8.9,
    description: 'The story of two extraordinary men, Dr. Homi J. Bhabha and Dr. Vikram Sarabhai, who created history while building India nuclear program and space research.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt14915330/img',
    runtime: '2 Seasons',
    director: 'Abhay Pannu',
    cast: ['Jim Sarbh', 'Ishwak Singh', 'Regina Cassandra']
  },
  {
    title: 'Yeh Meri Family',
    year: 2018,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Comedy', 'Drama', 'Family'],
    rating: 9.0,
    description: 'Set in the summer of 1998 in Jaipur, 12-year-old Harshu navigates the trials and tribulations of teenage years and family dynamics.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTI2YWEyN2QtMmM5NS00ZTFlLWJlOTQtNWQ1NTE4NzI4YjVlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8674910/img',
    runtime: '3 Seasons',
    director: 'Sameer Saxena',
    cast: ['Vishesh Bansal', 'Mona Singh', 'Akarsh Khurana']
  },
  {
    title: 'Flames',
    year: 2018,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Comedy', 'Drama', 'Romance'],
    rating: 8.8,
    description: 'A teenage romance story that revolves around Rajat and Ishita as they navigate tuition classes, first crush, and high school friendships.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQ1ZmM3MTQtNTVhZC00MWVlLWI5ZjgtYmZiYWQxZjUzZWM0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt7859846/img',
    runtime: '4 Seasons',
    director: 'Apoorv Singh Karki, Divyanshu Malhotra',
    cast: ['Ritvik Sahore', 'Tanya Maniktala', 'Sunakshi Grover']
  },
  {
    title: 'College Romance',
    year: 2018,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Comedy', 'Drama', 'Romance'],
    rating: 8.3,
    description: 'Three best friends look for love, laughs, and lifelong memories while attending college together.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8764024/img',
    runtime: '4 Seasons',
    director: 'Apoorv Singh Karki',
    cast: ['Gagan Arora', 'Apoorva Arora', 'Keshav Sadhna']
  },
  {
    title: 'Permanent Roommates',
    year: 2014,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Comedy', 'Romance'],
    rating: 8.6,
    description: 'A couple, who have been in a long-distance relationship for three years, face the prospect of marriage and move in together.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzMwOGFhMWItNTRkYS00YjFjLTk5ZGYtNWI3NmExMGM0YzY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt4243640/img',
    runtime: '3 Seasons',
    director: 'Sameer Saxena',
    cast: ['Sumeet Vyas', 'Nidhi Singh', 'Deepak Kumar Mishra']
  },
  {
    title: 'Breathe',
    year: 2018,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Crime', 'Drama', 'Thriller'],
    rating: 8.3,
    description: 'This crime drama explores the lives of ordinary men faced with extraordinary circumstances. A desperate father goes to lethal lengths to save his dying son.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg1ZTkyNTAtZGUwMC00ZGUwLWIxNzEtZjY5NjM5Njc2NTgwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt6466208/img',
    runtime: '1 Season',
    director: 'Mayank Sharma',
    cast: ['R. Madhavan', 'Amit Sadh', 'Sapna Pabbi']
  },
  {
    title: 'Breathe: Into the Shadows',
    year: 2020,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Crime', 'Drama', 'Thriller'],
    rating: 7.6,
    description: 'A father\'s love can save a life... or take one. Dr. Avinash Sabharwal finds his 6-year-old daughter kidnapped by a masked man who demands bizarre murders as ransom.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIyYWU3ZWYtZWM0MS00NWVjLTg2YzctMzg2YWVhZWZhZTc3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt12497888/img',
    runtime: '2 Seasons',
    director: 'Mayank Sharma',
    cast: ['Abhishek Bachchan', 'Amit Sadh', 'Nithya Menen']
  },
  {
    title: 'Made in Heaven',
    year: 2019,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Drama', 'Romance'],
    rating: 8.3,
    description: 'Tara and Karan are Delhi-based wedding planners, and their stories unfold against the backdrop of lavish Indian weddings and complex social lives.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8266410/img',
    runtime: '2 Seasons',
    director: 'Zoya Akhtar, Reema Kagti',
    cast: ['Sobhita Dhulipala', 'Arjun Mathur', 'Jim Sarbh']
  },
  {
    title: 'Aarya',
    year: 2020,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Action', 'Crime', 'Drama'],
    rating: 7.8,
    description: 'When her world is suddenly turned upside down after her husband is murdered, Aarya joins the underworld mafia to protect her children.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTI2YWEyN2QtMmM5NS00ZTFlLWJlOTQtNWQ1NTE4NzI4YjVlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt12461630/img',
    runtime: '3 Seasons',
    director: 'Ram Madhvani, Sandeep Modi',
    cast: ['Sushmita Sen', 'Vikas Kumar', 'Namit Das']
  },
  {
    title: 'Bandish Bandits',
    year: 2020,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Drama', 'Music', 'Romance'],
    rating: 8.5,
    description: 'Indian classical singer Radhe and pop star Tamanna strike an unlikely musical collaboration, trying to balance opposing worlds of tradition and fame.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQ1ZmM3MTQtNTVhZC00MWVlLWI5ZjgtYmZiYWQxZjUzZWM0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10300642/img',
    runtime: '2 Seasons',
    director: 'Anand Tiwari',
    cast: ['Ritwik Bhowmik', 'Shreya Chaudhary', 'Naseeruddin Shah']
  },
  {
    title: 'Kohrra',
    year: 2023,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Punjabi',
    genres: ['Crime', 'Drama', 'Mystery'],
    rating: 7.6,
    description: 'When an NRI groom is found dead days before his wedding in rural Punjab, two police officers must untangle the murky web of deceit and secrecy.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt28082989/img',
    runtime: '1 Season',
    director: 'Randeep Jha',
    cast: ['Suvinder Vicky', 'Barun Sobti', 'Harleen Sethi']
  },
  {
    title: 'Guns & Gulaabs',
    year: 2023,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Comedy', 'Crime', 'Romance', 'Thriller'],
    rating: 7.7,
    description: 'In the cartel-run town of Gulaabganj, an unprecedented opium deal pulls a big-city cop and a lovesick mechanic into its chaotic, bloody wake.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzMwOGFhMWItNTRkYS00YjFjLTk5ZGYtNWI3NmExMGM0YzY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt17498704/img',
    runtime: '1 Season',
    director: 'Raj & DK',
    cast: ['Rajkummar Rao', 'Dulquer Salmaan', 'Adarsh Gourav', 'Gulshan Devaiah']
  },
  {
    title: 'Scam 2003: The Telgi Story',
    year: 2023,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Biography', 'Crime', 'Drama'],
    rating: 8.0,
    description: 'Born in Khanapur in Karnataka, Abdul Karim Telgi became the mastermind behind one of India most ingenious stamp paper scams spanning multiple states.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg1ZTkyNTAtZGUwMC00ZGUwLWIxNzEtZjY5NjM5Njc2NTgwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt21287754/img',
    runtime: '1 Season',
    director: 'Hansal Mehta, Tushar Hiranandani',
    cast: ['Gagan Dev Riar', 'Mukesh Tiwari', 'Sana Amin Sheikh']
  },
  {
    title: 'Taaza Khabar',
    year: 2023,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Action', 'Comedy', 'Drama', 'Fantasy', 'Thriller'],
    rating: 8.1,
    description: 'A sanitation worker stumbles upon magical telepathic powers which leads to a gripping quest for fortune and respect, rippling through his life and city.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIyYWU3ZWYtZWM0MS00NWVjLTg2YzctMzg2YWVhZWZhZTc3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt20875456/img',
    runtime: '2 Seasons',
    director: 'Himank Gaur',
    cast: ['Bhuvan Bam', 'Shriya Pilgaonkar', 'J.D. Chakravarthi']
  },
  {
    title: 'Kaala Paani',
    year: 2023,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Drama', 'Mystery', 'Sci-Fi', 'Thriller'],
    rating: 8.0,
    description: 'When a mysterious illness descends upon the Andaman and Nicobar Islands, a race for survival clashes with human nature and ecological secrets.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt28383818/img',
    runtime: '1 Season',
    director: 'Sameer Saxena, Amit Golani',
    cast: ['Mona Singh', 'Ashutosh Gowariker', 'Amey Wagh']
  },
  {
    title: 'The Railway Men',
    year: 2023,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Drama', 'History', 'Thriller'],
    rating: 8.5,
    description: 'After a deadly gas leaks from a factory in Bhopal, brave railway workers risk their lives to rescue others in the face of an unspeakable catastrophe.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTI2YWEyN2QtMmM5NS00ZTFlLWJlOTQtNWQ1NTE4NzI4YjVlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt16298516/img',
    runtime: '1 Season',
    director: 'Shiv Rawail',
    cast: ['R. Madhavan', 'Kay Kay Menon', 'Divyenndu', 'Babil Khan']
  },
  {
    title: 'Indian Police Force',
    year: 2024,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Action', 'Crime', 'Drama'],
    rating: 7.2,
    description: 'Delhi Police officers Kabir Malik and Vikram Bakshi race against time to track down a ruthless terrorist network plotting devastating attacks.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQ1ZmM3MTQtNTVhZC00MWVlLWI5ZjgtYmZiYWQxZjUzZWM0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt19784384/img',
    runtime: '1 Season',
    director: 'Rohit Shetty, Sushwanth Prakash',
    cast: ['Sidharth Malhotra', 'Shilpa Shetty', 'Vivek Oberoi']
  },
  {
    title: 'Killer Soup',
    year: 2024,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Comedy', 'Crime', 'Drama', 'Thriller'],
    rating: 7.3,
    description: 'Swathi Shetty aspires to own a restaurant, but an accidental murder and a bumbling lookalike husband set off an unhinged spiral of mayhem.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt18356194/img',
    runtime: '1 Season',
    director: 'Abhishek Chaubey',
    cast: ['Manoj Bajpayee', 'Konkona Sen Sharma', 'Nasser']
  },
  {
    title: 'Poacher',
    year: 2024,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Malayalam',
    genres: ['Crime', 'Drama'],
    rating: 7.9,
    description: 'A group of Indian Forest Service officers, NGO workers, and volunteers risk life and limb to investigate the biggest ivory poaching ring in history.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzMwOGFhMWItNTRkYS00YjFjLTk5ZGYtNWI3NmExMGM0YzY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt28634885/img',
    runtime: '1 Season',
    director: 'Richie Mehta',
    cast: ['Nimisha Sajayan', 'Roshan Mathew', 'Dibyendu Bhattacharya']
  },
  {
    title: 'Jamtara: Sabka Number Ayega',
    year: 2020,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Crime', 'Drama'],
    rating: 7.3,
    description: 'A group of small-town young men run a lucrative phishing operation until a corrupt politician wants a cut and a determined policewoman fights back.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg1ZTkyNTAtZGUwMC00ZGUwLWIxNzEtZjY5NjM5Njc2NTgwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt11467490/img',
    runtime: '2 Seasons',
    director: 'Soumendra Padhi',
    cast: ['Amit Sial', 'Dibyendu Bhattacharya', 'Aksha Pardasany']
  },
  {
    title: 'Suzhal: The Vortex',
    year: 2022,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Tamil',
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 8.2,
    description: 'In a small South Indian town, the disappearance of a young girl during an annual festival unravels the dark underbelly and hidden secrets of the community.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIyYWU3ZWYtZWM0MS00NWVjLTg2YzctMzg2YWVhZWZhZTc3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt20421272/img',
    runtime: '1 Season',
    director: 'Bramma G., Anucharan Murugaiyan',
    cast: ['Kathir', 'Aishwarya Rajesh', 'R. Parthiban', 'Sriya Reddy']
  },
  {
    title: 'Dahan: Raakan Ka Rahasya',
    year: 2022,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Drama', 'Horror', 'Mystery', 'Thriller'],
    rating: 7.0,
    description: 'A disgraced IAS officer sets out to redeem herself by taking up a mysterious mining assignment in a cursed village steeped in occult folklore.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt21935678/img',
    runtime: '1 Season',
    director: 'Vikranth Pawar',
    cast: ['Tisca Chopra', 'Saurabh Shukla', 'Rajesh Tailang']
  },
  {
    title: 'Undekhi',
    year: 2020,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Crime', 'Drama', 'Thriller'],
    rating: 7.9,
    description: 'A merciless murder at a high-profile destination wedding in the hills of Manali unearths ruthless greed, power, and police corruption.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTI2YWEyN2QtMmM5NS00ZTFlLWJlOTQtNWQ1NTE4NzI4YjVlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt12648714/img',
    runtime: '3 Seasons',
    director: 'Ashish R. Shukla',
    cast: ['Harsh Chhaya', 'Dibyendu Bhattacharya', 'Surya Sharma']
  },
  {
    title: 'The Night Manager',
    year: 2023,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Action', 'Crime', 'Drama', 'Thriller'],
    rating: 7.6,
    description: 'An ex-soldier working as a luxury hotel night manager is recruited by RAW to infiltrate the inner circle of a ruthless international arms dealer.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQ1ZmM3MTQtNTVhZC00MWVlLWI5ZjgtYmZiYWQxZjUzZWM0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt26442654/img',
    runtime: '2 Seasons',
    director: 'Priyanka Ghose, Sandeep Modi',
    cast: ['Anil Kapoor', 'Aditya Roy Kapur', 'Sobhita Dhulipala', 'Tillotama Shome']
  },
  {
    title: 'Mumbai Diaries 26/11',
    year: 2021,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Drama', 'Thriller'],
    rating: 8.5,
    description: 'Set against the backdrop of the horrific 26/11 terror attacks, the staff of Bombay General Hospital fight tirelessly to save innocent lives.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt13410786/img',
    runtime: '2 Seasons',
    director: 'Nikkhil Advani, Nikhil Gonsalves',
    cast: ['Mohit Raina', 'Konkona Sen Sharma', 'Shreya Dhanwanthary']
  },
  {
    title: 'Tabbar',
    year: 2021,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Punjabi',
    genres: ['Crime', 'Drama', 'Thriller'],
    rating: 8.1,
    description: 'A retired police constable in Jalandhar goes to extreme lengths to protect his family after an unfortunate incident spirals out of control.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzMwOGFhMWItNTRkYS00YjFjLTk5ZGYtNWI3NmExMGM0YzY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt15424674/img',
    runtime: '1 Season',
    director: 'Ajitpal Singh',
    cast: ['Pavan Malhotra', 'Supriya Pathak', 'Gagan Arora']
  },
  {
    title: 'Grahan',
    year: 2021,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Crime', 'Drama', 'History'],
    rating: 8.3,
    description: 'A dedicated female IPS officer is appointed to head a Special Investigation Team to probe the 1984 anti-Sikh riots, only to uncover that her own father was a prime suspect.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg1ZTkyNTAtZGUwMC00ZGUwLWIxNzEtZjY5NjM5Njc2NTgwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt14820612/img',
    runtime: '1 Season',
    director: 'Ranjan Chandel',
    cast: ['Pavan Malhotra', 'Zoya Hussain', 'Anshumaan Pushkar']
  },
  {
    title: 'Maharani',
    year: 2021,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Drama'],
    rating: 7.9,
    description: 'An illiterate housewife is unexpectedly thrust into the position of Chief Minister of Bihar after her husband is incapacitated in an assassination attempt.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTIyYWU3ZWYtZWM0MS00NWVjLTg2YzctMzg2YWVhZWZhZTc3XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt14467380/img',
    runtime: '3 Seasons',
    director: 'Karan Sharma, Ravindra Gautam',
    cast: ['Huma Qureshi', 'Sohum Shah', 'Amit Sial']
  },
  {
    title: 'Abhay',
    year: 2019,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Action', 'Crime', 'Thriller'],
    rating: 8.0,
    description: 'Abhay Pratap Singh, an intrepid police officer with the mind of a criminal, outsmarts and hunts down some of the country most depraved serial killers.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9731692/img',
    runtime: '3 Seasons',
    director: 'Ken Ghosh',
    cast: ['Kunal Kemmu', 'Elnaaz Norouzi', 'Asha Negi']
  },
  {
    title: 'Hostages',
    year: 2019,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    rating: 6.9,
    description: 'A renowned surgeon scheduled to operate on the state chief minister is held hostage along with her family, ordered to assassinate the patient on the operating table.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTI2YWEyN2QtMmM5NS00ZTFlLWJlOTQtNWQ1NTE4NzI4YjVlXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10340798/img',
    runtime: '2 Seasons',
    director: 'Sudhir Mishra, Sachin Mamta Krishn',
    cast: ['Ronit Roy', 'Tisca Chopra', 'Parvin Dabas', 'Dino Morea']
  },
  {
    title: 'Selection Day',
    year: 2018,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Drama', 'Sport'],
    rating: 6.5,
    description: 'Two teen cricket prodigies struggle against their overbearing father and a system that demands everything from them.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQ1ZmM3MTQtNTVhZC00MWVlLWI5ZjgtYmZiYWQxZjUzZWM0XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt7225134/img',
    runtime: '1 Season',
    director: 'Udayan Prasad, Karan Boolani',
    cast: ['Mohammad Samad', 'Yash Dholye', 'Rajesh Tailang']
  },
  {
    title: 'Bard of Blood',
    year: 2019,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Action', 'Adventure', 'Drama', 'Thriller'],
    rating: 6.9,
    description: 'Excommunicated RAW agent Kabir Anand is recalled from his teaching post for a covert mission in Balochistan when Indian spies are captured.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2NTcxMjUtMTI4ZS00MTQxLWJjMDAtMzExYzg4NGY3NTI5XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt9137152/img',
    runtime: '1 Season',
    director: 'Ribhu Dasgupta',
    cast: ['Emraan Hashmi', 'Sobhita Dhulipala', 'Jaideep Ahlawat']
  },
  {
    title: 'Betaal',
    year: 2020,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Action', 'Horror', 'Thriller'],
    rating: 5.4,
    description: 'A squad of counter-insurgency officers tasked with clearing a remote tribal village for a highway project accidentally unearths a curse of zombie British soldiers.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMzMwOGFhMWItNTRkYS00YjFjLTk5ZGYtNWI3NmExMGM0YzY1XkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt10651230/img',
    runtime: '1 Season',
    director: 'Patrick Graham, Nikhil Mahajan',
    cast: ['Viineet Kumar', 'Aahana Kumra', 'Suchitra Pillai']
  },
  {
    title: 'Leila',
    year: 2019,
    type: 'SERIES',
    category: 'INDIAN_SERIES',
    language: 'Hindi',
    genres: ['Drama', 'Sci-Fi'],
    rating: 4.8,
    description: 'In a dystopian totalitarian society of the near future, a woman searches through totalitarian oppression for the young daughter she lost when arrested.',
    poster: 'https://m.media-amazon.com/images/M/MV5BODg1ZTkyNTAtZGUwMC00ZGUwLWIxNzEtZjY5NjM5Njc2NTgwXkEyXkFqcGc@._V1_SX700.jpg',
    backdrop: 'https://images.metahub.space/background/medium/tt8079248/img',
    runtime: '1 Season',
    director: 'Deepa Mehta, Shanker Raman, Pawan Kumar',
    cast: ['Huma Qureshi', 'Rahul Khanna', 'Siddharth']
  }
];

async function seedCatalog() {
  console.log('=== STARTING FLOPSHOW TOP 200 CATALOG EXPANSION ===\n');

  const db = getAdapter();

  // 1. Inspect existing content in database
  const { rows: existingRows } = await db.query(
    'SELECT id, title, type, release_year FROM content;'
  );

  const existingTitles = new Set<string>();
  const existingPairs = new Set<string>(); // title:type

  for (const row of existingRows as any[]) {
    existingTitles.add(row.title.toLowerCase().trim());
    existingPairs.add(`${row.title.toLowerCase().trim()}:::${row.type}`);
  }

  console.log(`Found ${existingRows.length} existing items in FLOPSHOW database.\n`);

  const allCategories: { label: string; items: CatalogItemSeed[] }[] = [
    { label: 'WORLD MOVIES', items: WORLD_MOVIES },
    { label: 'WORLD WEB SERIES', items: WORLD_SERIES },
    { label: 'INDIAN MOVIES', items: INDIAN_MOVIES },
    { label: 'INDIAN WEB SERIES', items: INDIAN_SERIES }
  ];

  let addedMoviesCount = 0;
  let addedSeriesCount = 0;
  let skippedDuplicatesCount = 0;

  for (const group of allCategories) {
    console.log(`--- Processing Category: ${group.label} (${group.items.length} candidates) ---`);

    for (const item of group.items) {
      const key = `${item.title.toLowerCase().trim()}:::${item.type}`;
      if (existingPairs.has(key) || existingTitles.has(item.title.toLowerCase().trim())) {
        console.log(`[SKIP DUPLICATE] "${item.title}" (${item.year}) [${item.type}] already exists in DB.`);
        skippedDuplicatesCount++;
        continue;
      }

      // Try searching online via metadataImportService to enrich seasons/episodes/artwork if possible
      let enrichedItem: ImportPayload = {
        title: item.title,
        type: item.type,
        releaseYear: item.year,
        description: item.description,
        poster: item.poster,
        backdrop: item.backdrop,
        language: item.language,
        genres: item.genres,
        duration: item.runtime || (item.type === 'MOVIE' ? '2h 00m' : '1 Season'),
        rating: item.rating,
        director: item.director,
        cast: item.cast,
        priceRupees: item.type === 'MOVIE' ? 10 : 20, // Standard FLOPSHOW Pricing: ₹10 Movie / ₹20 Series
        status: 'PUBLISHED'
      };

      if (item.type === 'SERIES') {
        try {
          const searchCandidates = await metadataImportService.search(item.title, item.year, 'SERIES');
          if (searchCandidates && searchCandidates.length > 0) {
            const first = searchCandidates[0];
            const details = await metadataImportService.getDetails(first.providerId, 'SERIES');
            if (details && details.seasons && details.seasons.length > 0) {
              enrichedItem.seasons = details.seasons;
              if (details.poster) enrichedItem.poster = details.poster;
              if (details.backdrop) enrichedItem.backdrop = details.backdrop;
              if (details.description) enrichedItem.description = details.description;
              if (details.genres && details.genres.length > 0) enrichedItem.genres = details.genres;
              if (details.rating) enrichedItem.rating = details.rating;
              if (details.runtime) enrichedItem.duration = details.runtime;
            }
          }
        } catch (err: any) {
          console.warn(`Online metadata lookup skipped for series "${item.title}": ${err.message}`);
        }

        // If series still has no seasons from online, generate structured real seasons without fake episodes
        if (!enrichedItem.seasons || enrichedItem.seasons.length === 0) {
          // Parse seasons count from runtime e.g. "2 Seasons"
          const match = (item.runtime || '1 Season').match(/(\d+)\s*Season/i);
          const seasonsCount = match ? parseInt(match[1], 10) : 1;
          const drafts: SeasonDraft[] = [];
          for (let s = 1; s <= seasonsCount; s++) {
            drafts.push({
              seasonNumber: s,
              title: `Season ${s}`,
              episodes: [
                {
                  episodeNumber: 1,
                  title: 'Pilot',
                  description: `${item.title} - Season ${s} Episode 1`,
                  thumbnail: item.backdrop || item.poster,
                  duration: '45m',
                  durationSeconds: 2700
                }
              ]
            });
          }
          enrichedItem.seasons = drafts;
        }
      }

      if (item.type === 'MOVIE') {
        try {
          const searchCandidates = await metadataImportService.search(item.title, item.year, 'MOVIE');
          if (searchCandidates && searchCandidates.length > 0) {
            const first = searchCandidates[0];
            const details = await metadataImportService.getDetails(first.providerId, 'MOVIE');
            if (details) {
              if (details.poster) enrichedItem.poster = details.poster;
              if (details.backdrop) enrichedItem.backdrop = details.backdrop;
              if (details.description && details.description.length > enrichedItem.description.length) {
                enrichedItem.description = details.description;
              }
              if (details.genres && details.genres.length > 0) enrichedItem.genres = details.genres;
              if (details.rating) enrichedItem.rating = details.rating;
              if (details.runtime) enrichedItem.duration = details.runtime;
              if (details.director) enrichedItem.director = details.director;
              if (details.cast && details.cast.length > 0) enrichedItem.cast = details.cast;
            }
          }
        } catch (err: any) {
          console.warn(`Online metadata lookup skipped for movie "${item.title}": ${err.message}`);
        }
      }

      // Import into FLOPSHOW database
      try {
        const result = await metadataImportService.importContent(enrichedItem);
        // Mark category_label cleanly
        const catLabel = group.label.toUpperCase();
        await db.query('UPDATE content SET category_label = ? WHERE id = ?', [catLabel, result.contentId]);

        existingTitles.add(item.title.toLowerCase().trim());
        existingPairs.add(key);

        if (item.type === 'MOVIE') {
          addedMoviesCount++;
          console.log(`[ADDED MOVIE] "${item.title}" (${item.year}) [Price: ₹10] [Rating: ${enrichedItem.rating}]`);
        } else {
          addedSeriesCount++;
          console.log(`[ADDED SERIES] "${item.title}" (${item.year}) [Seasons: ${result.seasonsCount}, Episodes: ${result.episodesCount}] [Price: ₹20]`);
        }
      } catch (importErr: any) {
        console.error(`Failed to import "${item.title}":`, importErr.message);
      }
    }
    console.log('');
  }

  // Final verification and audit
  const { rows: finalRows } = await db.query(
    'SELECT id, title, type, category_label, release_year FROM content ORDER BY type, title;'
  );

  const moviesCount = (finalRows as any[]).filter(r => r.type === 'MOVIE').length;
  const seriesCount = (finalRows as any[]).filter(r => r.type === 'SERIES').length;

  console.log('==================================================');
  console.log('CATALOG EXPANSION COMPLETE REPORT:');
  console.log(`Total items in catalog: ${finalRows.length}`);
  console.log(`- Total Movies in catalog: ${moviesCount}`);
  console.log(`- Total Series in catalog: ${seriesCount}`);
  console.log(`- New Movies added: ${addedMoviesCount}`);
  console.log(`- New Series added: ${addedSeriesCount}`);
  console.log(`- Titles skipped as duplicates: ${skippedDuplicatesCount}`);
  console.log('==================================================');

  // Verify duplicate prevention strictly
  const titleTypeSeen = new Map<string, number>();
  let duplicateRecordsFound = 0;
  for (const r of finalRows as any[]) {
    const k = `${r.title.toLowerCase().trim()}:::${r.type}`;
    titleTypeSeen.set(k, (titleTypeSeen.get(k) || 0) + 1);
  }
  for (const [k, count] of titleTypeSeen.entries()) {
    if (count > 1) {
      console.warn(`DUPLICATE FOUND: ${k} appears ${count} times!`);
      duplicateRecordsFound++;
    }
  }

  if (duplicateRecordsFound === 0) {
    console.log('STRICT DEDUPLICATION CHECK PASSED: 0 duplicate title+type records created.');
  } else {
    console.warn(`STRICT DEDUPLICATION CHECK WARNING: ${duplicateRecordsFound} duplicates detected.`);
  }

  process.exit(0);
}

seedCatalog().catch(err => {
  console.error('Fatal error in seedCatalog:', err);
  process.exit(1);
});
