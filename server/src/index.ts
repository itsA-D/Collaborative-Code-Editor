import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { WebSocketServer } from 'ws';
import { Server } from 'socket.io';
import { env } from './config/env';
import { connectMongo } from './db/mongo';
import { redis } from './db/redis';
import authRoutes from './routes/auth';
import snippetRoutes from './routes/snippets';
import { apiLimiter } from './middleware/rateLimit';
import { initSocket } from './routes/socket';
import { setupWSConnection, getYDoc } from 'y-websocket/bin/utils';
import * as Y from 'yjs';
import { Snippet } from './models/Snippet';

async function bootstrap() {
  await connectMongo();
  await redis.ping();

  const app = express();
  app.set('trust proxy', 1); // Required for Render/Vercel proxies
  app.use(helmet());
  app.use(cors({
    origin: true, // Allow all origins strictly for debugging
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));
  app.use(apiLimiter);

  app.get('/', (_req, res) => {
    res.json({
      message: 'Collaborative Code Editor API is running',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        snippets: '/api/snippets'
      }
    });
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/snippets', snippetRoutes);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });
  initSocket(io);

  // Yjs WebSocket server for CRDT collaboration
  const yjsPort = env.YJS_PORT || 1234;
  const yjsWss = new WebSocketServer({ port: yjsPort });

  // Track active Yjs documents for persistence
  const ydocs = new Map<string, Y.Doc>();
  const PERSIST_INTERVAL = 30000; // 30 seconds

  // Persist Yjs docs to Redis
  async function persistDoc(docName: string) {
    const doc = ydocs.get(docName);
    if (!doc) return;
    const state = Y.encodeStateAsUpdate(doc);
    await redis.set(`yjs:${docName}`, Buffer.from(state));
  }

  // Autosave all active docs periodically
  setInterval(async () => {
    for (const docName of ydocs.keys()) {
      try {
        await persistDoc(docName);
      } catch (err) {
        console.error(`Failed to persist Yjs doc ${docName}:`, err);
      }
    }
  }, PERSIST_INTERVAL);

  yjsWss.on('connection', async (conn, req) => {
    const url = req.url || '';
    const docName = url.split('/').pop()?.split('?')[0] || 'default';
    if (!docName) {
      conn.close();
      return;
    }

    // Get or create Yjs document
    let doc = ydocs.get(docName);
    if (!doc) {
      doc = new Y.Doc();
      ydocs.set(docName, doc);

      // Load persisted state from Redis
      try {
        const saved = await redis.getBuffer(`yjs:${docName}`);
        if (saved && saved.length > 0) {
          Y.applyUpdate(doc, saved);
          console.log(`Loaded Yjs state for ${docName} from Redis`);
        } else {
          // Seed from MongoDB if no Redis state
          const snip = await Snippet.findById(docName);
          if (snip) {
            doc.getText('html').insert(0, snip.html || '');
            doc.getText('css').insert(0, snip.css || '');
            doc.getText('js').insert(0, snip.js || '');
            console.log(`Seeded Yjs doc ${docName} from MongoDB`);
          }
        }
      } catch (err) {
        console.error(`Failed to load Yjs state for ${docName}:`, err);
      }
    }

    // Track doc reference while client connected
    let connected = true;
    conn.on('close', async () => {
      connected = false;
      // Persist on disconnect
      try {
        await persistDoc(docName);
      } catch (err) {
        console.error(`Failed to persist Yjs doc ${docName} on disconnect:`, err);
      }
    });

    // Use y-websocket's setupWSConnection
    setupWSConnection(conn, req, { docName, doc });
  });

  yjsWss.on('listening', () => {
    console.log(`Yjs WebSocket server listening on port ${yjsPort}`);
  });

  server.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap', err);
  process.exit(1);
});
