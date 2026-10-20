import fs from 'fs/promises';
import path from 'path';

interface Student {
  id: string;
  registerNumber: string;
  name: string;
  faceDescriptor?: number[];
}

interface Sample {
  x: Float32Array;
  y: number;
}

/**
 * Enterprise Non-Overfitting Neural Classifier Trainer
 * Incorporates:
 *   1. Train / Validation Split (80% / 20%)
 *   2. Inverted Dropout (p = 0.35) for anti-co-adaptation
 *   3. L2 Weight Regularization (Weight Decay lambda = 0.0012)
 *   4. Early Stopping based on Validation Loss (patience = 8)
 *   5. Temperature-Scaled Softmax export (T = 1.6)
 */
export class RegularizedStudentModelTrainer {
  private inputDim = 128;
  private hidden1 = 64;
  private hidden2 = 32;
  private dropoutRate = 0.35;
  private l2Lambda = 0.0012; // Weight decay penalty

  // Weights & Biases
  private W1: Float32Array;
  private b1: Float32Array;
  private W2: Float32Array;
  private b2: Float32Array;
  private W3: Float32Array;
  private b3: Float32Array;

  // Best checkpoint weights for early stopping
  private bestWeights: {
    W1: Float32Array;
    b1: Float32Array;
    W2: Float32Array;
    b2: Float32Array;
    W3: Float32Array;
    b3: Float32Array;
  } | null = null;

  private classes: string[] = [];

  constructor() {
    this.W1 = new Float32Array(this.inputDim * this.hidden1);
    this.b1 = new Float32Array(this.hidden1);
    this.W2 = new Float32Array(this.hidden1 * this.hidden2);
    this.b2 = new Float32Array(this.hidden2);
    this.W3 = new Float32Array(0);
    this.b3 = new Float32Array(0);

    this.initHe(this.W1, this.inputDim);
    this.initHe(this.W2, this.hidden1);
  }

  private initHe(weights: Float32Array, fanIn: number) {
    const std = Math.sqrt(2 / fanIn);
    for (let i = 0; i < weights.length; i++) {
      weights[i] = (Math.random() * 2 - 1) * std;
    }
  }

  public async train(students: Student[], maxEpochs = 150, lr = 0.012) {
    console.log('🚀 [Regularized-Trainer] Starting Anti-Overfitting Neural Model Training...');
    console.log(`🛡️ [Guardrails] L2 Weight Decay: ${this.l2Lambda} | Dropout: ${this.dropoutRate} | 80/20 Train-Val Split`);

    this.classes = ['IMPOSTOR', ...students.map((s) => s.id)];
    const numClasses = this.classes.length;

    this.W3 = new Float32Array(this.hidden2 * numClasses);
    this.b3 = new Float32Array(numClasses);
    this.initHe(this.W3, this.hidden2);

    // 1. Build Augmented Dataset
    const fullDataset: Sample[] = [];

    // Enrolled students (classes 1..N) with realistic lighting & angle noise
    for (let classIdx = 1; classIdx < this.classes.length; classIdx++) {
      const student = students[classIdx - 1];
      const baseDesc = student.faceDescriptor || this.generateDeterministicDescriptor(student.id);

      fullDataset.push({ x: new Float32Array(baseDesc), y: classIdx });

      // Augmentation: Realistic sensor noise and light shifting
      for (let aug = 0; aug < 30; aug++) {
        const noisy = new Float32Array(128);
        let norm = 0;
        for (let i = 0; i < 128; i++) {
          noisy[i] = baseDesc[i] + (Math.random() * 0.10 - 0.05);
          norm += noisy[i] * noisy[i];
        }
        const len = Math.sqrt(norm);
        for (let i = 0; i < 128; i++) noisy[i] /= len;
        fullDataset.push({ x: noisy, y: classIdx });
      }
    }

    // Negative Impostor Class (0)
    const numNegatives = (this.classes.length - 1) * 40;
    for (let neg = 0; neg < numNegatives; neg++) {
      const negative = new Float32Array(128);
      let norm = 0;
      for (let i = 0; i < 128; i++) {
        negative[i] = Math.random() * 2 - 1;
        norm += negative[i] * negative[i];
      }
      const len = Math.sqrt(norm);
      for (let i = 0; i < 128; i++) negative[i] /= len;
      fullDataset.push({ x: negative, y: 0 });
    }

    // 2. Shuffle & Split 80% Train, 20% Validation
    fullDataset.sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(fullDataset.length * 0.8);
    const trainSet = fullDataset.slice(0, splitIndex);
    const valSet = fullDataset.slice(splitIndex);

    console.log(`📊 [Data-Split] Total: ${fullDataset.length} | Train: ${trainSet.length} | Validation: ${valSet.length}`);

    let bestValLoss = Infinity;
    let patienceCounter = 0;
    const patienceLimit = 8;
    let stoppedEpoch = maxEpochs;

    // 3. Training Loop with Early Stopping
    for (let epoch = 1; epoch <= maxEpochs; epoch++) {
      trainSet.sort(() => Math.random() - 0.5);

      // --- TRAINING STEP (With Dropout & L2) ---
      let trainLoss = 0;
      let trainCorrect = 0;
      const keepProb = 1 - this.dropoutRate;
      const dropScale = 1 / keepProb;

      for (const sample of trainSet) {
        // Layer 1 Forward
        const a1 = new Float32Array(this.hidden1);
        const dropMask1 = new Float32Array(this.hidden1);
        for (let j = 0; j < this.hidden1; j++) {
          let sum = this.b1[j];
          for (let i = 0; i < this.inputDim; i++) {
            sum += sample.x[i] * this.W1[i * this.hidden1 + j];
          }
          const relu = sum > 0 ? sum : sum * 0.1;
          dropMask1[j] = Math.random() < keepProb ? dropScale : 0;
          a1[j] = relu * dropMask1[j];
        }

        // Layer 2 Forward
        const a2 = new Float32Array(this.hidden2);
        const dropMask2 = new Float32Array(this.hidden2);
        for (let k = 0; k < this.hidden2; k++) {
          let sum = this.b2[k];
          for (let j = 0; j < this.hidden1; j++) {
            sum += a1[j] * this.W2[j * this.hidden2 + k];
          }
          const relu = sum > 0 ? sum : sum * 0.1;
          dropMask2[k] = Math.random() < keepProb ? dropScale : 0;
          a2[k] = relu * dropMask2[k];
        }

        // Output Layer Forward
        const logits = new Float32Array(numClasses);
        let maxLogit = -Infinity;
        for (let c = 0; c < numClasses; c++) {
          let sum = this.b3[c];
          for (let k = 0; k < this.hidden2; k++) {
            sum += a2[k] * this.W3[k * numClasses + c];
          }
          logits[c] = sum;
          if (sum > maxLogit) maxLogit = sum;
        }

        let sumExp = 0;
        const probs = new Float32Array(numClasses);
        for (let c = 0; c < numClasses; c++) {
          probs[c] = Math.exp(logits[c] - maxLogit);
          sumExp += probs[c];
        }
        for (let c = 0; c < numClasses; c++) probs[c] /= sumExp;

        trainLoss += -Math.log(Math.max(1e-7, probs[sample.y]));
        let pred = 0, maxP = -1;
        for (let c = 0; c < numClasses; c++) {
          if (probs[c] > maxP) { maxP = probs[c]; pred = c; }
        }
        if (pred === sample.y) trainCorrect++;

        // Backprop with L2 Weight Decay
        const gradOut = new Float32Array(numClasses);
        for (let c = 0; c < numClasses; c++) {
          gradOut[c] = probs[c] - (c === sample.y ? 1 : 0);
        }

        // Layer 3 Gradients & L2 penalty
        const gradA2 = new Float32Array(this.hidden2);
        for (let k = 0; k < this.hidden2; k++) {
          let sum = 0;
          for (let c = 0; c < numClasses; c++) {
            sum += gradOut[c] * this.W3[k * numClasses + c];
            const weightDecay = this.l2Lambda * this.W3[k * numClasses + c];
            this.W3[k * numClasses + c] -= lr * (gradOut[c] * a2[k] + weightDecay);
          }
          gradA2[k] = sum * dropMask2[k];
        }
        for (let c = 0; c < numClasses; c++) this.b3[c] -= lr * gradOut[c];

        // Layer 2 Gradients & L2 penalty
        const gradA1 = new Float32Array(this.hidden1);
        for (let j = 0; j < this.hidden1; j++) {
          let sum = 0;
          for (let k = 0; k < this.hidden2; k++) {
            const reluGrad = a2[k] > 0 ? 1 : 0.1;
            const delta = gradA2[k] * reluGrad;
            sum += delta * this.W2[j * this.hidden2 + k];
            const weightDecay = this.l2Lambda * this.W2[j * this.hidden2 + k];
            this.W2[j * this.hidden2 + k] -= lr * (delta * a1[j] + weightDecay);
          }
          gradA1[j] = sum * dropMask1[j];
        }
        for (let k = 0; k < this.hidden2; k++) {
          const reluGrad = a2[k] > 0 ? 1 : 0.1;
          this.b2[k] -= lr * gradA2[k] * reluGrad;
        }

        // Layer 1 Gradients & L2 penalty
        for (let i = 0; i < this.inputDim; i++) {
          for (let j = 0; j < this.hidden1; j++) {
            const reluGrad = a1[j] > 0 ? 1 : 0.1;
            const delta = gradA1[j] * reluGrad;
            const weightDecay = this.l2Lambda * this.W1[i * this.hidden1 + j];
            this.W1[i * this.hidden1 + j] -= lr * (delta * sample.x[i] + weightDecay);
          }
        }
        for (let j = 0; j < this.hidden1; j++) {
          const reluGrad = a1[j] > 0 ? 1 : 0.1;
          this.b1[j] -= lr * gradA1[j] * reluGrad;
        }
      }

      // --- VALIDATION STEP (Deterministic, No Dropout) ---
      let valLoss = 0;
      let valCorrect = 0;

      for (const valSample of valSet) {
        // Forward L1
        const a1 = new Float32Array(this.hidden1);
        for (let j = 0; j < this.hidden1; j++) {
          let sum = this.b1[j];
          for (let i = 0; i < this.inputDim; i++) {
            sum += valSample.x[i] * this.W1[i * this.hidden1 + j];
          }
          a1[j] = sum > 0 ? sum : sum * 0.1;
        }

        // Forward L2
        const a2 = new Float32Array(this.hidden2);
        for (let k = 0; k < this.hidden2; k++) {
          let sum = this.b2[k];
          for (let j = 0; j < this.hidden1; j++) {
            sum += a1[j] * this.W2[j * this.hidden2 + k];
          }
          a2[k] = sum > 0 ? sum : sum * 0.1;
        }

        // Output
        const logits = new Float32Array(numClasses);
        let maxL = -Infinity;
        for (let c = 0; c < numClasses; c++) {
          let sum = this.b3[c];
          for (let k = 0; k < this.hidden2; k++) {
            sum += a2[k] * this.W3[k * numClasses + c];
          }
          logits[c] = sum;
          if (sum > maxL) maxL = sum;
        }

        let sumE = 0;
        const probs = new Float32Array(numClasses);
        for (let c = 0; c < numClasses; c++) {
          probs[c] = Math.exp(logits[c] - maxL);
          sumE += probs[c];
        }
        for (let c = 0; c < numClasses; c++) probs[c] /= sumE;

        valLoss += -Math.log(Math.max(1e-7, probs[valSample.y]));
        let pred = 0, maxP = -1;
        for (let c = 0; c < numClasses; c++) {
          if (probs[c] > maxP) { maxP = probs[c]; pred = c; }
        }
        if (pred === valSample.y) valCorrect++;
      }

      const meanTrainLoss = (trainLoss / trainSet.length).toFixed(4);
      const trainAcc = ((trainCorrect / trainSet.length) * 100).toFixed(1);
      const meanValLoss = valLoss / valSet.length;
      const valAcc = ((valCorrect / valSet.length) * 100).toFixed(1);

      // Check Early Stopping Checkpoint
      if (meanValLoss < bestValLoss) {
        bestValLoss = meanValLoss;
        patienceCounter = 0;
        this.saveCheckpoint();
      } else {
        patienceCounter++;
      }

      if (epoch % 15 === 0 || epoch === maxEpochs || patienceCounter >= patienceLimit) {
        console.log(
          `  Epoch ${epoch.toString().padStart(3, ' ')} | Train Loss: ${meanTrainLoss} (Acc: ${trainAcc}%) | Val Loss: ${meanValLoss.toFixed(4)} (Acc: ${valAcc}%)`
        );
      }

      // Early Stopping trigger: model reached peak generalization!
      if (patienceCounter >= patienceLimit) {
        stoppedEpoch = epoch;
        console.log(`🛑 [Early-Stopping] Peak generalization reached at epoch ${epoch}. Preventing overfitting.`);
        this.restoreBestCheckpoint();
        break;
      }
    }

    console.log(`🎯 [Trained-Model] Optimal non-overfitted weights restored (Val Loss: ${bestValLoss.toFixed(4)}).`);
  }

  private saveCheckpoint() {
    this.bestWeights = {
      W1: new Float32Array(this.W1),
      b1: new Float32Array(this.b1),
      W2: new Float32Array(this.W2),
      b2: new Float32Array(this.b2),
      W3: new Float32Array(this.W3),
      b3: new Float32Array(this.b3),
    };
  }

  private restoreBestCheckpoint() {
    if (this.bestWeights) {
      this.W1.set(this.bestWeights.W1);
      this.b1.set(this.bestWeights.b1);
      this.W2.set(this.bestWeights.W2);
      this.b2.set(this.bestWeights.b2);
      this.W3.set(this.bestWeights.W3);
      this.b3.set(this.bestWeights.b3);
    }
  }

  public async exportModel(outputDir: string) {
    await fs.mkdir(outputDir, { recursive: true });

    const totalFloats =
      this.W1.length +
      this.b1.length +
      this.W2.length +
      this.b2.length +
      this.W3.length +
      this.b3.length;

    const binBuffer = new Float32Array(totalFloats);
    let offset = 0;

    const copyInto = (arr: Float32Array) => {
      binBuffer.set(arr, offset);
      offset += arr.length;
    };

    copyInto(this.W1);
    copyInto(this.b1);
    copyInto(this.W2);
    copyInto(this.b2);
    copyInto(this.W3);
    copyInto(this.b3);

    const binPath = path.join(outputDir, 'student_classifier_model.bin');
    await fs.writeFile(binPath, Buffer.from(binBuffer.buffer));

    const manifest = {
      modelName: 'RegularizedStudentFaceClassifierMLP',
      version: '2.0.0',
      regularization: {
        l2WeightDecay: this.l2Lambda,
        dropoutRate: this.dropoutRate,
        temperatureScaling: 1.6, // Softens overconfident softmax probabilities
      },
      architecture: {
        inputDimension: this.inputDim,
        hiddenLayers: [this.hidden1, this.hidden2],
        outputDimension: this.classes.length,
        classes: this.classes,
      },
      weightsManifest: [
        {
          paths: ['student_classifier_model.bin'],
          weights: [
            { name: 'dense_1/kernel', shape: [this.inputDim, this.hidden1], dtype: 'float32' },
            { name: 'dense_1/bias', shape: [this.hidden1], dtype: 'float32' },
            { name: 'dense_2/kernel', shape: [this.hidden1, this.hidden2], dtype: 'float32' },
            { name: 'dense_2/bias', shape: [this.hidden2], dtype: 'float32' },
            { name: 'dense_3/kernel', shape: [this.hidden2, this.classes.length], dtype: 'float32' },
            { name: 'dense_3/bias', shape: [this.classes.length], dtype: 'float32' },
          ],
        },
      ],
    };

    const manifestPath = path.join(outputDir, 'student_classifier_model-weights_manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    console.log(`📁 [Model-Export] Regularized weights exported to:\n   ${binPath}\n   ${manifestPath}`);
  }

  private generateDeterministicDescriptor(seed: string): number[] {
    const desc = new Array(128);
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
    let norm = 0;
    for (let i = 0; i < 128; i++) {
      desc[i] = Math.sin(hash + i);
      norm += desc[i] * desc[i];
    }
    const len = Math.sqrt(norm);
    for (let i = 0; i < 128; i++) desc[i] /= len;
    return desc;
  }
}

async function run() {
  const dotenv = await import('dotenv');
  dotenv.config();
  const { getStorage } = await import('../src/server/storage/index.js');
  const storage = getStorage();
  const students = await storage.getStudents();
  console.log(`📡 Loaded ${students.length} students from live Supabase PostgreSQL.`);

  const trainer = new RegularizedStudentModelTrainer();
  await trainer.train(students, 140, 0.015);

  const modelsDir = path.resolve(process.cwd(), 'public/models');
  await trainer.exportModel(modelsDir);
}

if (process.argv[1]?.endsWith('train_student_model.ts')) {
  run().catch((err) => {
    console.error('Training failed:', err);
    process.exit(1);
  });
}
