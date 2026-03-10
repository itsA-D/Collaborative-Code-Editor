import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  YJS_PORT: parseInt(process.env.YJS_PORT || '1234', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/collab',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
};
