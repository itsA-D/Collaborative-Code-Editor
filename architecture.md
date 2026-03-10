# Architecture Overview

This document describes the current system architecture for the Collaborative Code Editor platform, including components, data flow, APIs, infrastructure, and key design decisions.

Last updated: 2026-03-07

---

## 1. System Overview

The platform is a full-stack web application for collaborative editing of HTML, CSS, and JavaScript snippets with live preview.

Core capabilities:
- Real-time multi-user editing over WebSockets
- User authentication with JWT
- Snippet CRUD, fork, and sharing workflows
- Presence, cursor, and typing indicators
- Periodic autosave from Redis to MongoDB

Primary goals:
- Low-latency collaborative experience
- Secure and simple auth model
- Reliable persistence with recoverable transient state

---

## 2. High-Level Architecture

```text
Browser (React + Monaco)
  -> REST API (Express)
  -> WebSocket (Socket.IO)

Express API
  -> MongoDB (users, snippets)

Socket.IO collaboration server
  -> Redis (ephemeral collaborative state, presence)
  -> MongoDB (autosave every 30s and on room empty)
```

Logical layers:
- Presentation: React, React Router, Monaco editor, live preview iframe
- Application: Express routes and Socket.IO event handlers
- Data: MongoDB for source-of-truth documents, Redis for fast session/state cache

---

## 3. Components

### 3.1 Frontend (`client/`)

Tech stack:
- React 18 + TypeScript + Vite
- `@monaco-editor/react` for code editing
- `socket.io-client` for realtime collaboration
- Axios for REST communication

Key modules:
- `client/src/pages/Explore.tsx`: list/create/delete snippets for logged-in owner
- `client/src/pages/Editor.tsx`: collaboration screen, tabbed HTML/CSS/JS editors, socket event orchestration
- `client/src/components/CodeEditor.tsx`: Monaco wrapper, local cursor event emission, remote cursor decorations
- `client/src/components/LivePreview.tsx`: sandboxed iframe rendering with debounce
- `client/src/state/AuthContext.tsx`: auth state in localStorage + API login/register
- `client/src/hooks/useSocket.ts`: authenticated socket lifecycle

### 3.2 Backend API (`server/`)

Tech stack:
- Node.js + Express + TypeScript
- Mongoose for MongoDB persistence
- Zod for request validation
- JWT (`jsonwebtoken`) + bcryptjs for auth
- Helmet, CORS, Morgan, express-rate-limit

Key modules:
- `server/src/index.ts`: bootstrap, middleware, route mounting, Socket.IO server startup
- `server/src/routes/auth.ts`: register/login
- `server/src/routes/snippets.ts`: CRUD, fork, list/pagination
- `server/src/routes/socket/index.ts`: join/leave, code sync, presence, typing, cursor movement, autosave timers
- `server/src/models/User.ts`, `server/src/models/Snippet.ts`: persistence schemas

### 3.3 Data Stores

MongoDB:
- Persistent source of truth for users and snippets
- Stores canonical snippet metadata and content

Redis:
- Fast collaborative working state keyed per snippet
- Active user presence map per snippet
- Last-updated timestamps per language for LWW gate

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

### 4.2 Socket.IO Events

Client -> Server:
- `join-snippet` `{ snippetId }`
- `leave-snippet` `{ snippetId }`
- `code-change` `{ snippetId, language, code, ts }`
- `cursor-move` `{ snippetId, language, position }`
- `typing` `{ snippetId, language }`

Server -> Client:
- `code-updated` (full payload on join, language patch on updates)
- `active-users`
- `user-joined`
- `user-left`
- `cursor-updated`
- `user-typing`

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

- `snippet:{id}:code`
  - hash fields: `html`, `css`, `js`, `htmlUpdatedAt`, `cssUpdatedAt`, `jsUpdatedAt`
- `snippet:{id}:users`
  - hash: `userId -> JSON(userPresence)`

---

## 6. Data Flow

### 6.1 Authentication Flow

1. User registers/logs in via REST.
2. Server validates payload and issues JWT (7-day expiry).
3. Client stores token in localStorage and sends it in API header and socket auth payload.

### 6.2 Realtime Editing Flow

1. Editor page emits `join-snippet`.
2. Server verifies snippet, tracks presence, loads Redis state or initializes from MongoDB.
3. Server sends initial `code-updated` with full document.
4. On local edit, client emits `code-change` with timestamp.
5. Server applies LWW check per language, updates Redis, debounces broadcast (200ms).
6. Every 30s and on final room leave, server autosaves Redis content to MongoDB.

### 6.3 Presence and Cursor Flow

1. Cursor and typing events are emitted by active editor.
2. Server broadcasts to room excluding sender.
3. Client renders remote cursor decorations and short-lived typing pills.

---

## 7. Security and Reliability

Current controls:
- JWT-protected private operations and socket handshake
- Owner checks for snippet update/delete
- Zod input validation for auth/snippet payloads
- Helmet security headers
- API rate limiting
- Sandboxed iframe live preview (`sandbox="allow-scripts"` + CSP in generated doc)

Known risks and gaps:
- Socket room-level authorization allows joining by snippet ID if token is valid
- WebSocket cluster scaling relies on sticky sessions for Yjs pub/sub beyond Redis presence maps

---

## 8. Infrastructure and Deployment

Local development:
- `docker-compose.yml` starts MongoDB 6 and Redis 7
- Server default port: `4000`
- Client default Vite port: `5173`

Runtime topology:
- Frontend and backend deploy independently
- MongoDB/Redis can be managed services
- API and Socket.IO run on same Node process in current design

---

## 9. Key Design Decisions

Decision: Use Socket.IO for collaboration instead of polling.
Reason: Required low-latency bidirectional updates and room semantics.

Decision: Keep transient collaboration state in Redis.
Reason: Fast access for active sessions and separation from durable store.

Decision: Persist canonical snippets in MongoDB.
Reason: Flexible document model for snippet content + metadata.

Decision: Use Yjs CRDT for concurrency control.
Reason: Prevents data loss under concurrent edits and provides robust offline reconciliation.
Tradeoff: Increases complexity of state synchronization and payload sizes compared to LWW.

Decision: Client-side live preview in sandboxed iframe.
Reason: Avoid server-side code execution risk and reduce backend compute cost.

---

## 10. Future Improvements

- Add role-aware access control for private/shared snippets
- Investigate distributed Yjs provider strategies for massive multi-node deployments
- Move secrets entirely to environment (already removed unsafe fallbacks)
- Add audit logging and structured observability for socket events
- Add e2e tests for collaboration race conditions and autosave behavior
