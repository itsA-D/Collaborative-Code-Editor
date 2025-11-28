import 'express';
import { JwtUser } from '../utils/jwt';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtUser;
  }
}
