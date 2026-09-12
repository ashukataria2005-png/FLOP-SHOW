import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { config } from '../config/env.js';

// Ensure upload directories exist
const uploadBaseDir = config.uploadDir;
const videosDir = path.join(uploadBaseDir, 'videos');
const imagesDir = path.join(uploadBaseDir, 'images');

for (const dir of [uploadBaseDir, videosDir, imagesDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Storage configuration with sanitized UUID filenames
const storage = multer.diskStorage({
  destination: (_req: Request, file: Express.Multer.File, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, videosDir);
    } else {
      cb(null, imagesDir);
    }
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeExt = ext || (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
    const uniqueName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, uniqueName);
  }
});

// File filter validating mime types and extensions
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    // Videos
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg',
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'
  ];

  const allowedExts = ['.mp4', '.webm', '.mov', '.mkv', '.ogg', '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type (${file.mimetype}). Allowed: MP4, WebM, MOV, MKV, JPG, PNG, WebP.`));
  }
};

export const uploadMediaMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max limit for local dev uploads
  }
});
