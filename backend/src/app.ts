import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/authRouter.js';
import { leadsRouter } from './modules/leads/leadsRouter.js';
import { importsRouter } from './modules/imports/importsRouter.js';
import { templatesRouter } from './modules/templates/templatesRouter.js';
import { sendersRouter } from './modules/senders/sendersRouter.js';
import { campaignsRouter } from './modules/campaigns/campaignsRouter.js';
import { suppressionRouter } from './modules/suppression/suppressionRouter.js';
import { analyticsRouter } from './modules/analytics/analyticsRouter.js';
import { logsRouter } from './modules/logs/logsRouter.js';
import { prisma } from './prisma.js';
import { getQueueHealth } from './modules/queue/queueService.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: env.APP_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(env.SESSION_SECRET));

  // Comprehensive Health check verifying real database query
  app.get('/api/health', async (req: Request, res: Response) => {
    let dbStatus = 'disconnected';
    let isHealthy = true;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'disconnected';
      isHealthy = false;
    }

    const queueHealth = getQueueHealth();

    const responseBody = {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'outreach-api',
      database: dbStatus,
      queue: queueHealth.status,
      queueEngine: queueHealth.engine,
      mode: env.EMAIL_SEND_MODE,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    res.status(isHealthy ? 200 : 503).json(responseBody);
  });

  // Dedicated DB health endpoint
  app.get('/api/health/db', async (req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        database: 'connected',
        provider: 'postgresql',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        error: err.message || 'Failed to query database',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Dedicated Queue health endpoint
  app.get('/api/health/queue', (req: Request, res: Response) => {
    const health = getQueueHealth();
    res.json({
      status: 'ok',
      queue: health,
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/imports', importsRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/senders', sendersRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/suppression', suppressionRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api', logsRouter);

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
  });

  return app;
}
