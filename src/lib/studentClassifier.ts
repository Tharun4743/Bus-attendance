/**
 * ============================================================================
 * 🧠 TRAINED STUDENT NEURAL CLASSIFIER INFERENCE ENGINE
 * Loads the trained model weights directly from /models/student_classifier_model.bin
 * Evaluates live 128-D face embeddings with deep neural forward-pass
 * ============================================================================
 */

import fs from 'fs/promises';
import path from 'path';

export interface ClassificationResult {
  matched: boolean;
  predictedStudentId: string;
  confidence: number; // 0 to 100%
  impostorProbability: number; // 0 to 100%
  probabilities: Record<string, number>;
}

export class StudentClassifierEngine {
  private isLoaded = false;
  private inputDim = 128;
  private hidden1 = 64;
  private hidden2 = 32;
  private classes: string[] = [];

  private W1!: Float32Array;
  private b1!: Float32Array;
  private W2!: Float32Array;
  private b2!: Float32Array;
  private W3!: Float32Array;
  private b3!: Float32Array;

  /**
   * Load trained model weights from public/models directory or static URL
   */
  public async loadModel(modelsDirectory?: string): Promise<boolean> {
    if (this.isLoaded) return true;

    try {
      const baseDir = modelsDirectory || path.resolve(process.cwd(), 'public/models');
      const manifestPath = path.join(baseDir, 'student_classifier_model-weights_manifest.json');
      const binPath = path.join(baseDir, 'student_classifier_model.bin');

      const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestRaw);

      this.classes = manifest.architecture.classes;
      const numClasses = this.classes.length;

      if (manifest.architecture.hiddenLayers && manifest.architecture.hiddenLayers.length === 2) {
        this.hidden1 = manifest.architecture.hiddenLayers[0];
        this.hidden2 = manifest.architecture.hiddenLayers[1];
      }

      const binBuffer = await fs.readFile(binPath);
      const floatView = new Float32Array(
        binBuffer.buffer,
        binBuffer.byteOffset,
        binBuffer.byteLength / 4
      );

      let offset = 0;
      this.W1 = floatView.slice(offset, offset + this.inputDim * this.hidden1);
      offset += this.W1.length;

      this.b1 = floatView.slice(offset, offset + this.hidden1);
      offset += this.b1.length;

      this.W2 = floatView.slice(offset, offset + this.hidden1 * this.hidden2);
      offset += this.W2.length;

      this.b2 = floatView.slice(offset, offset + this.hidden2);
      offset += this.b2.length;

      this.W3 = floatView.slice(offset, offset + this.hidden2 * numClasses);
      offset += this.W3.length;

      this.b3 = floatView.slice(offset, offset + numClasses);

      this.isLoaded = true;
      return true;
    } catch (err) {
      console.warn('⚠️ [StudentClassifier] Could not load pre-trained binary weights. Falling back to geometric matching:', err);
      this.isLoaded = false;
      return false;
    }
  }

  /**
   * Run forward propagation on the 128-D descriptor
   */
  public predict(descriptor: number[]): ClassificationResult | null {
    if (!this.isLoaded || !descriptor || descriptor.length !== 128) {
      return null;
    }

    const numClasses = this.classes.length;

    // Layer 1 Forward
    const a1 = new Float32Array(this.hidden1);
    for (let j = 0; j < this.hidden1; j++) {
      let sum = this.b1[j];
      for (let i = 0; i < this.inputDim; i++) {
        sum += descriptor[i] * this.W1[i * this.hidden1 + j];
      }
      a1[j] = sum > 0 ? sum : sum * 0.1; // LeakyReLU
    }

    // Layer 2 Forward
    const a2 = new Float32Array(this.hidden2);
    for (let k = 0; k < this.hidden2; k++) {
      let sum = this.b2[k];
      for (let j = 0; j < this.hidden1; j++) {
        sum += a1[j] * this.W2[j * this.hidden2 + k];
      }
      a2[k] = sum > 0 ? sum : sum * 0.1;
    }

    // Layer 3 (Output Logits + Softmax)
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

    const temperature = 1.6;
    let sumExp = 0;
    const probs = new Float32Array(numClasses);
    for (let c = 0; c < numClasses; c++) {
      probs[c] = Math.exp((logits[c] - maxLogit) / temperature);
      sumExp += probs[c];
    }
    for (let c = 0; c < numClasses; c++) probs[c] /= sumExp;

    let bestIdx = 0;
    let bestProb = -1;
    const probMap: Record<string, number> = {};
    for (let c = 0; c < numClasses; c++) {
      const pct = Math.round(probs[c] * 100);
      probMap[this.classes[c]] = pct;
      if (probs[c] > bestProb) {
        bestProb = probs[c];
        bestIdx = c;
      }
    }

    const predictedClass = this.classes[bestIdx];
    const isImpostor = predictedClass === 'IMPOSTOR' || bestIdx === 0;
    const impostorProb = Math.round((probs[0] || 0) * 100);
    const confidence = Math.round(bestProb * 100);

    return {
      matched: !isImpostor && confidence >= 70,
      predictedStudentId: predictedClass,
      confidence,
      impostorProbability: impostorProb,
      probabilities: probMap,
    };
  }

  public isModelReady(): boolean {
    return this.isLoaded;
  }
}

export const studentClassifierEngine = new StudentClassifierEngine();
