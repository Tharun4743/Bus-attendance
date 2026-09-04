import crypto from 'crypto';

/**
 * Generates a cryptographically secure random 6-digit attendance code (e.g. "583214").
 */
export function generateDynamic6DigitCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Default validity period for dynamic attendance codes in milliseconds (60 seconds).
 */
export const CODE_VALIDITY_MS = 60 * 1000;
