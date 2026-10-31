/**
 * ============================================================================
 * 📱 MOBILE DEVICE BIOMETRIC ENGINE (WEBAUTHN STANDARD)
 * Native Android Fingerprint (In-Display & Side-Mounted) / iOS TouchID & FaceID
 * Runs 100% on student's smartphone with zero external hardware
 * ============================================================================
 */

import crypto from 'crypto';

export interface BiometricChallenge {
  challenge: string;
  expiresAt: number;
}

export interface BiometricVerificationPayload {
  credentialId: string;
  clientDataJSON?: string;
  authenticatorData?: string;
  signature?: string;
  rawId?: string;
  challenge?: string;
  transports?: string[];
}

export interface RegisteredBiometricCredential {
  studentId: string;
  credentialId: string;
  rawId?: string;
  transports: string[];
  registeredAt: string;
}

/**
 * Standardized WebAuthn Platform Authenticator Configuration
 * Enforces internal hardware sensor (in-display or side-mounted fingerprint scanner)
 * without opening passkey manager or external security key dialogs.
 */
export const PLATFORM_AUTHENTICATOR_CONFIG = {
  authenticatorSelection: {
    authenticatorAttachment: 'platform' as const,
    userVerification: 'required' as const,
    residentKey: 'preferred' as const,
  },
  transports: ['internal'] as const,
};

export class MobileBiometricEngine {
  private activeChallenges = new Map<string, BiometricChallenge>();
  private registeredCredentials = new Map<string, RegisteredBiometricCredential>();

  /**
   * Generates a cryptographically random challenge for navigator.credentials.get() or create()
   */
  public generateChallenge(studentId: string): string {
    const challenge = crypto.randomBytes(32).toString('base64url');
    this.activeChallenges.set(studentId, {
      challenge,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minute validity
    });
    return challenge;
  }

  /**
   * Registers a public key credential for the student's mobile platform authenticator
   * (Android in-display/side-mounted fingerprint or iOS TouchID/FaceID)
   */
  public registerCredential(
    studentId: string,
    credentialId: string,
    rawId?: string,
    transports: string[] = ['internal']
  ): { success: boolean; message: string; credential?: RegisteredBiometricCredential } {
    if (!credentialId || typeof credentialId !== 'string') {
      return { success: false, message: 'Invalid biometric credential ID provided.' };
    }

    const entry: RegisteredBiometricCredential = {
      studentId,
      credentialId,
      rawId,
      transports: transports && transports.length > 0 ? transports : ['internal'],
      registeredAt: new Date().toISOString(),
    };
    this.registeredCredentials.set(studentId, entry);

    return {
      success: true,
      message: 'Mobile biometric credential registered successfully for in-display/side-mounted sensor.',
      credential: entry,
    };
  }

  /**
   * Retrieves registered credential for a student
   */
  public getRegisteredCredential(studentId: string): RegisteredBiometricCredential | null {
    return this.registeredCredentials.get(studentId) || null;
  }

  /**
   * Removes registered credential for a student (e.g. upon unlinking/device reset)
   */
  public removeCredential(studentId: string): boolean {
    return this.registeredCredentials.delete(studentId);
  }

  /**
   * Verifies the cryptographic assertion returned by the phone's biometric sensor.
   */
  public verifyAssertion(
    _studentId: string,
    _payload: { challenge?: string; credentialId?: string; signature?: string; rawId?: string; transports?: string[] }
  ): { verified: boolean; message: string } {
    // In accordance with security directives: incomplete WebAuthn implementations must NOT
    // return fake successful verifications. Safely disabled until public key cryptography
    // attestation validation is implemented.
    return {
      verified: false,
      message: 'Mobile biometric WebAuthn verification is disabled pending server-side cryptographic public-key validation.',
    };
  }
}

export const mobileBiometricEngine = new MobileBiometricEngine();
