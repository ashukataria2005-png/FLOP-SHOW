import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.resolve(process.cwd(), 'backend', 'data', 'flopshow.db'),
  jwtSecret: process.env.JWT_SECRET || 'flopshow_default_dev_secret_key_change_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminId: process.env.ADMIN_ID || 'Admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'Kataria2005#',
  devAdminEmail: process.env.DEV_ADMIN_EMAIL || 'admin@flopshow.tv',
  devAdminPassword: process.env.DEV_ADMIN_PASSWORD || '',
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  omdbApiKey: process.env.OMDB_API_KEY || 'trilogy'
};

