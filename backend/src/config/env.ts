import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const rawPort = process.env.PORT;
const parsedPort = rawPort ? parseInt(rawPort, 10) : 5000;
const port = isNaN(parsedPort) || parsedPort <= 0 ? 5000 : parsedPort;

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

// Parse allowed CORS origins from FRONTEND_URL, CLIENT_ORIGIN, ALLOWED_ORIGINS, CORS_ORIGIN
const defaultOrigins = [
  'https://flop-show-4a14.onrender.com',
  'https://flop-show.netlify.app'
];
const envOriginStrings = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_ORIGIN,
  process.env.ALLOWED_ORIGINS,
  process.env.CORS_ORIGIN
];
const rawOrigins = [
  ...defaultOrigins,
  ...envOriginStrings
    .filter((val): val is string => Boolean(val && typeof val === 'string'))
    .flatMap(val => val.split(',').map(s => s.trim().replace(/\/+$/, '')))
].filter(Boolean);

const allowedOrigins = Array.from(new Set(rawOrigins));

// Fallback upload directory check
const defaultUploadDir = fs.existsSync(path.resolve(process.cwd(), 'backend', 'uploads'))
  ? path.resolve(process.cwd(), 'backend', 'uploads')
  : path.resolve(process.cwd(), 'uploads');

// Database configuration
// Local: SQLite file path (default)
// Production: PostgreSQL connection URL (e.g. Supabase, Neon, Render Postgres)
const rawDatabaseUrl = process.env.DATABASE_URL?.trim() || '';
const isPostgres = Boolean(
  rawDatabaseUrl && (rawDatabaseUrl.startsWith('postgres://') || rawDatabaseUrl.startsWith('postgresql://'))
);

export const config = {
  port,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv,
  isProd,
  frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'https://flop-show.netlify.app',
  allowedOrigins,
  // Database configuration
  databaseUrl: rawDatabaseUrl,
  isPostgres,
  databaseType: isPostgres ? ('postgres' as const) : ('sqlite' as const),
  databasePath: process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.resolve(process.cwd(), 'backend', 'data', 'flopshow.db'),
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
    : defaultUploadDir,
  jwtSecret: process.env.JWT_SECRET || 'flopshow_super_secret_dev_key_2026_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminId: process.env.ADMIN_ID || 'Admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'Kataria2005#',
  devAdminEmail: process.env.DEV_ADMIN_EMAIL || 'admin@flopshow.tv',
  devAdminPassword: process.env.DEV_ADMIN_PASSWORD || '',
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  omdbApiKey: process.env.OMDB_API_KEY || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || ''
};


