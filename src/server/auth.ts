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
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}
