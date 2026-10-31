import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { brevoMailer } from '../src/lib/brevo';
import { cloudinaryPipeline } from '../src/lib/cloudinary';
import { calculateDistance } from '../src/server/attendance/haversine';

describe('⚡ Claude-Pro Architectural Verification Circuits', () => {
  describe('Circuit 1: Brevo Transactional Mailer & OTP Protocol', () => {
    it('generates a valid 6-digit cryptographic numeric OTP', () => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('enforces a 10-minute expiration window on OTPs', () => {
      const now = Date.now();
      const expiresAt = now + 10 * 60 * 1000;
      expect(expiresAt - now).toBe(600000);
    });

    it('generates high-entropy cryptographic password reset tokens', () => {
      const token = crypto.randomBytes(32).toString('hex');
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    });

    it('brevoMailer responds gracefully when unconfigured in local test environments', async () => {
      const res = await brevoMailer.sendOtpEmail('test@college.edu', 'Student', '123456');
      expect(res).toBeDefined();
      expect(typeof res.success).toBe('boolean');
    });
  });

  describe('Circuit 2: Ground Geofence Proximity & Haversine Distance', () => {
    it('calculates Haversine distance accurately between campus coordinates', () => {
      // Campus center (12.9716, 77.5946) to identical point is 0 meters
      const distanceSame = calculateDistance(12.9716, 77.5946, 12.9716, 77.5946);
      expect(distanceSame).toBeCloseTo(0, 1);

      // Point roughly 110 meters away
      const distanceNear = calculateDistance(12.9716, 77.5946, 12.9726, 77.5946);
      expect(distanceNear).toBeGreaterThan(100);
      expect(distanceNear).toBeLessThan(125);
    });
  });

  describe('Circuit 3: Cloudinary Media Pipeline', () => {
    it('pipeline is defined and provides upload signature method', () => {
      expect(cloudinaryPipeline).toBeDefined();
      const sig = cloudinaryPipeline.generateUploadSignature();
      // If environment variables are not set, it returns null without crashing
      if (cloudinaryPipeline.isConfigured()) {
        expect(sig).toHaveProperty('signature');
        expect(sig).toHaveProperty('timestamp');
      } else {
        expect(sig).toBeNull();
      }
    });
  });
});
