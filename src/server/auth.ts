import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, Role } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'bus-attendance-secret-key-2026';

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
  assignedBusId?: string;
  studentId?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

// In-memory revocation registry with expiration timestamps (ms)
const revokedTokens = new Map<string, number>();

// Periodic cleanup of expired revoked tokens
setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of revokedTokens.entries()) {
    if (expiresAt <= now) {
      revokedTokens.delete(key);
    }
  }
}, 60 * 60 * 1000).unref?.();

export function revokeToken(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as TokenPayload | null;
    if (!decoded) return false;
    const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
    const key = decoded.jti || token;
    revokedTokens.set(key, expiresAt);
    return true;
  } catch {
    return false;
  }
}

export function isTokenRevoked(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as TokenPayload | null;
    if (!decoded) return true;
    if (decoded.jti && revokedTokens.has(decoded.jti)) return true;
    if (revokedTokens.has(token)) return true;
    return false;
  } catch {
    return true;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return bcrypt.compare(password, hash);
  }
  return password === hash;
}

export function generateToken(user: User): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    assignedBusId: user.assignedBusId,
    studentId: user.studentId,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    if (isTokenRevoked(token)) {
      return null;
    }
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

