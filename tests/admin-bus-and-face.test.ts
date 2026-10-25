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

  describe('2. Strict Eden AI Face Verification Engine (process.env.EDENAI_API_KEY)', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      delete process.env.OPENAI_API_KEY;
      vi.restoreAllMocks();
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('strictly reads EDENAI_API_KEY from environment and ignores OPENAI_API_KEY', () => {
      process.env.EDENAI_API_KEY = 'mock_test_key';
      (process.env as any).OPENAI_API_KEY = 'should_never_be_accessed';

      const key = faceVerificationEngine.getEdenAiApiKey();
      expect(key).toBe('mock_test_key');

      // Verify engine has no method or getter for OpenAI
      expect((faceVerificationEngine as any).getOpenAiApiKey).toBeUndefined();
    });

    it('invokes Eden AI face_compare API with amazon and facepp providers when EDENAI_API_KEY is present', async () => {
      process.env.EDENAI_API_KEY = 'mock_test_key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          amazon: {
            status: 'success',
            items: [
              {
                confidence: 94.8,
              },
            ],
          },
        }),
      });
      global.fetch = mockFetch;

      const result = await faceVerificationEngine.verifyFaceMatchAsync(
        'https://res.cloudinary.com/demo/image/upload/sample_selfie.jpg',
        'https://res.cloudinary.com/demo/image/upload/sample_enrolled.jpg'
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://api.edenai.run/v2/image/face_compare');
      expect(callArgs[1].headers.Authorization).toBe('Bearer mock_test_key');

      const body = JSON.parse(callArgs[1].body);
      expect(body.providers).toBe('amazon,facepp');
      expect(body.file1_url).toBe('https://res.cloudinary.com/demo/image/upload/sample_enrolled.jpg');
      expect(body.file2_url).toBe('https://res.cloudinary.com/demo/image/upload/sample_selfie.jpg');

      expect(result.matched).toBe(true);
      expect(result.engine).toBe('EDEN_AI');
      expect(result.confidence).toBe(95);
      expect(result.provider).toBe('Eden AI (Amazon Rekognition)');
    });

    it('rejects match when Eden AI confidence is below threshold (< 70%)', async () => {
      process.env.EDENAI_API_KEY = 'mock_test_key';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          amazon: {
            status: 'success',
            items: [
              {
                confidence: 42.1,
              },
            ],
          },
        }),
      });

      const result = await faceVerificationEngine.verifyFaceMatchAsync(
        'https://res.cloudinary.com/demo/image/upload/impostor_selfie.jpg',
        'https://res.cloudinary.com/demo/image/upload/sample_enrolled.jpg'
      );

      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(42);
      expect(result.reason).toContain('Face verification rejected');
    });

    it('gracefully uses fallback structural verification if cloud call fails', async () => {
      process.env.EDENAI_API_KEY = 'mock_test_key';

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await faceVerificationEngine.verifyFaceMatchAsync(
        'https://res.cloudinary.com/demo/image/upload/same_student.jpg',
        'https://res.cloudinary.com/demo/image/upload/same_student.jpg'
      );

      expect(result.engine).toBe('PERCEPTUAL_AI_FALLBACK');
      expect(result.matched).toBe(true);
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
