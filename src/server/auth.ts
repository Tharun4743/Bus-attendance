import jwt from 'jsonwebtoken';
import { User, Role } from '../types';

const JWT_SECRET = process.env.AUTH_SECRET || 'bus-attendance-secret-key-2026';

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
  assignedBusId?: string;
  studentId?: string;
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
