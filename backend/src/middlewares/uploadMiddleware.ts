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

const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.webm', '.mov', '.mkv', '.ogg', '.ogv', '.3gp', '.3g2', '.avi', '.ts', '.flv']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg', '.bmp']);

export function isVideoFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const rawMime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
  return (
    rawMime.startsWith('video/') ||
    VIDEO_EXTENSIONS.has(ext) ||
    rawMime === 'application/x-mpegurl' ||
    rawMime === 'application/vnd.apple.mpegurl'
  );
}

export function isImageFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const rawMime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
  return (
    rawMime.startsWith('image/') ||
    IMAGE_EXTENSIONS.has(ext)
  );
}

// Storage configuration with sanitized UUID filenames
const storage = multer.diskStorage({
  destination: (_req: Request, file: Express.Multer.File, cb) => {
    if (isVideoFile(file)) {
      cb(null, videosDir);
    } else {
      cb(null, imagesDir);
    }
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const rawExt = path.extname(file.originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    const isVid = isVideoFile(file);
    const defaultExt = isVid ? '.mp4' : '.jpg';
    const safeExt = rawExt || defaultExt;
    const uniqueName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, uniqueName);
  }
});

// File filter validating mime types and extensions for both mobile & desktop
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const isVid = isVideoFile(file);
  const isImg = isImageFile(file);

  if (isVid || isImg) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type "${file.mimetype || file.originalname}". Supported videos: MP4, WebM, MOV, MKV, 3GP, OGG. Supported images: JPG, PNG, WebP, AVIF.`));
  }
};

export const uploadMediaMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max limit for video & media uploads
    files: 1
  }
});
