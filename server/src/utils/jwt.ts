import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtUser {
  id: string;
  name: string;
  email: string;
}

export function signJwt(user: JwtUser) {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwt<T = any>(token: string): T {
  return jwt.verify(token, env.JWT_SECRET) as T;
}
