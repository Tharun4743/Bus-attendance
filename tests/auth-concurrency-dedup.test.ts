import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken, revokeToken, isTokenRevoked } from '../src/server/auth';
import { User } from '../src/types';

describe('⚡ Authentication Concurrency, Session Invalidation & Deduplication Circuit', () => {
  const mockUser: User = {
    id: 'user-circuit-101',
    email: 'admin@transit.edu',
    name: 'Chief Transit Officer',
    role: 'ADMIN',
  };

  // --------------------------------------------------------------------------
  // 1. UNIQUE JTI TOKEN GENERATION
  // --------------------------------------------------------------------------
  it('Circuit 1.1: generateToken creates tokens with unique cryptographic jti identifiers', () => {
    const tokenA = generateToken(mockUser);
    const tokenB = generateToken(mockUser);

    expect(tokenA).toBeDefined();
    expect(tokenB).toBeDefined();
    expect(tokenA).not.toBe(tokenB);

    const payloadA = verifyToken(tokenA);
    const payloadB = verifyToken(tokenB);

    expect(payloadA).not.toBeNull();
    expect(payloadB).not.toBeNull();
    expect(payloadA?.jti).toBeDefined();
    expect(payloadB?.jti).toBeDefined();
    expect(payloadA?.jti).not.toBe(payloadB?.jti);
  });

  // --------------------------------------------------------------------------
  // 2. ACTIVE SESSION VERIFICATION
  // --------------------------------------------------------------------------
  it('Circuit 1.2: verifyToken accepts valid, non-revoked session tokens', () => {
    const token = generateToken(mockUser);
    const verified = verifyToken(token);

    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(mockUser.id);
    expect(verified?.email).toBe(mockUser.email);
    expect(verified?.role).toBe('ADMIN');
    expect(isTokenRevoked(token)).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 3. LOGOUT SESSION INVALIDATION VIA TOKEN REVOCATION
  // --------------------------------------------------------------------------
  it('Circuit 1.3: revokeToken invalidates active session immediately, preventing token reuse', () => {
    const token = generateToken(mockUser);

    // Initial check: active and valid
    expect(isTokenRevoked(token)).toBe(false);
    expect(verifyToken(token)).not.toBeNull();

    // Perform revocation (simulating logout)
    const revoked = revokeToken(token);
    expect(revoked).toBe(true);

    // After revocation: must be marked revoked and verifyToken must return null
    expect(isTokenRevoked(token)).toBe(true);
    expect(verifyToken(token)).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 4. PRESERVES LEGITIMATE CONCURRENT SESSIONS
  // --------------------------------------------------------------------------
  it('Circuit 1.4: Revoking one device session does NOT invalidate other active sessions of the same user', () => {
    const desktopToken = generateToken(mockUser);
    const mobileToken = generateToken(mockUser);

    // Both sessions are initially valid
    expect(verifyToken(desktopToken)).not.toBeNull();
    expect(verifyToken(mobileToken)).not.toBeNull();

    // User logs out of mobile device
    revokeToken(mobileToken);

    // Mobile is revoked, Desktop session remains intact
    expect(verifyToken(mobileToken)).toBeNull();
    expect(isTokenRevoked(mobileToken)).toBe(true);

    expect(verifyToken(desktopToken)).not.toBeNull();
    expect(isTokenRevoked(desktopToken)).toBe(false);
    expect(verifyToken(desktopToken)?.id).toBe(mockUser.id);
  });

  // --------------------------------------------------------------------------
  // 5. IN-FLIGHT PROMISE DEDUPLICATION LOGIC
  // --------------------------------------------------------------------------
  it('Circuit 1.5: Promise deduplication executes underlying network operation only once for concurrent requests', async () => {
    let executionCounter = 0;
    const inFlightRequests = new Map<string, Promise<any>>();

    const deduplicatedOperation = (key: string, payload: string) => {
      if (inFlightRequests.has(key)) {
        return inFlightRequests.get(key)!;
      }

      const promise = (async () => {
        executionCounter += 1;
        // Simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { success: true, payload, counterAtExecution: executionCounter };
      })().finally(() => {
        inFlightRequests.delete(key);
      });

      inFlightRequests.set(key, promise);
      return promise;
    };

    // Dispatch 5 concurrent login operations with the same key
    const [res1, res2, res3, res4, res5] = await Promise.all([
      deduplicatedOperation('auth:login:admin', 'token-123'),
      deduplicatedOperation('auth:login:admin', 'token-123'),
      deduplicatedOperation('auth:login:admin', 'token-123'),
      deduplicatedOperation('auth:login:admin', 'token-123'),
      deduplicatedOperation('auth:login:admin', 'token-123'),
    ]);

    // All callers received the same exact result
    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res3.success).toBe(true);
    expect(res4.success).toBe(true);
    expect(res5.success).toBe(true);

    // Crucial: The underlying network/API call was only executed ONCE!
    expect(executionCounter).toBe(1);
    expect(inFlightRequests.has('auth:login:admin')).toBe(false);

    // Subsequent operation after completion starts a new deduplicated cycle
    const resAfter = await deduplicatedOperation('auth:login:admin', 'token-new');
    expect(executionCounter).toBe(2);
    expect(resAfter.success).toBe(true);
  });
});
