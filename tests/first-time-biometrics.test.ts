import { describe, it, expect, afterAll, vi } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import { getStorage } from '../src/server/storage';
import { cloudinaryPipeline } from '../src/lib/cloudinary';
import { faceVerificationEngine } from '../src/lib/faceVerification';

describe('⚡ 3-Pose Biometric Calibration & Supabase PostgreSQL Persistence Circuit', () => {
  const storage = getStorage();
  const testStudentId = 'STU-TESTVITEST01';
  const testEmail = 'test.vitest@college.edu';

  afterAll(async () => {
    // Clean up temporary test student from Supabase PostgreSQL
    try {
      if ('pool' in (storage as any)) {
        await (storage as any).pool.query("DELETE FROM public.students WHERE id = $1", [testStudentId]);
        await (storage as any).pool.query("DELETE FROM public.users WHERE email = $1", [testEmail]);
      }
    } catch (e) {
      // Ignore cleanup error
    }
  });

  it('Circuit 1: Cloudinary Media Pipeline is configured with new isolated cloud', () => {
    expect(cloudinaryPipeline.isConfigured()).toBe(true);
    const signature = cloudinaryPipeline.generateUploadSignature('bus-attendance/profiles');
    expect(signature).toBeDefined();
    expect(signature?.signature).toBeDefined();
    expect(signature?.apiKey).toBe(process.env.CLOUDINARY_API_KEY);
    expect(signature?.cloudName).toBe(process.env.CLOUDINARY_CLOUD_NAME);
  });

  it('Circuit 2: Supabase PostgreSQL stores and updates 3-angle biometric vectors', async () => {
    // 1. Create or fetch dedicated test student
    let student = await storage.getStudentById(testStudentId);
    if (!student) {
      student = await storage.createStudent({
        name: 'Vitest Test Commuter',
        registerNumber: 'TESTVITEST01',
        email: testEmail,
        phone: '+91 9876543210',
        busId: 'BUS06',
        role: 'STUDENT',
        status: 'APPROVED',
        approved: true,
        active: true,
      });
    }
    expect(student).toBeDefined();
    expect(student?.id).toBe(testStudentId);

    // 2. Generate synthetic normalized 128-D multi-pose calibration vectors
    const generateNormalizedVector = (seed: number): number[] => {
      const v = new Array(128);
      let norm = 0;
      for (let i = 0; i < 128; i++) {
        v[i] = Math.sin(seed + i * 0.1);
        norm += v[i] * v[i];
      }
      const len = Math.sqrt(norm);
      for (let i = 0; i < 128; i++) v[i] /= len;
      return v;
    };

    const centroid = generateNormalizedVector(42);
    const leftPose = generateNormalizedVector(43);
    const rightPose = generateNormalizedVector(44);
    const nowIso = new Date().toISOString();
    const testPhotoUrl = 'https://res.cloudinary.com/nr1r5044/image/upload/v1/bus-attendance/test-check/sample.jpg';
    const testPublicId = 'bus-attendance/test-check/sample';

    // 3. Update student in Supabase PostgreSQL
    const updated = await storage.updateStudent(student!.id, {
      photoUrl: testPhotoUrl,
      photoPublicId: testPublicId,
      faceDescriptor: centroid,
      faceDescriptorLeft: leftPose,
      faceDescriptorRight: rightPose,
      faceEnrolledAt: nowIso,
      faceEnrollmentQuality: 98,
    });

    expect(updated).toBeDefined();
    expect(updated?.photoUrl).toBe(testPhotoUrl);
    expect(updated?.faceEnrollmentQuality).toBe(98);
    expect(Array.isArray(updated?.faceDescriptor)).toBe(true);
    expect(updated?.faceDescriptor?.length).toBe(128);
    expect(Array.isArray(updated?.faceDescriptorLeft)).toBe(true);
    expect(updated?.faceDescriptorLeft?.length).toBe(128);
    expect(Array.isArray(updated?.faceDescriptorRight)).toBe(true);
    expect(updated?.faceDescriptorRight?.length).toBe(128);

    // 4. Query again to verify persistence
    const reFetched = await storage.getStudentById(testStudentId);
    expect(reFetched).toBeDefined();
    expect(reFetched?.photoUrl).toBe(testPhotoUrl);
    expect(reFetched?.faceDescriptor?.length).toBe(128);
    expect(reFetched?.faceDescriptorLeft?.length).toBe(128);
    expect(reFetched?.faceDescriptorRight?.length).toBe(128);
    expect(reFetched?.faceEnrollmentQuality).toBe(98);
  });

  it('Circuit 3: Cloud AI Face Verification engine verifies registered student photo', async () => {
    const student = await storage.getStudentById(testStudentId);
    expect(student?.photoUrl).toBeDefined();

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && (url.includes('googleapis.com') || url.includes('api.groq.com'))) {
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
                        confidence: 95,
                        reason: 'Enrolled photo matches reference facial landmarks perfectly.',
                        biometricDetails: { facialStructure: 'Complete landmark correspondence', antiSpoofingPassed: true },
                      }),
                    },
                  ],
                },
              },
            ],
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    matched: true,
                    confidence: 95,
                    reason: 'Enrolled photo matches reference facial landmarks perfectly.',
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

    try {
      const res = await faceVerificationEngine.verifyFaceMatchAsync(student!.photoUrl!, student!.photoUrl!);

      expect(res).toBeDefined();
      expect(res.matched).toBe(true);
      expect(typeof res.confidence).toBe('number');
      expect(res.confidence).toBeGreaterThanOrEqual(70);
      expect(res.confidence).toBeLessThanOrEqual(100);
      expect(res.engine).toBeDefined();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('Circuit 4: Commuter Roster queries with zero reliance on JSON files', async () => {
    const allStudents = await storage.getStudents();
    expect(allStudents.length).toBeGreaterThanOrEqual(1);

    const bus06Students = await storage.getStudentsByBusId('BUS06');
    expect(bus06Students.length).toBeGreaterThanOrEqual(1);

    const buses = await storage.getBuses();
    expect(buses.length).toBeGreaterThanOrEqual(1);
    expect(buses.some((b) => b.id === 'BUS06')).toBe(true);
  });
});
