import express from 'express';
import { apiRouter } from '../src/server/api';

const app = express();

app.use(express.json());
app.use('/api', apiRouter);

export default app;
