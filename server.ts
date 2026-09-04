import express from 'express';
import { apiRouter } from './src/server/api';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// API routing
app.use('/api', apiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚌 Bus Attendance backend server running on http://localhost:${PORT}`);
});
