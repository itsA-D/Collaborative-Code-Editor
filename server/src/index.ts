import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';
import { env } from './config/env';
import { connectMongo } from './db/mongo';
import { redis } from './db/redis';
import authRoutes from './routes/auth';
import snippetRoutes from './routes/snippets';
import { apiLimiter } from './middleware/rateLimit';
import { initSocket } from './socket';

async function bootstrap() {
  await connectMongo();
  await redis.ping();

  const app = express();
  app.use(helmet());
  const allowed = (env.CORS_ORIGIN || '').split(',').map(s=>s.trim()).filter(Boolean);
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));
  app.use(apiLimiter);

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/snippets', snippetRoutes);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: allowed.length ? allowed : true,
      methods: ['GET','POST'],
      credentials: true,
    }
  });
  initSocket(io);

  server.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap', err);
  process.exit(1);
});
