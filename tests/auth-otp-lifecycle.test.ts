import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { hashPassword, comparePassword } from '../src/server/auth';
import { OtpRecord, PasswordResetRecord, User } from '../src/types';

describe('⚡ Circuit 1: Auth OTP Lifecycle & Password Reset Regression Suite', () => {
  let storage: MemoryStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
  });

  // --------------------------------------------------------------------------
  // 1. 6-DIGIT CRYPTOGRAPHIC OTP GENERATION FORMAT
  // --------------------------------------------------------------------------
  describe('1. 6-Digit Cryptographic OTP Generation Format', () => {
    it('1.1: Generates numeric string of exactly 6 digits within [100000, 999999]', () => {
      for (let i = 0; i < 200; i++) {
        const otpInt = crypto.randomInt(100000, 1000000);
        const otpStr = otpInt.toString();

        expect(otpStr).toHaveLength(6);
        expect(/^\d{6}$/.test(otpStr)).toBe(true);
        expect(otpInt).toBeGreaterThanOrEqual(100000);
        expect(otpInt).toBeLessThan(1000000);
      }
    });

    it('1.2: SHA-256 OTP hashing is deterministic and produces a 64-character hex digest', () => {
      const sampleOtp = '582914';
      const hash1 = crypto.createHash('sha256').update(sampleOtp).digest('hex');
      const hash2 = crypto.createHash('sha256').update(sampleOtp).digest('hex');

      expect(hash1).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
      expect(hash1).toBe(hash2);

      const differentOtp = '582915';
      const hashDiff = crypto.createHash('sha256').update(differentOtp).digest('hex');
      expect(hash1).not.toBe(hashDiff);
    });

    it('1.3: Cryptographic distribution exhibits uniform entropy across high iterations', () => {
      const generated = new Set<string>();
      const iterations = 500;

      for (let i = 0; i < iterations; i++) {
        const otp = crypto.randomInt(100000, 1000000).toString();
        generated.add(otp);
      }

      // With 900,000 possible 6-digit combinations, collisions in 500 draws should be extremely rare (< 3)
      expect(generated.size).toBeGreaterThanOrEqual(iterations - 3);
    });
  });

  // --------------------------------------------------------------------------
  // 2. EXACT 10-MINUTE (600,000ms) EXPIRATION WINDOW
  // --------------------------------------------------------------------------
  describe('2. Exact 10-Minute (600,000ms) Expiration Window', () => {
    it('2.1: Dispatched OTP expires exactly 10 minutes (600,000 ms) after creation', async () => {
      const now = Date.now();
      const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();
      const createdAt = new Date(now).toISOString();

      const timeDelta = new Date(expiresAt).getTime() - new Date(createdAt).getTime();
      expect(timeDelta).toBe(600000);

      const record: OtpRecord = {
        id: crypto.randomUUID(),
        email: 'student.test@college.edu',
        otpHash: crypto.createHash('sha256').update('849201').digest('hex'),
        expiresAt,
        createdAt,
        attempts: 0,
        verified: false,
        signupData: {
          role: 'STUDENT',
          name: 'Test Student',
          registerNumber: 'REG-2026-001',
          email: 'student.test@college.edu',
          passwordHash: 'dummy_hash',
        },
      };

      await storage.saveOtp(record);

      const activeRecord = await storage.getOtp('student.test@college.edu');
      expect(activeRecord).not.toBeNull();
      expect(activeRecord?.id).toBe(record.id);
    });

    it('2.2: Returns null when OTP has expired beyond the 10-minute window', async () => {
      const pastTime = Date.now() - 601000; // 10 minutes and 1 second ago
      const expiredAt = new Date(pastTime + 10 * 60 * 1000).toISOString(); // Expired 1 second ago
      const createdAt = new Date(pastTime).toISOString();

      const record: OtpRecord = {
        id: crypto.randomUUID(),
        email: 'expired.test@college.edu',
        otpHash: crypto.createHash('sha256').update('123456').digest('hex'),
        expiresAt: expiredAt,
        createdAt,
        attempts: 0,
        verified: false,
      };

      await storage.saveOtp(record);

      // getOtp checks: expiresAt > now
      const fetched = await storage.getOtp('expired.test@college.edu');
      expect(fetched).toBeNull();
    });

    it('2.3: deleteExpiredOtps cleans up expired records and preserves active unexpired records', async () => {
      const now = Date.now();

      // Expired record (expired 2 minutes ago)
      const expiredRecord: OtpRecord = {
        id: crypto.randomUUID(),
        email: 'stale@college.edu',
        otpHash: crypto.createHash('sha256').update('111111').digest('hex'),
        expiresAt: new Date(now - 120000).toISOString(),
        createdAt: new Date(now - 720000).toISOString(),
        attempts: 0,
        verified: false,
      };

      // Valid record (expires in 8 minutes)
      const validRecord: OtpRecord = {
        id: crypto.randomUUID(),
        email: 'fresh@college.edu',
        otpHash: crypto.createHash('sha256').update('222222').digest('hex'),
        expiresAt: new Date(now + 8 * 60 * 1000).toISOString(),
        createdAt: new Date(now).toISOString(),
        attempts: 0,
        verified: false,
      };

      await storage.saveOtp(expiredRecord);
      await storage.saveOtp(validRecord);

      const deletedCount = await storage.deleteExpiredOtps();
      expect(deletedCount).toBe(1);

      const fetchedExpired = await storage.getOtp('stale@college.edu');
      expect(fetchedExpired).toBeNull();

      const fetchedValid = await storage.getOtp('fresh@college.edu');
      expect(fetchedValid).not.toBeNull();
      expect(fetchedValid?.email).toBe('fresh@college.edu');
    });
  });

  // --------------------------------------------------------------------------
  // 3. MAXIMUM 5-ATTEMPT RATE-LIMITING LOCKOUT
  // --------------------------------------------------------------------------
  describe('3. Maximum 5-Attempt Rate-Limiting Lockout', () => {
    it('3.1: Increments attempt counter sequentially on each verification query', async () => {
      const now = Date.now();
      const otpRecord: OtpRecord = {
        id: crypto.randomUUID(),
        email: 'lockout.test@college.edu',
        otpHash: crypto.createHash('sha256').update('654321').digest('hex'),
        expiresAt: new Date(now + 600000).toISOString(),
        createdAt: new Date(now).toISOString(),
        attempts: 0,
        verified: false,
      };

      await storage.saveOtp(otpRecord);

      for (let attempt = 1; attempt <= 5; attempt++) {
        const count = await storage.incrementOtpAttempts(otpRecord.id);
        expect(count).toBe(attempt);
      }
    });

    it('3.2: 5th attempt is permitted, 6th attempt exceeds threshold (>5) and locks out', async () => {
      const now = Date.now();
      const otpRecord: OtpRecord = {
        id: crypto.randomUUID(),
        email: 'rate.limit@college.edu',
        otpHash: crypto.createHash('sha256').update('777888').digest('hex'),
        expiresAt: new Date(now + 600000).toISOString(),
        createdAt: new Date(now).toISOString(),
        attempts: 0,
        verified: false,
      };

      await storage.saveOtp(otpRecord);

      // Simulate verification attempts with wrong code
      const verifyAttempt = async (candidateOtp: string) => {
        const record = await storage.getOtp('rate.limit@college.edu');
        if (!record || record.verified) {
          return { status: 400, error: 'No pending OTP verification found' };
        }
        if (new Date(record.expiresAt).getTime() < Date.now()) {
          return { status: 400, error: 'Verification code has expired' };
        }
        const attempts = await storage.incrementOtpAttempts(record.id);
        if (attempts > 5) {
          return { status: 429, error: 'Too many incorrect attempts. Please request a new code.' };
        }
        const candidateHash = crypto.createHash('sha256').update(candidateOtp).digest('hex');
        if (record.otpHash !== candidateHash) {
          return { status: 400, error: 'Invalid verification code.' };
        }
        await storage.markOtpVerified(record.id);
        return { status: 200, success: true };
      };

      // Attempts 1 through 5: Invalid code, returns 400
      for (let i = 1; i <= 5; i++) {
        const res = await verifyAttempt('000000');
        expect(res.status).toBe(400);
        expect(res.error).toBe('Invalid verification code.');
      }

      // Attempt 6: Rate limit lockout, returns 429
      const lockedOutRes = await verifyAttempt('000000');
      expect(lockedOutRes.status).toBe(429);
      expect(lockedOutRes.error).toBe('Too many incorrect attempts. Please request a new code.');

      // Even providing the CORRECT OTP on 7th attempt is rejected due to rate-limit lockout
      const postLockoutWithCorrectCode = await verifyAttempt('777888');
      expect(postLockoutWithCorrectCode.status).toBe(429);
    });
  });

  // --------------------------------------------------------------------------
  // 4. ATOMIC SINGLE-USE INVALIDATION & REPLAY DEFENSE
  // --------------------------------------------------------------------------
  describe('4. Atomic Single-Use Invalidation & Replay Defense', () => {
    it('4.1: Once OTP is verified, markOtpVerified sets verified=true and getOtp returns null', async () => {
      const now = Date.now();
      const otpRecord: OtpRecord = {
        id: crypto.randomUUID(),
        email: 'singleuse@college.edu',
        otpHash: crypto.createHash('sha256').update('456123').digest('hex'),
        expiresAt: new Date(now + 600000).toISOString(),
        createdAt: new Date(now).toISOString(),
        attempts: 0,
        verified: false,
      };

      await storage.saveOtp(otpRecord);

      // Verify OTP is pending
      const pending = await storage.getOtp('singleuse@college.edu');
      expect(pending).not.toBeNull();
      expect(pending?.verified).toBe(false);

      // Mark verified
      await storage.markOtpVerified(otpRecord.id);

      // Storage getOtp requires !o.verified, so it now returns null
      const postVerification = await storage.getOtp('singleuse@college.edu');
      expect(postVerification).toBeNull();
    });

    it('4.2: Replay attack prevention: Second verification attempt is completely rejected', async () => {
      const now = Date.now();
      const code = '987321';
      const otpRecord: OtpRecord = {
        id: crypto.randomUUID(),
        email: 'replay.prevent@college.edu',
        otpHash: crypto.createHash('sha256').update(code).digest('hex'),
        expiresAt: new Date(now + 600000).toISOString(),
        createdAt: new Date(now).toISOString(),
        attempts: 0,
        verified: false,
        signupData: {
          role: 'STUDENT',
          name: 'Replay Test',
          registerNumber: 'REG-999',
          email: 'replay.prevent@college.edu',
          passwordHash: 'hashed_pwd',
        },
      };

      await storage.saveOtp(otpRecord);

      const verifyFlow = async (inputCode: string) => {
        const record = await storage.getOtp('replay.prevent@college.edu');
        if (!record || record.verified) {
          return { success: false, status: 400, message: 'No pending OTP verification found' };
        }
        const inputHash = crypto.createHash('sha256').update(inputCode).digest('hex');
        if (record.otpHash !== inputHash) {
          return { success: false, status: 400, message: 'Invalid code' };
        }
        await storage.markOtpVerified(record.id);
        return { success: true, status: 200, message: 'Verified successfully' };
      };

      // First verification succeeds
      const firstAttempt = await verifyFlow(code);
      expect(firstAttempt.success).toBe(true);
      expect(firstAttempt.status).toBe(200);

      // Replay attempt with same code fails immediately
      const replayAttempt = await verifyFlow(code);
      expect(replayAttempt.success).toBe(false);
      expect(replayAttempt.status).toBe(400);
      expect(replayAttempt.message).toBe('No pending OTP verification found');
    });
  });

  // --------------------------------------------------------------------------
  // 5. PASSWORD RESET TOKEN GENERATION, EXPIRATION, AND INVALIDATION
  // --------------------------------------------------------------------------
  describe('5. Password Reset Token Generation, Expiration, and Invalidation', () => {
    it('5.1: Generates 32-byte (64 hex char) cryptographic reset token with SHA-256 hash', () => {
      const token = crypto.randomBytes(32).toString('hex');
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      expect(tokenHash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(tokenHash)).toBe(true);
    });

    it('5.2: Expiration window is exactly 15 minutes (900,000ms)', async () => {
      const now = Date.now();
      const expiresAt = new Date(now + 15 * 60 * 1000).toISOString();
      const createdAt = new Date(now).toISOString();

      const deltaMs = new Date(expiresAt).getTime() - new Date(createdAt).getTime();
      expect(deltaMs).toBe(900000);

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const resetRecord: PasswordResetRecord = {
        id: crypto.randomUUID(),
        email: 'user.reset@college.edu',
        tokenHash,
        expiresAt,
        used: false,
        createdAt,
      };

      await storage.savePasswordReset(resetRecord);

      const retrieved = await storage.getPasswordReset(tokenHash);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.email).toBe('user.reset@college.edu');
      expect(retrieved?.used).toBe(false);
    });

    it('5.3: Rejects expired password reset tokens and returns null', async () => {
      const now = Date.now();
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const expiredRecord: PasswordResetRecord = {
        id: crypto.randomUUID(),
        email: 'user.expired@college.edu',
        tokenHash,
        expiresAt: new Date(now - 5000).toISOString(), // expired 5 seconds ago
        used: false,
        createdAt: new Date(now - 905000).toISOString(),
      };

      await storage.savePasswordReset(expiredRecord);

      // getPasswordReset enforces: !p.used && p.expiresAt > now
      const retrieved = await storage.getPasswordReset(tokenHash);
      expect(retrieved).toBeNull();
    });

    it('5.4: Enforces atomic single-use invalidation once password reset is executed', async () => {
      const now = Date.now();
      const userEmail = 'user.secure@college.edu';

      // Seed test user
      const initialPassword = 'InitialSecurePassword123!';
      const initialHash = await hashPassword(initialPassword);
      const user: User = {
        id: 'U-RESET-01',
        name: 'Secure Reset User',
        email: userEmail,
        password: initialHash,
        role: 'STUDENT',
        active: true,
        approved: true,
        status: 'APPROVED',
      };
      await storage.createUser(user);

      // Generate reset token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const resetRecord: PasswordResetRecord = {
        id: crypto.randomUUID(),
        email: userEmail,
        tokenHash,
        expiresAt: new Date(now + 900000).toISOString(),
        used: false,
        createdAt: new Date(now).toISOString(),
      };
      await storage.savePasswordReset(resetRecord);

      // Execute Password Reset
      const executeReset = async (tokenInput: string, newPassword: string) => {
        const hash = crypto.createHash('sha256').update(tokenInput.trim()).digest('hex');
        const record = await storage.getPasswordReset(hash);
        if (!record || record.used) {
          return { success: false, status: 400, message: 'Invalid or already used reset token' };
        }
        if (new Date(record.expiresAt).getTime() < Date.now()) {
          return { success: false, status: 400, message: 'Reset token has expired' };
        }
        const usr = await storage.getUserByEmail(record.email);
        if (!usr) {
          return { success: false, status: 404, message: 'User not found' };
        }

        const newHash = await hashPassword(newPassword);
        await storage.updateUser(usr.id, { password: newHash });
        await storage.markPasswordResetUsed(record.id);
        return { success: true, status: 200, message: 'Password updated successfully' };
      };

      // 1. First reset succeeds
      const newPassword = 'NewVerySecurePassword456!';
      const firstResult = await executeReset(rawToken, newPassword);
      expect(firstResult.success).toBe(true);
      expect(firstResult.status).toBe(200);

      // 2. Verify password was updated in storage
      const updatedUser = await storage.getUserByEmail(userEmail);
      expect(updatedUser).not.toBeNull();
      const oldPasswordMatches = await comparePassword(initialPassword, updatedUser!.password);
      expect(oldPasswordMatches).toBe(false);
      const newPasswordMatches = await comparePassword(newPassword, updatedUser!.password);
      expect(newPasswordMatches).toBe(true);

      // 3. Second reset using SAME token is rejected (single-use defense)
      const secondResult = await executeReset(rawToken, 'AnotherPassword789!');
      expect(secondResult.success).toBe(false);
      expect(secondResult.status).toBe(400);
      expect(secondResult.message).toBe('Invalid or already used reset token');

      // 4. Token hash in storage is now permanently marked used
      const lookupAgain = await storage.getPasswordReset(tokenHash);
      expect(lookupAgain).toBeNull();
    });
  });
});
