# Architecture Overview

This document describes the current system architecture for the Collaborative Code Editor platform, including components, data flow, APIs, infrastructure, and key design decisions.

Last updated: 2026-08-29

---

## 1. System Overview

The platform is a full-stack web application for collaborative editing of HTML, CSS, and JavaScript snippets with live preview.

Core capabilities:
- Real-time multi-user editing over a Yjs CRDT WebSocket (`y-websocket`)
- User authentication with JWT
- Snippet CRUD, fork, and sharing workflows
- Presence, cursor, and typing indicators
- Periodic autosave of Yjs document state to Redis and MongoDB

Primary goals:
- Low-latency, conflict-free collaborative experience (CRDT)
- Secure and simple auth model
- Reliable persistence with recoverable transient state

---

## 2. High-Level Architecture

```text
Browser (React + Monaco + Yjs)
  -> REST API (Express)
  -> Socket.IO (presence/typing)
  -> Yjs WebSocket server (y-websocket, port 1234)

Express API
  -> MongoDB (users, snippets)

Yjs WebSocket server (CRDT)
  -> Redis (binary Yjs document state:  yjs:{doc})
  -> MongoDB (autosave every 30s and on disconnect)

Redis pub/sub (yjs-update:*)
  -> multi-node Yjs state propagation
```

Logical layers:
- Presentation: React, React Router, Monaco editor, live preview iframe, Yjs client binding
- Application: Express routes, Socket.IO presence handlers, y-websocket connection handlers
- Data: MongoDB for source-of-truth snippet documents, Redis for fast Yjs state cache + pub/sub

---

## 3. Components

### 3.1 Frontend (`client/`)

Tech stack:
- React 18 + TypeScript + Vite
- `@monaco-editor/react` for code editing
- `yjs`, `y-websocket` (`WebsocketProvider`) and `y-monaco` (`MonacoBinding`) for CRDT collaboration
- `socket.io-client` for presence/typing events
- Axios for REST communication

Key modules:
- `client/src/pages/Explore.tsx`: list/create/delete snippets for logged-in owner
- `client/src/pages/Editor.tsx`: creates a `Y.Doc`, instantiates a `WebsocketProvider` to `snippet-{id}`, binds Monaco via `y-monaco`, subscribes to Yjs updates for live preview, and emits presence/typing/cursor over Socket.IO
- `client/src/components/CodeEditor.tsx`: Monaco wrapper using a `MonacoBinding` to bind Yjs `Y.Text` to the editor model (shared cursor decorations + awareness)
- `client/src/components/LivePreview.tsx`: sandboxed iframe rendering with 500ms debounce and CSP nonce
- `client/src/state/AuthContext.tsx`: auth state in localStorage + API login/register
- `client/src/hooks/useSocket.ts`: authenticated Socket.IO lifecycle for presence only

### 3.2 Backend API (`server/`)

Tech stack:
- Node.js + Express + TypeScript
- Mongoose for MongoDB persistence
- Zod for request validation
- JWT (`jsonwebtoken`) + bcryptjs for auth
- Helmet, CORS, Morgan, express-rate-limit
- `yjs` + `y-websocket` + `ws` for the CRDT collaboration WebSocket
- `socket.io` + `@socket.io/redis-adapter` + `ioredis` for presence and multi-node sync

Key modules:
- `server/src/index.ts`: bootstrap, middleware, route mounting, Socket.IO + Redis pub/sub setup, Yjs WebSocket server (port `YJS_PORT`), Yjs doc loader/persister (`getOrLoadDoc`, `persistDoc`)
- `server/src/routes/auth.ts`: register/login
- `server/src/routes/snippets.ts`: CRUD, fork, list/pagination, optimistic-concurrency REST sync via `ydocUpdater`
- `server/src/routes/socket/index.ts`: presence, typing, cursor, join/leave rooms (no code sync — that is handled by Yjs)
- `server/src/models/User.ts`, `server/src/models/Snippet.ts`: persistence schemas
- `server/src/utils/jwt.ts`, `middleware/rateLimit.ts`, `utils/validators.ts`: auth, rate limiting, Zod schemas

### 3.3 Data Stores

MongoDB:
- Persistent source of truth for users and snippets
- Stores canonical snippet metadata and content (html/css/js clear text, updated on autosave)

Redis:
- `yjs:{docName}` — binary Yjs document state (`Y.encodeStateAsUpdate`) for fast realtime sync
- `yjs:{docName}:hash` — content-hash used to verify persistence consistency
- `snippet:{id}:users` — presence map (`userId -> JSON(userPresence)`)
- Pub/sub channel `yjs-update:*` — propagates Yjs updates across server nodes

---

## 4. API Surface

### 4.1 REST Endpoints

Health:
- `GET /`
- `GET /health`

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`

Snippets:
- `POST /api/snippets` (auth required)
- `GET /api/snippets/:id`
- `PUT /api/snippets/:id` (auth + owner required)
- `DELETE /api/snippets/:id` (auth + owner required)
- `POST /api/snippets/:id/fork` (auth required)
- `GET /api/snippets?page=&limit=&owner=`

### 4.2 Socket.IO Events (presence/typing only)

Client -> Server:
- `join-snippet` `{ snippetId }`
- `leave-snippet` `{ snippetId }`
- `cursor-move` `{ snippetId, language, position }`
- `typing` `{ snippetId, language }`

Server -> Client:
- `active-users`
- `user-joined`
- `user-left`
- `user-typing`

> Note: Code content sync does NOT travel over Socket.IO. It is handled by the Yjs WebSocket provider (see 4.3).

### 4.3 Yjs Collaboration WebSocket

- Endpoint: `ws(s)://<host>:<YJS_PORT>/snippet-<snippetId>?token=<jwt>`
- Client connects a `y-websocket` `WebsocketProvider`; server authenticates via `token` and authorizes private snippets by owner.
- Updates flow as binary Yjs updates; server persists state to Redis and MongoDB (see 6.2).

---

## 5. Data Model

### 5.1 User

Fields:
- `name: string`
- `email: string` (unique, indexed)
- `password: string` (bcrypt hash)
- `createdAt: Date`

### 5.2 Snippet

Fields:
- `title: string`
- `owner: ObjectId(User)`
- `html: string`
- `css: string`
- `js: string`
- `isPublic: boolean`
- `views: number`
- `forks: number`
- `lastSavedAt?: Date`
- `createdAt: Date`
- `updatedAt: Date`

### 5.3 Redis Keys

- `yjs:{docName}`
  - value: concatenated binary Yjs state (`Y.encodeStateAsUpdate`) for docName `snippet-{id}`
- `yjs:{docName}:hash`
  - value: content hash string used for persistence consistency verification
- `snippet:{id}:users`
  - hash: `userId -> JSON(userPresence)`

---

## 6. Data Flow

### 6.1 Authentication Flow

1. User registers/logs in via REST.
2. Server validates payload (Zod) and issues JWT.
3. Client stores token in localStorage and sends it in the API header, the Socket.IO auth payload, and the Yjs WebSocket `token` query param.

### 6.2 Realtime Editing Flow

1. Editor page creates a `Y.Doc` and connects a `WebsocketProvider` to `ws://…:1234/snippet-{id}?token=…`.
2. Server authenticates/authorizes, then loads the doc via `getOrLoadDoc`: from Redis (`yjs:{docName}`) if present, else seeds from MongoDB.
3. Server wires the doc's `update` listener to publish binary updates to Redis channel `yjs-update:{docName}` (multi-node propagation) unless the update originated from Redis/local load.
4. On a local edit, Yjs applies the change to the local `Y.Doc`; `y-websocket` pushes the diff to the server, which broadcasts it to room peers; every client merges it into its document.
5. The active editor subscribes to the doc `update` event to refresh live preview.
6. Every 30s (`PERSIST_INTERVAL`) and on each WebSocket disconnect, `persistDoc` saves the binary Yjs state to Redis and the clear text (html/css/js) to MongoDB, with retry (3x) and a hash consistency check.

### 6.3 Presence and Cursor Flow

1. Cursor and typing events are emitted over Socket.IO by the active editor.
2. Server tracks presence in Redis `snippet:{id}:users` and broadcasts to the room excluding sender.
3. Client renders the active-user list, remote cursor decorations (via Yjs awareness through `y-monaco`), and short-lived typing pills.

---

## 7. Security and Reliability

Current controls:
- JWT-protected private REST operations, Socket.IO handshake, and Yjs WebSocket handshake
- Owner checks for snippet update/delete and private-snippet authorization on the Yjs socket
- Zod input validation for auth/snippet payloads
- Helmet security headers (CSP configured in report-only mode)
- API rate limiting
- Sandboxed iframe live preview (`sandbox="allow-scripts"` + CSP nonce in generated doc)
- Optimistic-concurrency guard on REST snippet updates (state-vector + content-hash check returning 409 on conflict)

Known risks and gaps:
- Code receives a valid JWT can join any public snippet by ID over the Yjs WebSocket; private-snippet access is enforced by owner matching
- MongoDB persistence and Redis state could briefly diverge if a MongoDB save fails after Redis succeeded; recovered on the next 30s autosave interval
- Multi-node WebSocket scaling relies on Redis pub/sub for Yjs state propagation; does not use a persistent message store

---

## 8. Infrastructure and Deployment

Local development:
- `docker-compose.yml` starts MongoDB 6 and Redis 7
- Server default ports: `4000` (REST + Socket.IO) and `1234` (`YJS_PORT`, collaboration WebSocket)
- Client default Vite port: `5173`

Runtime topology:
- Frontend and backend deploy independently
- MongoDB/Redis can be managed services
- REST API, Socket.IO, and the Yjs WebSocket run on the same Node process in current design

---

## 9. Key Design Decisions

Decision: Use a Yjs CRDT over a dedicated `y-websocket` server for code collaboration.
Reason: Provides conflict-free, character-level merging under concurrent edits and robust reconnection/offline reconciliation.
Tradeoff: Increases sync/persistence complexity and binary payload sizes vs. a simpler LWW broadcast.

Decision: Keep Socket.IO (plus Redis) for presence, typing, and cursor events only.
Reason: Reuse familiar room semantics for presence without duplicating the code-sync path; keeps the code pipeline on a single CRDT transport.

Decision: Persist Yjs document state to Redis for realtime sync and to MongoDB (clear text) for durability.
Reason: Redis gives fast multi-node sync; MongoDB is the canonical store the REST/Explore layer reads.

Decision: Client-side live preview in sandboxed iframe.
Reason: Avoid server-side code execution risk and reduce backend compute cost.

---

## 10. Future Improvements

- Add role-aware access control for private/shared snippets
- Investigate distributed Yjs provider strategies for massive multi-node deployments
- Move secrets entirely to environment (already removed unsafe fallbacks)
- Add audit logging and structured observability for socket events
- Add e2e tests for collaboration race conditions and autosave behavior
