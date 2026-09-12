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

// Parse allowed CORS origins from FRONTEND_URL and CLIENT_ORIGIN
const rawOrigins = [process.env.FRONTEND_URL, process.env.CLIENT_ORIGIN]
  .filter((val): val is string => Boolean(val && typeof val === 'string'))
  .flatMap(val => val.split(',').map(s => s.trim().replace(/\/+$/, '')))
  .filter(Boolean);

const allowedOrigins = Array.from(new Set(rawOrigins));

// Fallback upload directory check
const defaultUploadDir = fs.existsSync(path.resolve(process.cwd(), 'backend', 'uploads'))
  ? path.resolve(process.cwd(), 'backend', 'uploads')
  : path.resolve(process.cwd(), 'uploads');

export const config = {
  port,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv,
  isProd,
  frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || '',
  allowedOrigins,
  databasePath: process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.resolve(process.cwd(), 'backend', 'data', 'flopshow.db'),
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
    : defaultUploadDir,
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'flopshow_default_dev_secret_key_change_in_prod'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminId: process.env.ADMIN_ID || 'Admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  devAdminEmail: process.env.DEV_ADMIN_EMAIL || 'admin@flopshow.tv',
  devAdminPassword: process.env.DEV_ADMIN_PASSWORD || '',
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  omdbApiKey: process.env.OMDB_API_KEY || ''
};


