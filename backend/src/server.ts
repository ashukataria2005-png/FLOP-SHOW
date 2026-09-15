import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { authRouter, handleAdminLogin } from './routes/authRoutes.js';
import { contentRouter } from './routes/contentRoutes.js';
import { purchaseRouter } from './routes/purchaseRoutes.js';
import { walletRouter } from './routes/walletRoutes.js';
import { libraryRouter } from './routes/libraryRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';
import { mediaRouter } from './routes/mediaRoutes.js';
import { paymentRouter } from './routes/paymentRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

import { config } from './config/env.js';

export function createServer(): Express {
  const app = express();

  // Configured CORS origins (supporting Netlify frontend and local dev)
  const allowedOrigins = new Set<string>(config.allowedOrigins);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile, curl, server-to-server health checks)
      if (!origin) {
        return callback(null, true);
      }

      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.has(origin) || allowedOrigins.has(cleanOrigin)) {
        return callback(null, true);
      }

      // Allow production Netlify frontend and previews (*.netlify.app)
      if (/^https:\/\/([a-zA-Z0-9_-]+\.)?netlify\.app$/.test(cleanOrigin)) {
        return callback(null, true);
      }

      // Allow production Render frontend and previews (*.onrender.com)
      if (/^https:\/\/([a-zA-Z0-9_-]+\.)?onrender\.com$/.test(cleanOrigin)) {
        return callback(null, true);
      }

      // Always allow local development origins (localhost / 127.0.0.1 on any port)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Reject unauthorized origins safely without throwing or crashing
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Range', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type']
  }));
  app.use(express.json());

  // Serve uploaded media files with full HTTP 206 Range, MIME type, and streaming support
  const uploadDir = config.uploadDir;
  for (const sub of ['', 'videos', 'images']) {
    const d = path.join(uploadDir, sub);
    if (!fs.existsSync(d)) {
      try {
        fs.mkdirSync(d, { recursive: true });
      } catch {
        // Ignore
      }
    }
  }

  const MEDIA_MIME_TYPES: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/mp4',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif'
  };

  const serveMediaStream = (filePath: string, req: Request, res: Response): void => {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(404).send('Media file not found');
        return;
      }
    } catch {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(404).send('Media file not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MEDIA_MIME_TYPES[ext] || 'application/octet-stream';
    const fileSize = stat.size;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (req.method === 'HEAD') {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', fileSize);
      res.status(200).end();
      return;
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || (parts[1] && (isNaN(end) || end < start))) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        res.status(416).end();
        return;
      }

      const clampedEnd = Math.min(end, fileSize - 1);
      const chunkSize = clampedEnd - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${clampedEnd}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', mimeType);

      const stream = fs.createReadStream(filePath, { start, end: clampedEnd });
      stream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });
      stream.pipe(res);
    } else {
      res.status(200);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Content-Type', mimeType);

      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });
      stream.pipe(res);
    }
  };

  const uploadRouteHandler = (req: Request, res: Response) => {
    const relPath = req.path.replace(/^\//, '');
    const resolvedPath = path.resolve(uploadDir, relPath);

    if (resolvedPath.startsWith(uploadDir) && fs.existsSync(resolvedPath)) {
      serveMediaStream(resolvedPath, req, res);
      return;
    }

    // Secondary fallback directory search (e.g. backend/uploads vs root uploads)
    const altDir = uploadDir.includes('backend')
      ? uploadDir.replace(/backend[\\/]uploads/, 'uploads')
      : path.resolve(uploadDir, '..', 'backend', 'uploads');

    if (altDir !== uploadDir && fs.existsSync(altDir)) {
      const altResolved = path.resolve(altDir, relPath);
      if (altResolved.startsWith(altDir) && fs.existsSync(altResolved)) {
        serveMediaStream(altResolved, req, res);
        return;
      }
    }

    // Return text/plain 404 rather than JSON to prevent HTML5 video tag decode crashes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(404).send('Media file not found');
  };

  app.use('/uploads', uploadRouteHandler);
  app.use('/api/uploads', uploadRouteHandler);

  // Health check endpoints (safe, no secrets or internal details exposed)
  const healthCheckHandler = (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'FLOPSHOW Backend',
      version: '1.0.0',
      database: config.databaseType,
      timestamp: new Date().toISOString()
    });
  };

  app.get('/api/health', healthCheckHandler);
  app.get('/health', healthCheckHandler);

  // Mount API modules
  app.use('/api/auth', authRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/purchases', purchaseRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/api/library', libraryRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/payments', paymentRouter);

  // Direct aliases for admin login
  app.post('/api/admin-login', handleAdminLogin);
  app.post('/api/admin/login', handleAdminLogin);

  // 404 Not Found Handler for unknown API routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found.`
      }
    });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
