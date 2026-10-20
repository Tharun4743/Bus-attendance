import { ContinuousNeuralTrainingLoop } from './continuous_train_loop';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const studentsPath = path.resolve(process.cwd(), 'data/students.json');
  const raw = await fs.readFile(studentsPath, 'utf-8');
  const students = JSON.parse(raw);

  const loop = new ContinuousNeuralTrainingLoop();
  await loop.runUntilTargetAchieved(students);
}

if (process.argv[1]?.endsWith('automl_train_loop.ts')) {
  main().catch((err) => {
    console.error('AutoML training loop failed:', err);
    process.exit(1);
  });
}
