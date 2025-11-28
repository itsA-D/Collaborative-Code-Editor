import { Request, Response, NextFunction } from 'express';
import { verifyJwt, JwtUser } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: JwtUser;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.substring(7) : undefined;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const payload = verifyJwt<JwtUser>(token);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
