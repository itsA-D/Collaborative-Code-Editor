import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: null,
});

export const pubClient = redis.duplicate();
export const subClient = redis.duplicate();

redis.on('error', (err: Error) => {
  console.error('Redis error:', err);
});
