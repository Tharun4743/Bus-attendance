import { describe, it, expect } from 'vitest';
import {
  createStudentRegistrationOptions,
  createStudentAuthenticationOptions,
  getRPID,
  getExpectedOrigin,
  formatWebAuthnError,
} from '../src/lib/webauthn';
import { calculateDistance } from '../src/server/attendance/haversine';
import { Student } from '../src/types';

describe('Mobile Boarding Verification & Android WebAuthn Architecture', () => {
  const dummyStudent: Student = {
    id: 'student-test-uuid-001',
    name: 'Tharunkumar K',
    email: 'tharun.student@college.edu',
    registerNumber: '922524UIT001',
    role: 'STUDENT',
    status: 'APPROVED',
    approved: true,
    active: true,
    department: 'Information Technology',
    year: 'III',
    busId: 'BUS01',
    createdAt: new Date().toISOString(),
    biometricCredential: {
      credentialId: 'cred-test-id-abc123',
      publicKey: 'BM9p...testPublicKeyBase64Url',
      counter: 1,
      transports: ['internal', 'hybrid'],
      registeredAt: new Date().toISOString(),
    },
  };

  describe('1. WebAuthn Registration Options (Android Credential Manager Tuning)', () => {
    it('enforces residentKey: preferred to prevent Android GPM IPC crashing', async () => {
      const options = await createStudentRegistrationOptions(dummyStudent, 'vsbecbus.vercel.app');

      expect(options.rp.id).toBe('vsbecbus.vercel.app');
      expect(options.rp.name).toBe('VSB Bus Attendance');
      expect(options.authenticatorSelection?.authenticatorAttachment).toBe('platform');
      expect(options.authenticatorSelection?.userVerification).toBe('required');
      expect(options.authenticatorSelection?.residentKey).toBe('preferred');
      expect(options.authenticatorSelection?.requireResidentKey).toBe(false);
    });

    it('restricts algorithms to ES256 and RS256 for 100% Android Keystore compatibility', async () => {
      const options = await createStudentRegistrationOptions(dummyStudent, 'vsbecbus.vercel.app');

      const algs = options.pubKeyCredParams.map((p) => p.alg);
      expect(algs).toContain(-7); // ES256 (P-256 curve)
      expect(algs).toContain(-257); // RS256 (RSA 2048)
      // Must NOT contain experimental Node 24 post-quantum algs like -48 which trigger Android binder crashes
      expect(algs).not.toContain(-48);
    });

    it('encodes userID deterministically as Uint8Array byte sequence', async () => {
      const options = await createStudentRegistrationOptions(dummyStudent, 'vsbecbus.vercel.app');

      expect(options.user.id).toBeDefined();
      expect(typeof options.user.id).toBe('string');
      expect(options.user.name).toBe('922524UIT001');
      expect(options.user.displayName).toBe('Tharunkumar K');
    });
  });

  describe('2. WebAuthn Authentication Options (Platform Fingerprint Assertion)', () => {
    it('generates authentication options with enrolled credential ID and transports', async () => {
      const options = await createStudentAuthenticationOptions(dummyStudent, 'vsbecbus.vercel.app');

      expect(options.rpId).toBe('vsbecbus.vercel.app');
      expect(options.userVerification).toBe('required');
      expect(options.allowCredentials).toBeDefined();
      expect(options.allowCredentials?.length).toBe(1);
      expect(options.allowCredentials?.[0].id).toBe('cred-test-id-abc123');
      expect(options.allowCredentials?.[0].transports).toContain('internal');
    });

    it('throws descriptive error if student does not have an enrolled biometric credential', async () => {
      const uncredentialedStudent: Student = {
        ...dummyStudent,
        biometricCredential: undefined,
      };

      await expect(
        createStudentAuthenticationOptions(uncredentialedStudent, 'vsbecbus.vercel.app')
      ).rejects.toThrow('No physical biometric credential enrolled on this student profile.');
    });
  });

  describe('3. Dynamic RP ID and Origin Resolution', () => {
    it('normalizes domains and strips ports from requesting hosts', () => {
      expect(getRPID('vsbecbus.vercel.app')).toBe('vsbecbus.vercel.app');
      expect(getRPID('https://vsbecbus.vercel.app/api')).toBe('vsbecbus.vercel.app');
      expect(getRPID('localhost:5173')).toBe('localhost');
      expect(getRPID('127.0.0.1:3000')).toBe('127.0.0.1');
      expect(getRPID(undefined)).toBe('vsbecbus.vercel.app');
    });

    it('generates expected origin set including production and client origins', () => {
      const origins = getExpectedOrigin('vsbecbus.vercel.app', 'https://vsbecbus-preview.vercel.app');
      expect(origins).toContain('https://vsbecbus.vercel.app');
      expect(origins).toContain('https://vsbecbus-preview.vercel.app');
      expect(origins).toContain('http://localhost:5173');
    });
  });

  describe('4. Common High-Accuracy GPS Geofence Verification', () => {
    const campusCenter = { latitude: 10.9572, longitude: 78.0766 };

    it('verifies student within stationary 35m boarding bay', () => {
      // 5 meters from center
      const studentLat = 10.95724;
      const studentLng = 78.07663;
      const distance = calculateDistance(
        studentLat,
        studentLng,
        campusCenter.latitude,
        campusCenter.longitude
      );

      expect(distance).toBeLessThan(35);
    });

    it('rejects student outside boarding boundary', () => {
      // ~500 meters away
      const farLat = 10.9615;
      const farLng = 78.0799;
      const distance = calculateDistance(
        farLat,
        farLng,
        campusCenter.latitude,
        campusCenter.longitude
      );

      expect(distance).toBeGreaterThan(35);
    });
  });

  describe('5. WebAuthn & Android Credential Manager Error Sanitization', () => {
    it('maps NotAllowedError to user cancellation guidance', () => {
      const err = { name: 'NotAllowedError', message: 'The operation either timed out or was not allowed.' };
      const msg = formatWebAuthnError(err, false);
      expect(msg).toContain('cancelled or timed out');
      expect(msg).toContain('Face + GPS');
    });

    it('maps InvalidStateError to device sensor profile reset guidance', () => {
      const err = { name: 'InvalidStateError', message: 'The authenticator is already registered.' };
      const msg = formatWebAuthnError(err, true);
      expect(msg).toContain('Reset Sensor');
    });

    it('maps NotSupportedError to clear fallback guidance', () => {
      const err = { name: 'NotSupportedError', message: 'WebAuthn is not supported.' };
      const msg = formatWebAuthnError(err, false);
      expect(msg).toContain('Hardware fingerprint scanner is not supported');
      expect(msg).toContain('Face + GPS');
    });

    it('maps SecurityError to HTTPS guidance', () => {
      const err = { name: 'SecurityError', message: 'Insecure context.' };
      const msg = formatWebAuthnError(err, false);
      expect(msg).toContain('HTTPS');
    });

    it('maps Unknown Credential Manager error to device settings guidance', () => {
      const err = { name: 'UnknownError', message: 'An unknown error occurred while talking to the credential manager.' };
      const msg = formatWebAuthnError(err, true);
      expect(msg).toContain('Android Credential Manager');
      expect(msg).toContain('Android Settings');
    });
  });
});
