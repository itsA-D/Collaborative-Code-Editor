# Changelog - UX Enhancements

## Branch: `feature/collaboration-ux-enhancements`

### Phase 1: Collaboration UX & Presence Polish

This update significantly overhauls real-time collaboration UX, migrating presence states into Yjs awareness to provide a rich, precise, and highly reliable shared workspace environment.

#### 🌟 New Features & Improvements

**1. "Follow Collaborator" Mode**
- Added the ability to actively follow a collaborator’s viewpoint by clicking their name/avatar in the presence bar.
- Automatically syncs your active tab (HTML, CSS, or JS) when the followed user switches their editing context.
- Drives native Monaco `editor.revealPositionInCenter` to match the exact vertical scroll and line location of the targeted user.

**2. Context-Aware User Presence**
- Upgraded the presence bar to display exactly what file/tab each connected user is currently viewing or actively editing.
- Active states are continuously synced and seamlessly manage reconnects/disconnects through Yjs awareness.
- Discarded dual usage of raw `socket.io` for cursor-move and user-typing tracking, standardizing onto the robust WebSocket provider's awareness API.

**3. Native ContentWidget Cursors & Labels**
- Implemented rich Monaco native `editor.addContentWidget` for rendering remote cursors inline.
- Added live, continuous name-badge floating widgets beside remote cursors, completely discarding the default line hover mechanics.
- Bypassed the default `y-monaco` binding cursor rendering in favor of custom, highly-performant DOM wrappers that style cursors with assigned user color hexes (`border-left` caret styles).
- Line highlight blocks are now styled directly via injected `style` tags (`backgroundColor: [color]22`) to perfectly color-match the user's active line while keeping text 100% legible.

**4. Glassmorphic Tooltip Interactivity**
- Created custom `editor.onMouseMove` intersections targeting native editor coordinates.
- Unlocks beautiful, Glassmorphic transparent hover tooltips containing user avatars/initials chips floating directly over the cursor location. 
- Overcame limitations of strict line clipping, preventing background grid/scrollbar overlap bugs.

#### 🔧 Fixes
- Restored code rendering when default `awareness` pointers were disabled during the custom UI migration (Monaco binding now correctly allows fallback initialization without the default presence API).
- Removed manual `setInterval` typing-clearance loops safely managed by native state heartbeat refreshes.

---

### Phase 2: Distributed State Integrity & Sync Hardening

This phase addressed deep-seated race conditions and "ghost document" synchronization issues that were causing intermittent data loss during server restarts and concurrent initializations.

#### 🛡️ Resilience & Integrity Improvements

**1. Unified Yjs Memory Architecture**
- Hardened the server-side document map by unifying it with the `y-websocket` internal core.
- Eliminated "ghost documents" by ensuring the REST API and WebSocket processes talk to the exact same `Y.Doc` memory instance.
- Migrated from manual `new Y.Doc()` instantiations to a robust `getOrLoadDoc` factory pattern.

**2. Asynchronous Initialization Locking**
- Implemented `loadedDocs` and `loadingDocs` promise tracking on the server.
- The system now "locks" access to snippets during their first database load, forcing both REST and WS connections to wait until seeding is 100% complete before accepting updates.
- Ensured atomic seeding by wraping initial database-to-Yjs transfers in `doc.transact()` blocks.

**3. Client-Side Sync Enforcement ("Handshake")**
- Introduced a global `isSynced` state in the Editor tracking the `WebsocketProvider` sync event.
- Blocked all save operations (Manual & Auto) until the client has successfully received the current state from the server, preventing "blank-state overwrites".
- Added a Glassmorphic **"Establishing lossless sync..."** UI overlay that intelligently covers the editor area during initialization to guide user expectation.

**4. Destructive Update Shielding**
- Modified the server-side PUT route to detect "accidental wipes" (requests trying to overwrite non-empty documents with empty content).
- Added logic to automatically fallback to the previous valid database state if a synchronization race is detected during the persistence loop.
