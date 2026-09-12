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

      // Always allow local development origins (localhost / 127.0.0.1 on any port)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Reject unauthorized origins safely without throwing or crashing
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  app.use(express.json());

  // Serve uploaded media files statically (supporting /uploads and /api/uploads)
  const uploadDir = config.uploadDir;
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch {
      // Ignore directory creation error if already exists
    }
  }
  app.use('/uploads', express.static(uploadDir));
  app.use('/api/uploads', express.static(uploadDir));

  // Health check endpoints (safe, no secrets or internal details exposed)
  const healthCheckHandler = (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'FLOPSHOW Backend',
      version: '1.0.0',
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
