import { Server, Socket } from 'socket.io';
import { verifyJwt, JwtUser } from '../../utils/jwt';
import { redis } from '../../db/redis';
import { Snippet } from '../../models/Snippet';

const COLORS = [
  '#ef4444','#f59e0b','#10b981','#3b82f6','#926fe4ff','#ec4899','#14b8a6','#84cc16'
];

function colorFor(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function usersKey(snippetId: string) { return `snippet:${snippetId}:users`; }
function room(snippetId: string) { return `snippet:${snippetId}`; }

type Lang = 'html'|'css'|'js';

const perSnippetTimers: Map<string, { autosave?: NodeJS.Timeout }> = new Map();
// Track which snippets a socket has joined for disconnect cleanup
const socketSnippets: Map<string, Set<string>> = new Map();
// Throttle typing notifications per user/snippet/language
const typingThrottle = new Map<string, number>();

async function getUsers(snippetId: string) {
  const raw = await redis.hgetall(usersKey(snippetId));
  return Object.values(raw).map((s) => JSON.parse(s));
}

async function addUser(snippetId: string, user: { id: string; name: string; color: string; }) {
  await redis.hset(usersKey(snippetId), { [user.id]: JSON.stringify(user) });
}

async function removeUser(snippetId: string, userId: string) {
  await redis.hdel(usersKey(snippetId), userId);
}

export function initSocket(io: Server) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token || typeof token !== 'string') return next(new Error('Unauthorized'));
      const user = verifyJwt<JwtUser>(token);
      (socket as any).user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtUser;

    socket.on('join-snippet', async ({ snippetId }: { snippetId: string }) => {
      const snip = await Snippet.findById(snippetId);
      if (!snip) return socket.emit('error', { message: 'Snippet not found' });

      const c = colorFor(user.id);
      await addUser(snippetId, { id: user.id, name: user.name, color: c });
      socket.join(room(snippetId));

      const users = await getUsers(snippetId);
      io.to(room(snippetId)).emit('active-users', users);
      socket.to(room(snippetId)).emit('user-joined', { id: user.id, name: user.name, color: c });

      // ensure autosave interval
      if (!perSnippetTimers.has(snippetId)) perSnippetTimers.set(snippetId, {});
      const timers = perSnippetTimers.get(snippetId)!;
      if (!timers.autosave) {
        timers.autosave = setInterval(() => autosave(snippetId), 30000);
      }

      // track membership
      const set = socketSnippets.get(socket.id) || new Set<string>();
      set.add(snippetId);
      socketSnippets.set(socket.id, set);
    });

    // Cursor updates - still useful for non-editor cursors if needed
    socket.on('cursor-move', ({ snippetId, language, position }: { snippetId: string; language: Lang; position: any }) => {
      socket.to(room(snippetId)).emit('cursor-updated', { userId: user.id, name: user.name, color: colorFor(user.id), position, language });
    });

    socket.on('typing', ({ snippetId, language }: { snippetId: string; language: Lang }) => {
      const key = `${user.id}:${snippetId}:${language}`;
      const now = Date.now();
      const last = typingThrottle.get(key) || 0;
      if (now - last < 700) return; // throttle
      typingThrottle.set(key, now);
      socket.to(room(snippetId)).emit('user-typing', { userId: user.id, name: user.name, language, ts: now });
    });

    async function leave(snippetId: string) {
      await removeUser(snippetId, user.id);
      socket.leave(room(snippetId));
      io.to(room(snippetId)).emit('active-users', await getUsers(snippetId));
      socket.to(room(snippetId)).emit('user-left', { id: user.id });
      // if room empty, clear autosave
      const r = io.sockets.adapter.rooms.get(room(snippetId));
      if (!r || r.size === 0) {
        const timers = perSnippetTimers.get(snippetId);
        if (timers?.autosave) clearInterval(timers.autosave);
        perSnippetTimers.delete(snippetId);
      }
      // update membership map
      const set = socketSnippets.get(socket.id);
      if (set) {
        set.delete(snippetId);
        if (set.size === 0) socketSnippets.delete(socket.id);
        else socketSnippets.set(socket.id, set);
      }
    }

    socket.on('leave-snippet', async ({ snippetId }: { snippetId: string }) => {
      await leave(snippetId);
    });

    socket.on('disconnect', async () => {
      const set = socketSnippets.get(socket.id);
      if (set) {
        for (const sid of Array.from(set)) {
          await removeUser(sid, user.id);
          io.to(room(sid)).emit('active-users', await getUsers(sid));
          socket.to(room(sid)).emit('user-left', { id: user.id });
          const r = io.sockets.adapter.rooms.get(room(sid));
          if (!r || r.size === 0) {
            const timers = perSnippetTimers.get(sid);
            if (timers?.autosave) clearInterval(timers.autosave);
            perSnippetTimers.delete(sid);
          }
        }
        socketSnippets.delete(socket.id);
      }
    });
  });
}

// Autosave - reads from Redis via Yjs (not needed anymore as Yjs handles persistence)
// This is kept for compatibility but no longer called
async function autosave(snippetId: string) {
  // Yjs handles persistence separately via the y-websocket server
  // This function is kept for socket.io compatibility but does nothing
  console.log(`Autosave triggered for ${snippetId} - Yjs handles persistence`);
}
