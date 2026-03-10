// Server entry point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { WebSocketServer } from 'ws';
import { Server } from 'socket.io';
import { env } from './config/env';
import { connectMongo } from './db/mongo';
import { redis, pubClient, subClient } from './db/redis';
import { createAdapter } from '@socket.io/redis-adapter';
import authRoutes from './routes/auth';
import snippetRoutes from './routes/snippets';
import { apiLimiter } from './middleware/rateLimit';
import { verifyJwt } from './utils/jwt';
import { initSocket } from './routes/socket';
import { setupWSConnection, getYDoc } from 'y-websocket/bin/utils';
import * as Y from 'yjs';
import { Snippet } from './models/Snippet';

// Global store for Yjs docs - accessible from routes
export const ydocs = new Map<string, Y.Doc>();
export const ydocUpdater = {
  update: (_docName: string, _updates: { html?: string; css?: string; js?: string }) => false
};

async function bootstrap() {
  await connectMongo();
  await redis.ping();

  const app = express();
  app.set('trust proxy', 1); // Required for Render/Vercel proxies
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:", "http:", "https:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
        reportUri: '/api/csp-report',
      },
      reportOnly: true, // Report-only for staged production rollout
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    origin: typeof env.CORS_ORIGIN === 'string' ? env.CORS_ORIGIN.split(',') : env.CORS_ORIGIN,
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
  app.post('/api/csp-report', express.json({ type: ['application/json', 'application/csp-report'] }), (req, res) => {
    console.warn('CSP Violation:', req.body);
    res.status(204).end();
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/snippets', snippetRoutes);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: typeof env.CORS_ORIGIN === 'string' ? env.CORS_ORIGIN.split(',') : env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  io.adapter(createAdapter(pubClient, subClient));
  initSocket(io);

  // Global subscriber for Yjs updates from other nodes
  subClient.psubscribe('yjs-update:*');
  subClient.on('pmessage', (pattern, channel, message) => {
    if (pattern === 'yjs-update:*') {
      const docName = channel.replace('yjs-update:', '');
      const doc = ydocs.get(docName);
      if (doc) {
        const update = Buffer.from(message, 'base64');
        // applyUpdate using 'redis' origin to prevent rebounding
        Y.applyUpdate(doc, update, 'redis');
      }
    }
  });

  // Yjs WebSocket server for CRDT collaboration
  const yjsPort = env.YJS_PORT || 1234;
  const yjsWss = new WebSocketServer({ port: yjsPort });

  const PERSIST_INTERVAL = 30000; // 30 seconds

  // Update exported ydocUpdater when bootstrap runs
  ydocUpdater.update = function (docName: string, updates: { html?: string; css?: string; js?: string }) {
    const doc = ydocs.get(docName);
    if (!doc) return false;

    if (updates.html !== undefined) {
      const yText = doc.getText('html');
      yText.delete(0, yText.length);
      yText.insert(0, updates.html);
    }
    if (updates.css !== undefined) {
      const yText = doc.getText('css');
      yText.delete(0, yText.length);
      yText.insert(0, updates.css);
    }
    if (updates.js !== undefined) {
      const yText = doc.getText('js');
      yText.delete(0, yText.length);
      yText.insert(0, updates.js);
    }

    // Also persist to Redis immediately
    persistDoc(docName);
    return true;
  }

  // Persist Yjs docs to Redis AND MongoDB
  async function persistDoc(docName: string) {
    const doc = ydocs.get(docName);
    if (!doc) return;

    // 1. Save binary state to Redis for fast real-time sync
    const state = Y.encodeStateAsUpdate(doc);
    await redis.set(`yjs:${docName}`, Buffer.from(state));

    // 2. Save clear text to MongoDB so the rest of the app (REST API, Explore) can read it
    if (docName.startsWith('snippet-')) {
      const snippetId = docName.replace('snippet-', '');
      try {
        await Snippet.findByIdAndUpdate(snippetId, {
          html: doc.getText('html').toString(),
          css: doc.getText('css').toString(),
          js: doc.getText('js').toString(),
          lastSavedAt: new Date()
        });
      } catch (err) {
        console.error(`Autosave to MongoDB failed for ${snippetId}:`, err);
      }
    }
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
    if (!docName || docName === 'default') {
      conn.close();
      return;
    }

    try {
      // Basic jwt auth & snippet authorization for WS connection
      const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
      const token = urlParams.get('token');
      if (!token) throw new Error('Unauthorized');

      const user = verifyJwt(token) as any; // Throws if invalid

      if (docName.startsWith('snippet-')) {
        const snippetId = docName.replace('snippet-', '');
        const snip = await Snippet.findById(snippetId);
        if (!snip) throw new Error('Snippet not found');
        if (snip.isPublic === false && snip.owner.toString() !== user.id) {
          throw new Error('Forbidden: Snippet access denied');
        }
      }
    } catch (err) {
      console.error(`Yjs Websocket Auth Failed for ${docName}:`, (err as any).message);
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
          if (docName.startsWith('snippet-')) {
            const snippetId = docName.replace('snippet-', '');
            const snip = await Snippet.findById(snippetId);
            if (snip) {
              doc.getText('html').insert(0, snip.html || '');
              doc.getText('css').insert(0, snip.css || '');
              doc.getText('js').insert(0, snip.js || '');
              console.log(`Seeded Yjs doc ${docName} from MongoDB`);
            }
          }
        }
      } catch (err) {
        console.error(`Failed to load Yjs state for ${docName}:`, err);
      }

      // Broadcast local updates to other nodes
      doc.on('update', (update, origin) => {
        if (origin !== 'redis') {
          pubClient.publish(`yjs-update:${docName}`, Buffer.from(update).toString('base64'));
        }
      });
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
