import bcrypt from 'bcryptjs';
import { getAuthConfig } from '../config/auth.js';

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, getAuthConfig().bcryptRounds);
}

export function verifyPassword(plain: string, passwordHash: string): boolean {
  return bcrypt.compareSync(plain, passwordHash);
}
