# Changelog

All notable changes, recent upgrades, and implementation details for this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]
### Added
- Integrated **Yjs** (`yjs`) natively to provide Conflict-free Replicated Data Type (CRDT) support.
- Added **y-websocket** server-side (`ws`) and client-side to handle binary state updates over WebSockets.
- Integrated **y-monaco** client-side to directly bind collaborative `Y.Text` states with the Monaco Editor.
- Authored extensive architectural analysis artifacts (`CRDT.MD`, `LWW.MD`) to track the previous architecture failures and the new implementations.

### Changed
- Refactored `CodeEditor.tsx` to accept a `Y.Text` binding instead of uncontrolled text props, migrating away from standard React state.
- Refactored `Editor.tsx` to instantiate `Y.Doc` and `WebsocketProvider` per snippet instead of broadcasting the entire codebase on keystrokes.
- Updated `server/src/index.ts` to spawn an underlying `y-websocket` server that tracks active `Y.Doc` references in memory.
- Overhauled real-time storage mechanism: Instead of comparing and saving plain text with `UpdatedAt` timestamps, the server now stores encoded binary Yjs state objects in Redis.

### Fixed
- Fixed critical, silent data loss during concurrent edits by replacing the "Last-Writer-Wins" (LWW) architecture with mathematically lossless CRDT merges.
- Fixed a server startup crash during deployment caused by an export resolution issue with `y-websocket/bin/utils` — mitigated by downgrading `y-websocket` to `^1.5.0` and installing `yjs` directly.
- Fixed a severe bug where documents failed to persist to MongoDB: autosaving in `persistDoc` now decodes the Yjs binary state back to plain text and successfully invokes `Snippet.findByIdAndUpdate`.
- Fixed a silent failure during document seeding: stripped out the string prefix (`snippet-`) inside `index.ts` to stop invalid object ID errors when searching MongoDB.

### Implementation Details & Notes
- **LWW vs CRDT Migration Context**: Our initial sync strategy broadcast the entire codebase on each keystroke and validated timestamps (`Date.now()`). This resulted in immediate race conditions, jitter failure, and concurrent edit losses. `Yjs` handles the synchronization vector internally, completely resolving ordering and concurrency issues.
- **Persistence Pipeline Flow**: Over WebSockets -> `y-websocket` applies delta chunks to an in-memory `Y.Doc` -> every 30 seconds we `Y.encodeStateAsUpdate` and drop the raw blob into Redis for hot connections -> simultaneously decode `doc.getText('html|css|js')` and save it to MongoDB for the initial REST application load (`/explore` lists, app boot).

---

## [Initial Setup] - 2024-03-08
### Added
- Initial creation of the changelog to track updates and implementations.
