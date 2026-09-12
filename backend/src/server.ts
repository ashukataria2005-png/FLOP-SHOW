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

export function createServer(): Express {
  const app = express();

  // Basic security and parsing middlewares
  app.use(cors({
    origin: true, // Allow frontend dev server and same-origin
    credentials: true
  }));
  app.use(express.json());

  // Serve uploaded media files statically (supporting /uploads and /api/uploads)
  const uploadDir = fs.existsSync(path.resolve(process.cwd(), 'backend', 'uploads'))
    ? path.resolve(process.cwd(), 'backend', 'uploads')
    : path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadDir));
  app.use('/api/uploads', express.static(uploadDir));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'FLOPSHOW Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

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
