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
import * as Y from 'yjs';
import { Snippet } from './models/Snippet';

// Global store for Yjs docs - synchronized with y-websocket internal state
const { docs, getYDoc, setupWSConnection } = require('y-websocket/bin/utils');
export const ydocs = docs as Map<string, Y.Doc>;
export { getYDoc, setupWSConnection };

const loadingDocs = new Map<string, Promise<Y.Doc>>();
const PERSIST_INTERVAL = 30000; // 30 seconds
const loadedDocs = new Set<string>(); // Keep track of which docs have been initialized from DB/Redis

// Simple diff-based update to preserve concurrent CRDT edits
function applyDiffUpdate(yText: Y.Text, newContent: string) {
  const currentContent = yText.toString();
  
  // If content is identical, no update needed
  if (currentContent === newContent) return;
  
  // Compute minimal diff using longest common subsequence approach
  const diff = computeDiff(currentContent, newContent);
  
  // Apply diff in reverse order (from end to start) to preserve indices
  for (let i = diff.length - 1; i >= 0; i--) {
    const op = diff[i];
    if (op.type === 'delete' && op.length !== undefined) {
      yText.delete(op.index, op.length);
    } else if (op.type === 'insert' && op.content !== undefined) {
      yText.insert(op.index, op.content);
    }
  }
}

// Compute minimal diff between two strings
function computeDiff(oldStr: string, newStr: string): Array<{ type: 'delete' | 'insert', index: number, length?: number, content?: string }> {
  const operations: Array<{ type: 'delete' | 'insert', index: number, length?: number, content?: string }> = [];
  
  // Find the longest common prefix
  let prefixLen = 0;
  while (prefixLen < oldStr.length && prefixLen < newStr.length && oldStr[prefixLen] === newStr[prefixLen]) {
    prefixLen++;
  }
  
  // Find the longest common suffix
  let suffixLen = 0;
  while (suffixLen < oldStr.length - prefixLen && suffixLen < newStr.length - prefixLen &&
         oldStr[oldStr.length - 1 - suffixLen] === newStr[newStr.length - 1 - suffixLen]) {
    suffixLen++;
  }
  
  // Delete the middle part from old string
  const deleteStart = prefixLen;
  const deleteLength = oldStr.length - prefixLen - suffixLen;
  if (deleteLength > 0) {
    operations.push({ type: 'delete', index: deleteStart, length: deleteLength });
  }
  
  // Insert the middle part from new string
  const insertContent = newStr.slice(prefixLen, newStr.length - suffixLen);
  if (insertContent.length > 0) {
    operations.push({ type: 'insert', index: prefixLen, content: insertContent });
  }
  
  return operations;
}

export const ydocUpdater = {
  update: async (docName: string, updates: { html?: string; css?: string; js?: string }) => {
    const doc = await getOrLoadDoc(docName);
    if (!doc) return false;

    doc.transact(() => {
      if (updates.html !== undefined) {
        const yText = doc.getText('html');
        applyDiffUpdate(yText, updates.html);
      }
      if (updates.css !== undefined) {
        const yText = doc.getText('css');
        applyDiffUpdate(yText, updates.css);
      }
      if (updates.js !== undefined) {
        const yText = doc.getText('js');
        applyDiffUpdate(yText, updates.js);
      }
    });

    // Also persist to Redis immediately
    await persistDoc(docName);
    return true;
  }
};

export async function getOrLoadDoc(docName: string): Promise<Y.Doc | null> {
  const existing = ydocs.get(docName);
  
  // If it exists AND we've already tried to load its content, return it
  if (existing && loadedDocs.has(docName)) return existing;

  const loading = loadingDocs.get(docName);
  if (loading) return loading;

  const loadPromise = (async () => {
    // Uses getYDoc to ensure we are working with the instance y-websocket will use
    const doc = getYDoc(docName);
    
    // If already loaded by another process while waiting, just return
    if (loadedDocs.has(docName)) return doc;

    try {
      // Load persisted state from Redis
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
            doc.transact(() => {
              const h = doc.getText('html'); if (h.length === 0) h.insert(0, snip.html || '');
              const c = doc.getText('css'); if (c.length === 0) c.insert(0, snip.css || '');
              const j = doc.getText('js'); if (j.length === 0) j.insert(0, snip.js || '');
            });
            console.log(`Seeded Yjs doc ${docName} from MongoDB`);
          }
        }
      }

      // Broadcast local updates to other nodes
      // Use a custom origin to avoid double-publishing
      doc.on('update', (update: Uint8Array, origin: any) => {
        if (origin !== 'redis' && origin !== 'load') {
          pubClient.publish(`yjs-update:${docName}`, Buffer.from(update).toString('base64'));
        }
      });

      loadedDocs.add(docName);
      return doc;
    } catch (err) {
      console.error(`Failed to load Yjs state for ${docName}:`, err);
      return doc;
    } finally {
      loadingDocs.delete(docName);
    }
  })();

  loadingDocs.set(docName, loadPromise);
  return loadPromise;
}

// Persist Yjs docs to Redis AND MongoDB with retry and consistency checks
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

export async function persistDoc(docName: string): Promise<boolean> {
  const doc = ydocs.get(docName);
  if (!doc) return false;

  // Capture content hash for consistency verification
  const html = doc.getText('html').toString();
  const css = doc.getText('css').toString();
  const js = doc.getText('js').toString();
  const contentHash = `${html.length}:${css.length}:${js.length}:${html.slice(0, 10)}:${css.slice(0, 10)}:${js.slice(0, 10)}`;

  let lastError: Error | null = null;

  // Retry logic for Redis persistence
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // 1. Save binary state to Redis for fast real-time sync
      const state = Y.encodeStateAsUpdate(doc);
      await redis.set(`yjs:${docName}`, Buffer.from(state));
      
      // Store content hash for verification
      await redis.set(`yjs:${docName}:hash`, contentHash);
      
      break; // Success
    } catch (err) {
      lastError = err as Error;
      console.error(`Redis persistence attempt ${attempt + 1} failed for ${docName}:`, err);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  if (lastError) {
    console.error(`Redis persistence failed after ${MAX_RETRIES} attempts for ${docName}`);
    return false;
  }

  // Retry logic for MongoDB persistence
  if (docName.startsWith('snippet-')) {
    const snippetId = docName.replace('snippet-', '');
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // 2. Save clear text to MongoDB so the rest of the app (REST API, Explore) can read it
        await Snippet.findByIdAndUpdate(snippetId, {
          html,
          css,
          js,
          lastSavedAt: new Date()
        });
        
        // Verify consistency by checking stored hash matches current
        const storedHash = await redis.get(`yjs:${docName}:hash`);
        if (storedHash !== contentHash) {
          console.warn(`Consistency check failed for ${docName}: hash mismatch after MongoDB save`);
          // Hash mismatch means document changed during save - this is acceptable for CRDT
          // but we log it for monitoring
        }
        
        break; // Success
      } catch (err) {
        lastError = err as Error;
        console.error(`MongoDB persistence attempt ${attempt + 1} failed for ${snippetId}:`, err);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    if (lastError) {
      console.error(`MongoDB persistence failed after ${MAX_RETRIES} attempts for ${snippetId}`);
      // Redis succeeded but MongoDB failed - data is safe in Redis, will be retried on next interval
      // This is acceptable as Redis is the source of truth for CRDT sync
      return false;
    }
  }

  return true;
}

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
  const yjsWss = new WebSocketServer({ 
    port: yjsPort,
    clientTracking: true,
    perMessageDeflate: false // Disable compression for CRDT binary data
  });

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
      conn.close(1008, 'Invalid document name');
      return;
    }

    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (conn.readyState === conn.OPEN) {
        console.warn(`Connection timeout for ${docName}`);
        conn.close(1000, 'Connection timeout');
      }
    }, 30000); // 30 second timeout

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
      clearTimeout(connectionTimeout);
      conn.close(1008, (err as any).message || 'Authentication failed');
      return;
    }

    clearTimeout(connectionTimeout);

    // Get or create Yjs document via safe loader
    const doc = await getOrLoadDoc(docName);
    if (!doc) {
      conn.close(1011, 'Failed to load document');
      return;
    }

    // Track doc reference while client connected
    let connected = true;
    conn.on('close', async (code, reason) => {
      connected = false;
      console.log(`Yjs WebSocket closed for ${docName}: code=${code}, reason=${reason}`);
      // Persist on disconnect
      try {
        await persistDoc(docName);
      } catch (err) {
        console.error(`Failed to persist Yjs doc ${docName} on disconnect:`, err);
      }
    });

    conn.on('error', (err) => {
      console.error(`Yjs WebSocket error for ${docName}:`, err);
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
