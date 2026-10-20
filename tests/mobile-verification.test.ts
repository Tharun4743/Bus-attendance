import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { faceVerificationEngine } from '../src/lib/faceVerification';
import { mobileBiometricEngine } from '../src/lib/webauthn';
import { calculateDistance } from '../src/server/attendance/haversine';

describe('⚡ Mobile Zero-Hardware Attendance Verification Circuits', () => {
  // Test Image Generator: valid PNG data URLs
  const sampleBase64PngA =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  // Larger realistic image payload (over 500 characters)
  const validLiveSelfie =
    'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH' +
    '5QkKDBYmZkVg6gAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAACWklEQVR42u3b' +
    'sU4CQRSA4X93V2g10RgTF4rExkKjsTX2VvoE3gUfwJ/QWGsLC42NhcTCQmOhsTHRxGIjMYmJxsTG6O7eY7mH' +
    'xcUlu3O3g7v5kpyZzGQm+TlzZ2ZnFwRBkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJ' +
    'kiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJ' +
    'kiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJ' +
    'kiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJ' +
    'kiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJ' +
    'kiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJ' +
    'kiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkuQP' +
    'u7N7j67/O86e1h/gAAAAElFTkSuQmCC';

  describe('Circuit 1: Mobile Face Verification Engine', () => {
    it('validates base64 data URLs accurately', () => {
      expect(faceVerificationEngine.isValidImagePayload(sampleBase64PngA)).toBe(true);
      expect(faceVerificationEngine.isValidImagePayload(validLiveSelfie)).toBe(true);
      expect(faceVerificationEngine.isValidImagePayload('not_an_image')).toBe(false);
      expect(faceVerificationEngine.isValidImagePayload('https://example.com/pic.jpg')).toBe(false);
      expect(faceVerificationEngine.isValidImagePayload('')).toBe(false);
    });

    it('rejects verification if selfie format is invalid or empty', () => {
      const result = faceVerificationEngine.verifyFaceMatch('invalid_payload', sampleBase64PngA);
      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('Invalid camera selfie image format');
    });

    it('rejects capture if base64 data is too short or contains no pixel data', () => {
      const result = faceVerificationEngine.verifyFaceMatch(sampleBase64PngA, validLiveSelfie);
      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('insufficient pixel data');
    });

    it('strictly rejects verification if student has not registered their face baseline', () => {
      const result = faceVerificationEngine.verifyFaceMatch(validLiveSelfie, undefined);
      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('Face not registered');
    });

    it('calculates match confidence percentage score for identical portraits', () => {
      const result = faceVerificationEngine.verifyFaceMatch(validLiveSelfie, validLiveSelfie);
      expect(result.matched).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(65);
    });
  });

  describe('Circuit 2: Smartphone-Native Biometric Engine (WebAuthn)', () => {
    const testStudentId = 'stu_test_99';

    it('generates a cryptographically strong base64url challenge', () => {
      const challenge = mobileBiometricEngine.generateChallenge(testStudentId);
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
      // 32 bytes base64url encoded is 43 characters
      expect(challenge.length).toBeGreaterThanOrEqual(40);
    });

    it('verifies mobile biometric assertion payload successfully', () => {
      const challenge = mobileBiometricEngine.generateChallenge(testStudentId);
      const assertionPayload = {
        challenge,
        credentialId: 'cred_native_fingerprint_001',
        signature: 'mock_crypto_signature_sig',
        rawId: 'raw_native_id_001',
      };

      const result = mobileBiometricEngine.verifyAssertion(testStudentId, assertionPayload);
      expect(result.verified).toBe(true);
      expect(result.message).toContain('verified successfully');
    });

    it('rejects assertion when payload contains no credentials or signature', () => {
      mobileBiometricEngine.generateChallenge(testStudentId);
      const invalidPayload = {};

      const result = mobileBiometricEngine.verifyAssertion(testStudentId, invalidPayload);
      expect(result.verified).toBe(false);
      expect(result.message).toContain('Invalid biometric authentication response');
    });
  });

  describe('Circuit 3: Zero-Hardware GPS Geofencing Bounds', () => {
    // Bus stop / bus live GPS coordinates
    const busLat = 12.971598;
    const busLng = 77.594562;
    const geofenceRadius = 100; // 100 meters

    it('approves student location inside bus geofence radius', () => {
      // Offset by approx 20 meters north
      const studentLat = 12.971778;
      const studentLng = 77.594562;
      const distance = calculateDistance(busLat, busLng, studentLat, studentLng);

      expect(distance).toBeLessThan(geofenceRadius);
    });

    it('rejects student location outside bus geofence radius', () => {
      // Offset by approx 350 meters
      const remoteLat = 12.974750;
      const remoteLng = 77.594562;
      const distance = calculateDistance(busLat, busLng, remoteLat, remoteLng);

      expect(distance).toBeGreaterThan(geofenceRadius);
    });
  });
});
