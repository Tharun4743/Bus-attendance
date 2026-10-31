import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { faceVerificationEngine } from '../src/lib/faceVerification';
import { mobileBiometricEngine, PLATFORM_AUTHENTICATOR_CONFIG } from '../src/lib/webauthn';
import { calculateDistance } from '../src/server/attendance/haversine';
import {
  padBase64,
  base64UrlToUint8Array,
  bufferToBase64Url,
  formatWebAuthnError,
} from '../src/components/attendance/MobileVerificationModal';

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
      expect(result.confidence).toBe(100);
    });

    it('strictly rejects disparate images in synchronous mode without cloud AI bypass', () => {
      const disparatePhoto = validLiveSelfie.slice(0, -10) + 'AAAAAAAAAA==';
      const result = faceVerificationEngine.verifyFaceMatch(validLiveSelfie, disparatePhoto);
      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('Disparate photo verification requires');
    });

    it('accurately verifies same person biometric descriptor vector with low Euclidean distance', () => {
      // Create baseline 128-D normalized unit vector
      const enrolledVector = new Array(128).fill(0).map((_, i) => Math.sin(i / 10));
      // Live vector for same person (slight sensor variance)
      const samePersonLiveVector = enrolledVector.map((val) => val + (Math.random() * 0.04 - 0.02));

      const result = faceVerificationEngine.compareBiometricDescriptors(samePersonLiveVector, enrolledVector);
      expect(result.matched).toBe(true);
      expect(result.distance).toBeLessThan(0.48);
      expect(result.confidence).toBeGreaterThan(60);
    });

    it('strictly REJECTS friend / impostor biometric vector with distance >= 0.48', () => {
      // Student A enrolled vector
      const enrolledVector = new Array(128).fill(0).map((_, i) => Math.sin(i / 10));
      // Friend B live vector (completely different facial landmarks)
      const friendLiveVector = new Array(128).fill(0).map((_, i) => Math.cos(i / 5));

      const result = faceVerificationEngine.compareBiometricDescriptors(friendLiveVector, enrolledVector);
      expect(result.matched).toBe(false);
      expect(result.distance).toBeGreaterThanOrEqual(0.48);
      expect(result.confidence).toBeLessThan(50);
      expect(result.reason).toContain('Impostor or friend\'s face rejected');
    });

    it('rejects invalid or corrupted vector dimensions', () => {
      const invalidShortVector = [0.1, 0.2, 0.3];
      const validVector = new Array(128).fill(0.1);

      const result = faceVerificationEngine.compareBiometricDescriptors(invalidShortVector, validVector);
      expect(result.matched).toBe(false);
      expect(result.reason).toContain('Invalid 128-dimensional biometric descriptor');
    });

    it('calibrates scores smoothly along the ISO/NIST Platt sigmoid curve without step-overfitting', () => {
      // Create vectors at exact Euclidean distances to test the continuous score curve
      const base = new Array(128).fill(0);
      base[0] = 1; // Unit vector

      // Vector at distance 0.20
      const close = [...base];
      close[0] = Math.cos(0.20);
      close[1] = Math.sin(0.20);
      const resClose = faceVerificationEngine.compareBiometricDescriptors(close, base);
      expect(resClose.confidence).toBeGreaterThanOrEqual(90); // ~96%

      // Vector at distance 0.65 (friend / impostor)
      const distant = [...base];
      distant[0] = Math.cos(0.65);
      distant[1] = Math.sin(0.65);
      const resDistant = faceVerificationEngine.compareBiometricDescriptors(distant, base);
      expect(resDistant.confidence).toBeLessThan(25); // ~15%
      expect(resDistant.matched).toBe(false);
    });

    it('detects and rejects multi-dimensional biometric impostor vectors', () => {
      // Baseline student enrolled vector
      const enrolledVector = new Array(128).fill(0).map((_, i) => Math.sin(i / 10));
      // Impostor vector with orthogonal landmarks
      const impostorVector = new Array(128).fill(0).map((_, i) => Math.cos(i / 3));

      const comparison = faceVerificationEngine.compareBiometricDescriptors(impostorVector, enrolledVector);
      expect(comparison.matched).toBe(false);
      expect(comparison.distance).toBeGreaterThanOrEqual(0.48);
      expect(comparison.confidence).toBeLessThan(50);
      expect(comparison.reason).toContain('Impostor or friend\'s face rejected');
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

    it('safely rejects assertion pending server-side cryptographic public-key validation', () => {
      const challenge = mobileBiometricEngine.generateChallenge(testStudentId);
      const assertionPayload = {
        challenge,
        credentialId: 'cred_native_fingerprint_001',
        signature: 'mock_crypto_signature_sig',
        rawId: 'raw_native_id_001',
      };

      const result = mobileBiometricEngine.verifyAssertion(testStudentId, assertionPayload);
      expect(result.verified).toBe(false);
      expect(result.message).toContain('disabled');
    });

    it('registers and retrieves a mobile biometric platform credential', () => {
      const regResult = mobileBiometricEngine.registerCredential(
        testStudentId,
        'cred_platform_touchid_888',
        'raw_id_platform_888'
      );
      expect(regResult.success).toBe(true);
      expect(regResult.credential?.credentialId).toBe('cred_platform_touchid_888');

      const retrieved = mobileBiometricEngine.getRegisteredCredential(testStudentId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.credentialId).toBe('cred_platform_touchid_888');
      expect(retrieved?.studentId).toBe(testStudentId);
    });

    it('rejects credential registration when credentialId is empty', () => {
      const regResult = mobileBiometricEngine.registerCredential(testStudentId, '');
      expect(regResult.success).toBe(false);
      expect(regResult.message).toContain('Invalid biometric credential ID');
    });

    it('removes registered biometric credential upon unlinking', () => {
      mobileBiometricEngine.registerCredential(testStudentId, 'cred_to_remove');
      expect(mobileBiometricEngine.getRegisteredCredential(testStudentId)).toBeDefined();

      const removed = mobileBiometricEngine.removeCredential(testStudentId);
      expect(removed).toBe(true);
      expect(mobileBiometricEngine.getRegisteredCredential(testStudentId)).toBeNull();
    });

    it('rejects assertion when payload contains no credentials or signature', () => {
      mobileBiometricEngine.generateChallenge(testStudentId);
      const invalidPayload = {};

      const result = mobileBiometricEngine.verifyAssertion(testStudentId, invalidPayload);
      expect(result.verified).toBe(false);
      expect(result.message).toContain('disabled');
    });

    it('enforces platform authenticator parameters for phone in-display & side-mounted fingerprint sensors', () => {
      expect(PLATFORM_AUTHENTICATOR_CONFIG).toBeDefined();
      expect(PLATFORM_AUTHENTICATOR_CONFIG.authenticatorSelection.authenticatorAttachment).toBe('platform');
      expect(PLATFORM_AUTHENTICATOR_CONFIG.authenticatorSelection.userVerification).toBe('required');
      expect(PLATFORM_AUTHENTICATOR_CONFIG.authenticatorSelection.residentKey).toBe('preferred');
      expect(PLATFORM_AUTHENTICATOR_CONFIG.transports).toEqual(['internal']);
    });

    it('registers credential with internal transport binding for phone biometric reader', () => {
      const reg = mobileBiometricEngine.registerCredential(
        'student_fingerprint_test',
        'cred_indisplay_sensor_007',
        'raw_indisplay_007',
        ['internal']
      );

      expect(reg.success).toBe(true);
      expect(reg.credential?.transports).toContain('internal');

      const retrieved = mobileBiometricEngine.getRegisteredCredential('student_fingerprint_test');
      expect(retrieved?.transports).toEqual(['internal']);
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

  describe('Circuit 4: WebAuthn Helper Protocol & W3C URL Leak Prevention', () => {
    it('translates W3C NotAllowedError without leaking raw W3C specification URLs', () => {
      const w3cError = new Error(
        'The operation either timed out or was not allowed. See: https://www.w3.org/TR/webauthn-2/#sctn-privacy-considerations-client.'
      );
      w3cError.name = 'NotAllowedError';

      const formattedVerification = formatWebAuthnError(w3cError, false);
      expect(formattedVerification).toContain('Biometric scan was cancelled or not allowed');
      expect(formattedVerification).not.toContain('https://www.w3.org');
      expect(formattedVerification).not.toContain('privacy-considerations');

      const formattedRegistration = formatWebAuthnError(w3cError, true);
      expect(formattedRegistration).toContain('Biometric registration was cancelled or not allowed');
      expect(formattedRegistration).not.toContain('https://www.w3.org');
    });

    it('handles cancellation and abort error strings cleanly', () => {
      const cancelErr = new Error('The user canceled the authorization.');
      expect(formatWebAuthnError(cancelErr, false)).toContain('Biometric scan was cancelled');

      const abortErr = new Error('The operation was aborted');
      expect(formatWebAuthnError(abortErr, false)).toContain('Biometric scan was cancelled');
    });

    it('handles InvalidStateError, NotSupportedError, and SecurityError', () => {
      const alreadyRegErr = { name: 'InvalidStateError', message: 'The credential is already registered.' };
      expect(formatWebAuthnError(alreadyRegErr, true)).toContain('already registered');

      const notSupportedErr = { name: 'NotSupportedError', message: 'WebAuthn is not supported' };
      expect(formatWebAuthnError(notSupportedErr, false)).toContain('not supported on this browser');

      const secErr = { name: 'SecurityError', message: 'Insecure context' };
      expect(formatWebAuthnError(secErr, false)).toContain('secure HTTPS connection');
    });

    it('strips arbitrary URLs from unknown errors', () => {
      const leakErr = new Error('Unknown sensor fault at https://internal.sensor.dev/docs/err123 occurred');
      const sanitized = formatWebAuthnError(leakErr, false);
      expect(sanitized).not.toContain('https://internal.sensor.dev');
      expect(sanitized).toContain('Unknown sensor fault at occurred');
    });

    it('idempotently pads base64 and converts url-safe characters', () => {
      // Length % 4 === 2 -> needs '=='
      expect(padBase64('ab')).toBe('ab==');
      expect(padBase64('ab==')).toBe('ab==');

      // Length % 4 === 3 -> needs '='
      expect(padBase64('abc')).toBe('abc=');
      expect(padBase64('abc=')).toBe('abc=');

      // Length % 4 === 0 -> needs nothing
      expect(padBase64('abcd')).toBe('abcd');

      // URL safe - and _ replaced with + and /
      expect(padBase64('ab-_')).toBe('ab+/');
    });

    it('converts base64url to Uint8Array and safely handles edge cases', () => {
      const sample = 'SGVsbG8gV29ybGQ'; // "Hello World" in base64url
      const bytes = base64UrlToUint8Array(sample);
      const decoded = new TextDecoder().decode(bytes);
      expect(decoded).toBe('Hello World');

      // Empty string returns empty Uint8Array
      expect(base64UrlToUint8Array('').length).toBe(0);

      // Non-base64 fallback encodes cleanly without throwing
      const invalid = '!!not base64!!';
      expect(() => base64UrlToUint8Array(invalid)).not.toThrow();
    });

    it('converts ArrayBuffer to base64url without trailing padding', () => {
      const buffer = new TextEncoder().encode('Hello WebAuthn').buffer;
      const b64Url = bufferToBase64Url(buffer);
      expect(b64Url).toBe('SGVsbG8gV2ViQXV0aG4');
      expect(b64Url).not.toContain('=');
    });
  });
});
