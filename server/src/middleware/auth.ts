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

/**
 * Attaches req.user when a valid Bearer token is present, but never rejects
 * anonymous requests. Lets public resources stay open while owners are still
 * recognized (e.g. reading a private snippet).
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.substring(7) : undefined;
  if (token) {
    try {
      req.user = verifyJwt<JwtUser>(token);
    } catch {
      /* ignore invalid tokens for optional auth */
    }
  }
  next();
}
