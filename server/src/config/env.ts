import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb+srv://ankandebnath12b_db_user:09OS2yzL8Xco6a5U@cluster0.vyxzq7w.mongodb.net/?appName=Cluster0',
  JWT_SECRET: process.env.JWT_SECRET || 'changeme-supersecret',
  REDIS_URL: process.env.REDIS_URL || 'redis://default:FJTZTJi6R0m5LNGZ1HKG3Y9zwCwCT7ZS@redis-18989.c270.us-east-1-3.ec2.cloud.redislabs.com:18989',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'collaborative-code-editor-rm4sv2fdd-kenjis-projects-5a9ca317.vercel.app',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
};

