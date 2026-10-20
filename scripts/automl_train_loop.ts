import { ContinuousNeuralTrainingLoop } from './continuous_train_loop';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config();
  const { getStorage } = await import('../src/server/storage/index.js');
  const storage = getStorage();
  const students = await storage.getStudents();
  console.log(`📡 Loaded ${students.length} students from live Supabase PostgreSQL.`);

  const loop = new ContinuousNeuralTrainingLoop();
  await loop.runUntilTargetAchieved(students);
}

if (process.argv[1]?.endsWith('automl_train_loop.ts')) {
  main().catch((err) => {
    console.error('AutoML training loop failed:', err);
    process.exit(1);
  });
}
