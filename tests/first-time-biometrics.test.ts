import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import { getStorage } from '../src/server/storage';
import { cloudinaryPipeline } from '../src/lib/cloudinary';
import { faceVerificationEngine } from '../src/lib/faceVerification';

describe('⚡ 3-Pose Biometric Calibration & Supabase PostgreSQL Persistence Circuit', () => {
  const storage = getStorage();

  it('Circuit 1: Cloudinary Media Pipeline is configured with new isolated cloud', () => {
    expect(cloudinaryPipeline.isConfigured()).toBe(true);
    const signature = cloudinaryPipeline.generateUploadSignature('bus-attendance/profiles');
    expect(signature).toBeDefined();
    expect(signature?.signature).toBeDefined();
    expect(signature?.apiKey).toBe(process.env.CLOUDINARY_API_KEY);
    expect(signature?.cloudName).toBe(process.env.CLOUDINARY_CLOUD_NAME);
  });

  it('Circuit 2: Supabase PostgreSQL stores and updates 3-angle biometric vectors', async () => {
    // 1. Fetch target student
    const student = await storage.getStudentById('STU-24IT001');
    expect(student).toBeDefined();
    expect(student?.id).toBe('STU-24IT001');

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
    const testPhotoUrl = 'https://res.cloudinary.com/nr1r5044/image/upload/v1/bus-attendance/profiles/STU-24IT001/portrait.jpg';
    const testPublicId = 'bus-attendance/profiles/STU-24IT001/portrait';

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
    const reFetched = await storage.getStudentById('STU-24IT001');
    expect(reFetched).toBeDefined();
    expect(reFetched?.photoUrl).toBe(testPhotoUrl);
    expect(reFetched?.faceDescriptor?.length).toBe(128);
    expect(reFetched?.faceDescriptorLeft?.length).toBe(128);
    expect(reFetched?.faceDescriptorRight?.length).toBe(128);
    expect(reFetched?.faceEnrollmentQuality).toBe(98);
  });

  it('Circuit 3: Cloud AI Face Verification engine verifies registered student photo', async () => {
    const student = await storage.getStudentById('STU-24IT001');
    expect(student?.photoUrl).toBeDefined();

    const res = await faceVerificationEngine.verifyFaceMatchAsync(student!.photoUrl!, student!.photoUrl!);

    expect(res).toBeDefined();
    expect(res.matched).toBe(true);
    expect(typeof res.confidence).toBe('number');
    expect(res.confidence).toBeGreaterThanOrEqual(70);
    expect(res.confidence).toBeLessThanOrEqual(100);
    expect(res.engine).toBeDefined();
  });

  it('Circuit 4: Commuter Roster queries with zero reliance on JSON files', async () => {
    const allStudents = await storage.getStudents();
    expect(allStudents.length).toBeGreaterThanOrEqual(4);

    const bus06Students = await storage.getStudentsByBusId('BUS06');
    expect(bus06Students.length).toBeGreaterThanOrEqual(1);

    const buses = await storage.getBuses();
    expect(buses.length).toBeGreaterThanOrEqual(1);
    expect(buses.some((b) => b.id === 'BUS06')).toBe(true);
  });
});
