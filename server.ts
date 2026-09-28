import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';

app.use(express.json());

// API routing
app.use('/api', apiRouter);

// Health check endpoint for Render / cloud monitoring
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// Prevent missing /api/* endpoints from falling through to SPA HTML
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Serve frontend static build in production (e.g. Render, Railway, Docker)
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`🚌 Bus Attendance server listening on http://${HOST}:${PORT}`);
});
