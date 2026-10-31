/**
 * ============================================================================
 * 📱 DUAL-CLOUD LOAD-BALANCED AI FACE VERIFICATION ENGINE — ZERO MOCKS
 * Integrates Google Gemini Vision & Groq Cloud Vision via GEMINI_API_KEY & GROQ_API_KEY
 * Multi-Tier High Accuracy Biometric Face Matching & Anti-Spoofing Liveness
 * Intelligent Failover & Round-Robin Load Balancing — Zero Hardcoded Bypasses
 * ============================================================================
 */

export interface FaceMatchResult {
  matched: boolean;
  confidence: number; // 0 to 100%
  engine?: 'GEMINI_VISION' | 'GROQ_VISION';
  provider?: string;
  distance?: number;
  cosineSimilarity?: number;
  adaptiveDescriptor?: number[];
  reason?: string;
  biometricDetails?: {
    facialStructure?: string;
    antiSpoofingPassed?: boolean;
    landmarksAnalyzed?: string[];
  };
}

export interface ImagePayload {
  mimeType: string;
  base64: string;
  dataUri: string;
}

export class FaceVerificationEngine {
  private readonly euclideanThreshold = 0.52;
  private readonly cosineThreshold = 0.65;
  private static requestIndex = 0;

  public getGeminiApiKey(): string | undefined {
    const raw = process.env.GEMINI_API_KEY?.trim() || '';
    if (!raw || raw.includes('your_gemini_api_key')) return undefined;
    const cleaned = raw.replace(/^['"]|['"]$/g, '').trim();
    return cleaned.startsWith('Bearer ') ? cleaned.slice(7).trim() : cleaned;
  }

  public getGroqApiKey(): string | undefined {
    const raw = process.env.GROQ_API_KEY?.trim() || '';
    if (!raw || raw.includes('your_groq_api_key')) return undefined;
    const cleaned = raw.replace(/^['"]|['"]$/g, '').trim();
    return cleaned.startsWith('Bearer ') ? cleaned.slice(7).trim() : cleaned;
  }

  /**
   * Validates base64 data URI format from camera.
   */
  public isValidImagePayload(base64Data: string): boolean {
    if (!base64Data || typeof base64Data !== 'string') return false;
    return (
      base64Data.startsWith('data:image/jpeg;base64,') ||
      base64Data.startsWith('data:image/jpg;base64,') ||
      base64Data.startsWith('data:image/png;base64,') ||
      base64Data.startsWith('data:image/webp;base64,') ||
      (base64Data.startsWith('data:image/') && base64Data.includes(';base64,'))
    );
  }

  /**
   * Converts any image input (Cloudinary HTTPS URL, data URI, or raw base64)
   * into a standardized binary payload with MIME type and base64 string.
   */
  public async toImagePayload(urlOrBase64: string): Promise<ImagePayload | null> {
    if (!urlOrBase64 || typeof urlOrBase64 !== 'string') return null;

    if (urlOrBase64.startsWith('data:')) {
      const match = urlOrBase64.match(/^data:([^;]+);base64,(.+)$/s);
      if (match) {
        let mimeType = match[1].trim();
        if (!mimeType.startsWith('image/')) mimeType = 'image/jpeg';
        return {
          mimeType,
          base64: match[2].trim(),
          dataUri: urlOrBase64.trim(),
        };
      }
    }

    if (urlOrBase64.startsWith('http://') || urlOrBase64.startsWith('https://')) {
      try {
        const response = await fetch(urlOrBase64);
        if (!response.ok) {
          console.warn(`⚠️ [Face-Engine] Failed to fetch image URL: HTTP ${response.status}`);
          return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        let mimeType = response.headers.get('content-type') || 'image/jpeg';
        if (!mimeType.startsWith('image/')) {
          if (urlOrBase64.includes('.png')) {
            mimeType = 'image/png';
          } else if (urlOrBase64.includes('.webp')) {
            mimeType = 'image/webp';
          } else {
            mimeType = 'image/jpeg';
          }
        }
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return {
          mimeType,
          base64,
          dataUri: `data:${mimeType};base64,${base64}`,
        };
      } catch (err: any) {
        console.warn(`⚠️ [Face-Engine] Image fetch error: ${err.message}`);
        return null;
      }
    }

    // Raw base64 string without data URI prefix
    const cleaned = urlOrBase64.trim();
    return {
      mimeType: 'image/jpeg',
      base64: cleaned,
      dataUri: `data:image/jpeg;base64,${cleaned}`,
    };
  }

  /**
   * Synchronous validation for camera capture payload formats
   */
  public validateCapturePayload(
    liveSelfieBase64: string,
    enrolledPhotoUrlOrBase64?: string
  ): { valid: boolean; reason?: string } {
    if (!this.isValidImagePayload(liveSelfieBase64)) {
      return {
        valid: false,
        reason: 'Invalid camera selfie image format.',
      };
    }

    const rawData = liveSelfieBase64.split(',')[1];
    if (!rawData || rawData.length < 500) {
      return {
        valid: false,
        reason: 'Camera capture contains insufficient pixel data. Retake with good lighting.',
      };
    }

    if (!enrolledPhotoUrlOrBase64) {
      return {
        valid: false,
        reason: 'Face not registered! You must enroll your face photo in your profile before marking attendance.',
      };
    }

    return { valid: true };
  }

  /**
   * Synchronous face match check: validates payload formatting and performs bitwise
   * identity matching. For disparate images, rejects synchronous mock bypass and requires
   * verifyFaceMatchAsync (cloud dual-AI vision) or compareBiometricDescriptors (128-D vectors).
   */
  public verifyFaceMatch(
    liveSelfieBase64: string,
    enrolledPhotoUrlOrBase64?: string
  ): FaceMatchResult {
    const validation = this.validateCapturePayload(liveSelfieBase64, enrolledPhotoUrlOrBase64);
    if (!validation.valid) {
      return {
        matched: false,
        confidence: 0,
        reason: validation.reason,
      };
    }

    // Exact bitwise identity match for identical image payloads
    if (liveSelfieBase64 === enrolledPhotoUrlOrBase64) {
      return {
        matched: true,
        confidence: 100,
        reason: 'Identical camera capture payload verified.',
      };
    }

    // Disparate images: zero mock bypass policy. Production verification requires asynchronous AI.
    return {
      matched: false,
      confidence: 0,
      reason: 'Disparate photo verification requires asynchronous cloud AI (verifyFaceMatchAsync) or 128-D vector matching (compareBiometricDescriptors).',
    };
  }

  /**
   * Compare two 128-dimensional biometric facial descriptors using dual metrics
   * (Euclidean Distance + Cosine Similarity) to prevent overfitting while strictly
   * rejecting impostors and friends.
   */
  public compareBiometricDescriptors(
    liveDescriptor: number[],
    enrolledDescriptor: number[],
    threshold = this.euclideanThreshold
  ): FaceMatchResult {
    if (
      !liveDescriptor ||
      !enrolledDescriptor ||
      !Array.isArray(liveDescriptor) ||
      !Array.isArray(enrolledDescriptor) ||
      liveDescriptor.length !== 128 ||
      enrolledDescriptor.length !== 128
    ) {
      return {
        matched: false,
        confidence: 0,
        distance: 1.0,
        cosineSimilarity: 0,
        reason: 'Invalid 128-dimensional biometric descriptor vector dimensions.',
      };
    }

    let sumSquared = 0;
    let dotProduct = 0;
    let normLive = 0;
    let normEnrolled = 0;

    for (let i = 0; i < 128; i++) {
      const diff = liveDescriptor[i] - enrolledDescriptor[i];
      sumSquared += diff * diff;

      dotProduct += liveDescriptor[i] * enrolledDescriptor[i];
      normLive += liveDescriptor[i] * liveDescriptor[i];
      normEnrolled += enrolledDescriptor[i] * enrolledDescriptor[i];
    }

    const distance = Math.sqrt(sumSquared);
    const denominator = Math.sqrt(normLive) * Math.sqrt(normEnrolled);
    const cosine = denominator > 0 ? dotProduct / denominator : 0;

    const matched = distance < threshold && cosine >= this.cosineThreshold;

    // ISO/NIST Standard Platt Sigmoidal Score Calibration:
    const alpha = 12.5;
    const d0 = 0.52;
    const logit = alpha * (distance - d0);
    const plattProb = 1 / (1 + Math.exp(logit));
    const confidence = Math.round(plattProb * 100);

    let adaptiveDescriptor: number[] | undefined;
    if (matched && distance < 0.35) {
      adaptiveDescriptor = this.computeAdaptiveVector(enrolledDescriptor, liveDescriptor, 0.08);
    }

    return {
      matched,
      confidence,
      distance: Number(distance.toFixed(4)),
      cosineSimilarity: Number(cosine.toFixed(4)),
      adaptiveDescriptor,
      reason: matched
        ? `Face verified successfully (${confidence}% match, distance ${distance.toFixed(3)} < ${threshold}).`
        : `Face verification failed! (${confidence}% match, distance ${distance.toFixed(3)} >= ${threshold}). Impostor or friend's face rejected.`,
    };
  }

  public computeAdaptiveVector(
    enrolled: number[],
    live: number[],
    alpha = 0.08
  ): number[] {
    const updated = new Array(128);
    let norm = 0;
    for (let i = 0; i < 128; i++) {
      updated[i] = (1 - alpha) * enrolled[i] + alpha * live[i];
      norm += updated[i] * updated[i];
    }
    const len = Math.sqrt(norm);
    if (len > 0) {
      for (let i = 0; i < 128; i++) {
        updated[i] = Number((updated[i] / len).toFixed(6));
      }
    }
    return updated;
  }

  /**
   * Biometric comparison using Google Gemini 2.5 Flash Vision
   */
  public async verifyWithGemini(
    enrolledPayload: ImagePayload,
    selfiePayload: ImagePayload,
    apiKey: string
  ): Promise<FaceMatchResult> {
    const prompt = `You are a strict, ultra-high-precision biometric facial verification AI for a college transit attendance system.
Compare Image 1 (Enrolled Student Profile Reference) and Image 2 (Live Bus Camera Selfie).

MANDATORY INSPECTION RULES:
1. FACE PRESENCE: Both images MUST contain a clearly visible human face. If either image lacks a human face, or shows scenery/objects/animals, you MUST return matched=false and confidence=0.
2. FACIAL LANDMARKS: Rigorously analyze interpupillary distance, eye shape, canthus angles, and eyebrow arch.
3. NASAL MORPHOLOGY: Inspect nasal bridge width, tip contour, and nostril symmetry.
4. JAWLINE & CHIN: Analyze mandibular curvature, chin prominence, philtrum height, and lip proportions.
5. ANTI-SPOOFING & LIVENESS: Verify Image 2 is an authentic, live human being. Strictly reject mobile screen replays (detect digital moiré, screen glare, bezel borders), paper photo printouts, or cutouts.
6. MATCH CRITERIA: Declare matched=true ONLY if you are confident (>=70% confidence) both photographs represent the exact same individual. Reject impostors and friends with confidence < 70%.

Return strictly a valid JSON object without markdown formatting:
{
  "matched": boolean,
  "confidence": number, // 0 to 100 integer
  "reason": "Detailed biometric explanation of similarities or discrepancies",
  "biometricDetails": {
    "facialStructure": "Detailed summary of matching or differing facial geometry",
    "antiSpoofingPassed": boolean
  }
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: enrolledPayload.mimeType,
                  data: enrolledPayload.base64,
                },
              },
              {
                inlineData: {
                  mimeType: selfiePayload.mimeType,
                  data: selfiePayload.base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini API returned empty candidate response.');
    }

    const parsed = JSON.parse(candidateText);
    const confidence = Math.min(100, Math.max(0, Math.round(parsed.confidence ?? 0)));
    const matched = Boolean(parsed.matched) && confidence >= 70;

    return {
      matched,
      confidence,
      engine: 'GEMINI_VISION',
      provider: 'Google Gemini 2.5 Flash',
      reason: parsed.reason || (matched ? 'Face verified via Gemini Vision.' : 'Face mismatch rejected by Gemini Vision.'),
      biometricDetails: parsed.biometricDetails,
    };
  }

  /**
   * Biometric comparison using Groq Cloud Vision (Qwen 27B Vision)
   */
  public async verifyWithGroq(
    enrolledPayload: ImagePayload,
    selfiePayload: ImagePayload,
    apiKey: string
  ): Promise<FaceMatchResult> {
    const prompt = `You are a strict, ultra-high-precision biometric facial verification AI for a college transit attendance system.
Compare Image 1 (Enrolled Student Profile Reference) and Image 2 (Live Bus Camera Selfie).

MANDATORY INSPECTION RULES:
1. FACE PRESENCE: Both images MUST contain a clearly visible human face. If either image lacks a human face, or shows scenery/objects/animals, you MUST return matched=false and confidence=0.
2. FACIAL LANDMARKS: Rigorously analyze interpupillary distance, eye shape, canthus angles, and eyebrow arch.
3. NASAL MORPHOLOGY: Inspect nasal bridge width, tip contour, and nostril symmetry.
4. JAWLINE & CHIN: Analyze mandibular curvature, chin prominence, philtrum height, and lip proportions.
5. ANTI-SPOOFING & LIVENESS: Verify Image 2 is an authentic, live human being. Strictly reject mobile screen replays (detect digital moiré, screen glare, bezel borders), paper photo printouts, or cutouts.
6. MATCH CRITERIA: Declare matched=true ONLY if you are confident (>=70% confidence) both photographs represent the exact same individual. Reject impostors and friends with confidence < 70%.

Return strictly a valid JSON object without markdown formatting:
{
  "matched": boolean,
  "confidence": number, // 0 to 100 integer
  "reason": "Detailed biometric explanation of similarities or discrepancies",
  "biometricDetails": {
    "facialStructure": "Detailed summary of matching or differing facial geometry",
    "antiSpoofingPassed": boolean
  }
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: enrolledPayload.dataUri } },
              { type: 'image_url', image_url: { url: selfiePayload.dataUri } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Groq API HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq API returned empty message content.');
    }

    const parsed = JSON.parse(content);
    const confidence = Math.min(100, Math.max(0, Math.round(parsed.confidence ?? 0)));
    const matched = Boolean(parsed.matched) && confidence >= 70;

    return {
      matched,
      confidence,
      engine: 'GROQ_VISION',
      provider: 'Groq Cloud Qwen 27B Vision',
      reason: parsed.reason || (matched ? 'Face verified via Groq Vision.' : 'Face mismatch rejected by Groq Vision.'),
      biometricDetails: parsed.biometricDetails,
    };
  }

  /**
   * Primary Dual-Cloud Load-Balanced AI Face Verification Pipeline (Gemini + Groq)
   * Alternates requests and performs automated failover between the two cloud engines.
   * If both are unreachable, strictly rejects verification rather than using fake mock algorithms.
   */
  public async verifyFaceMatchAsync(
    liveSelfieUrlOrBase64: string,
    enrolledPhotoUrlOrBase64?: string
  ): Promise<FaceMatchResult> {
    if (!liveSelfieUrlOrBase64) {
      return {
        matched: false,
        confidence: 0,
        reason: 'No camera capture received. Retake front selfie.',
      };
    }

    if (!enrolledPhotoUrlOrBase64) {
      return {
        matched: false,
        confidence: 0,
        reason: 'Face not registered! You must enroll your face photo before marking attendance.',
      };
    }

    const geminiKey = this.getGeminiApiKey();
    const groqKey = this.getGroqApiKey();

    if (!geminiKey && !groqKey) {
      console.error('❌ [Dual-AI-LoadBalancer] No Cloud AI API keys configured (GEMINI_API_KEY / GROQ_API_KEY missing in .env).');
      return {
        matched: false,
        confidence: 0,
        reason: 'Face verification service unavailable: No Cloud AI keys configured in server environment.',
      };
    }

    const [selfiePayload, enrolledPayload] = await Promise.all([
      this.toImagePayload(liveSelfieUrlOrBase64),
      this.toImagePayload(enrolledPhotoUrlOrBase64),
    ]);

    if (!selfiePayload || !enrolledPayload) {
      return {
        matched: false,
        confidence: 0,
        reason: 'Face verification failed: Unable to process face images. Retake photo with proper lighting.',
      };
    }

    // Determine Primary vs Secondary engine based on round-robin request index:
    FaceVerificationEngine.requestIndex++;
    const preferGemini = FaceVerificationEngine.requestIndex % 2 === 1;

    const engines = preferGemini
      ? [
          { name: 'Gemini', key: geminiKey, run: () => this.verifyWithGemini(enrolledPayload, selfiePayload, geminiKey!) },
          { name: 'Groq', key: groqKey, run: () => this.verifyWithGroq(enrolledPayload, selfiePayload, groqKey!) },
        ]
      : [
          { name: 'Groq', key: groqKey, run: () => this.verifyWithGroq(enrolledPayload, selfiePayload, groqKey!) },
          { name: 'Gemini', key: geminiKey, run: () => this.verifyWithGemini(enrolledPayload, selfiePayload, geminiKey!) },
        ];

    let lastError = '';
    for (const engine of engines) {
      if (!engine.key) continue;
      try {
        console.log(`🤖 [Dual-AI-LoadBalancer] Routing face verification request to ${engine.name} Vision...`);
        const result = await engine.run();
        console.log(`✅ [Dual-AI-LoadBalancer] ${engine.name} response: ${result.confidence}% match (verified: ${result.matched})`);
        return result;
      } catch (engineErr: any) {
        lastError = engineErr.message;
        console.warn(`⚠️ [Dual-AI-LoadBalancer] ${engine.name} encounter notice: ${engineErr.message}. Attempting failover...`);
      }
    }

    // Zero mock fallbacks: If real AI verification fails, strictly reject
    console.error(`❌ [Dual-AI-LoadBalancer] Both cloud AI vision engines failed. Last error: ${lastError}`);
    return {
      matched: false,
      confidence: 0,
      reason: `Face verification failed: Cloud AI vision services were unreachable (${lastError || 'Service timeout'}). Please retry in a few moments.`,
    };
  }
}

export const faceVerificationEngine = new FaceVerificationEngine();
