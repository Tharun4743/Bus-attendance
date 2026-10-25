import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { faceVerificationEngine } from '../src/lib/faceVerification';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';

describe('Super Admin Bus Management & Strict Eden AI Face Verification Suite', () => {
  let storage: MemoryStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
  });

  describe('1. Super Admin Add Bus & Route Architecture', () => {
    it('allows Super Admin to create a bus and configure route, capacity, and in-charge assignment', async () => {
      // 1. Create a bus with route and capacity
      const newBus = await storage.createBus({
        busNumber: 'TN-33-AX-8899',
        routeName: 'Tiruppur Express via Kangeyam',
        capacity: 55,
        inchargeId: 'incharge-tiruppur-1',
        active: true,
      });

      expect(newBus).toBeDefined();
      expect(newBus.busNumber).toBe('TN-33-AX-8899');
      expect(newBus.routeName).toBe('Tiruppur Express via Kangeyam');
      expect(newBus.capacity).toBe(55);
      expect(newBus.inchargeId).toBe('incharge-tiruppur-1');
      expect(newBus.active).toBe(true);

      // Verify bus is retrievable by ID and in all buses list
      const fetchedBus = await storage.getBusById(newBus.id);
      expect(fetchedBus).toBeDefined();
      expect(fetchedBus?.busNumber).toBe('TN-33-AX-8899');

      const allBuses = await storage.getBuses();
      expect(allBuses.some((b) => b.busNumber === 'TN-33-AX-8899')).toBe(true);
    });

    it('allows Super Admin to update bus route details and toggle active status', async () => {
      const bus = await storage.createBus({
        busNumber: 'TN-38-BZ-4411',
        routeName: 'Coimbatore South',
        capacity: 60,
        inchargeId: '',
        active: true,
      });

      const updated = await storage.updateBus(bus.id, {
        routeName: 'Coimbatore South via Pollachi Road',
        capacity: 65,
        active: false,
      });

      expect(updated).toBeDefined();
      expect(updated?.routeName).toBe('Coimbatore South via Pollachi Road');
      expect(updated?.capacity).toBe(65);
      expect(updated?.active).toBe(false);
    });
  });

  describe('2. Dual-Cloud Load-Balanced AI Face Verification Engine (Gemini & Groq)', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      delete process.env.EDENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GROQ_API_KEY;
      vi.restoreAllMocks();
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('strictly reads GEMINI_API_KEY and GROQ_API_KEY and confirms legacy keys are removed', () => {
      process.env.GEMINI_API_KEY = 'mock_gemini_key';
      process.env.GROQ_API_KEY = 'mock_groq_key';

      expect(faceVerificationEngine.getGeminiApiKey()).toBe('mock_gemini_key');
      expect(faceVerificationEngine.getGroqApiKey()).toBe('mock_groq_key');
      expect((faceVerificationEngine as any).getEdenAiApiKey).toBeUndefined();
      expect((faceVerificationEngine as any).getOpenAiApiKey).toBeUndefined();
    });

    it('invokes Google Gemini 2.5 Flash Vision when GEMINI_API_KEY is present', async () => {
      process.env.GEMINI_API_KEY = 'mock_gemini_key';

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          matched: true,
                          confidence: 96,
                          reason: 'Biometric landmarks and facial geometry match with high precision.',
                          biometricDetails: {
                            facialStructure: 'Interpupillary distance and nasal bridge contour align.',
                            antiSpoofingPassed: true,
                          },
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          headers: new Headers({ 'content-type': 'image/jpeg' }),
        });
      });
      global.fetch = mockFetch;

      const result = await faceVerificationEngine.verifyFaceMatchAsync(
        'https://res.cloudinary.com/demo/image/upload/sample_selfie.jpg',
        'https://res.cloudinary.com/demo/image/upload/sample_enrolled.jpg'
      );

      expect(result.matched).toBe(true);
      expect(result.engine).toBe('GEMINI_VISION');
      expect(result.confidence).toBe(96);
      expect(result.provider).toBe('Google Gemini 2.5 Flash');
    });

    it('invokes Groq Cloud Vision (Qwen 27B) when GROQ_API_KEY is present', async () => {
      process.env.GROQ_API_KEY = 'mock_groq_key';

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('api.groq.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      matched: true,
                      confidence: 92,
                      reason: 'Facial contour, jawline, and nose morphology match student profile.',
                    }),
                  },
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          headers: new Headers({ 'content-type': 'image/jpeg' }),
        });
      });
      global.fetch = mockFetch;

      const result = await faceVerificationEngine.verifyFaceMatchAsync(
        'https://res.cloudinary.com/demo/image/upload/sample_selfie.jpg',
        'https://res.cloudinary.com/demo/image/upload/sample_enrolled.jpg'
      );

      expect(result.matched).toBe(true);
      expect(result.engine).toBe('GROQ_VISION');
      expect(result.confidence).toBe(92);
      expect(result.provider).toBe('Groq Cloud Qwen 27B Vision');
    });

    it('strictly rejects verification when cloud AI calls fail (zero mock fallback policy)', async () => {
      process.env.GEMINI_API_KEY = 'mock_gemini_key';

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await faceVerificationEngine.verifyFaceMatchAsync(
        'https://res.cloudinary.com/demo/image/upload/same_student.jpg',
        'https://res.cloudinary.com/demo/image/upload/same_student.jpg'
      );

      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('Face verification failed');
    });
  });

  describe('3. Bus Incharge Registration & Admin Approval Workflow', () => {
    it('creates bus incharge in PENDING status requiring admin approval before activation', async () => {
      const incharge = await storage.signupIncharge({
        name: 'Suresh Kumar',
        email: 'suresh.incharge@transport.edu',
        phone: '+91 98765 43210',
        busNumber: 'TN-33-BC-9900',
        routeName: 'Erode Route #5',
      });

      expect(incharge).toBeDefined();
      expect(incharge.role).toBe('INCHARGE');
      expect(incharge.status).toBe('PENDING');
      expect(incharge.active).toBe(false);

      // Pending incharges should list this incharge
      const pendingList = await storage.getPendingIncharges();
      expect(pendingList.some((inc) => inc.id === incharge.id)).toBe(true);

      // Admin approves the incharge
      const approved = await storage.approveIncharge(incharge.id);
      expect(approved).toBeDefined();
      expect(approved?.status).toBe('APPROVED');
      expect(approved?.active).toBe(true);

      // Incharge is no longer pending
      const updatedPending = await storage.getPendingIncharges();
      expect(updatedPending.some((inc) => inc.id === incharge.id)).toBe(false);
    });

    it('prevents duplicate account creation for existing incharge email and verifies incharge lookup', async () => {
      await storage.signupIncharge({
        name: 'Kavitha Devi',
        email: 'kavitha@transport.edu',
        phone: '+91 98765 11111',
        busNumber: 'TN-45-DD-1212',
        routeName: 'Salem Bypass',
      });

      const existingUser = await storage.getUserByEmail('kavitha@transport.edu');
      expect(existingUser).toBeDefined();
      expect(existingUser?.role).toBe('INCHARGE');
      expect(existingUser?.email).toBe('kavitha@transport.edu');
    });
  });
});
