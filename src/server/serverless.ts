import express, { Request, Response, NextFunction } from 'express';
import { apiRouter } from './api';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Quick health check routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'bus-attendance-api', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'bus-attendance-api', timestamp: new Date().toISOString() });
});

// Support both /api/auth/... and direct /auth/... rewrites from vercel.json
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global Error Handler for Vercel Serverless environment
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('💥 [Serverless API Error]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
