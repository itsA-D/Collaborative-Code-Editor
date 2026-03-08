# LWW (Last Writer Wins) Implementation Audit

This document traces the current collaborative synchronization strategy, which relies on a "Last Writer Wins" (LWW) mechanism. This strategy is the primary cause of concurrent data loss in the editor.

---

## 🔴 Implementation Trace

The LWW logic is split between the client (the producer of changes) and the server (the arbitrator of conflicts).

### 1. Client-Side: The Producer
**File:** [`client/src/pages/Editor.tsx`](file:///a:/shinobi%20no%20shuriken/github%20repo/colaborative%20-%20editor%20_%20EM/client/src/pages/Editor.tsx)  
**Relative Lines:** 137–140

```typescript
// Line 136: comment literally says LWW
// broadcast local changes with timestamp (LWW)
function broadcast(lang: 'html' | 'css' | 'js', code: string) {   // L137
  if (!socket || !snippetId) return;                                // L138
  socket.emit('code-change', { snippetId, language: lang, code, ts: Date.now() }); // L139
}                                                                   // L140
```

**What this does:** Every single keystroke sends the **full document content** coupled with a `ts: Date.now()` wall-clock timestamp. The timestamp comes from the client's local clock, which is untrustworthy and unsynchronized across different users.

**Broadcast Invocation Points:**
- **Line 232:** HTML tab `onChange`
- **Line 241:** CSS tab `onChange`
- **Line 250:** JS tab `onChange`

---

### 2. Server-Side: The Arbitrator
**File:** [`server/src/routes/socket/index.ts`](file:///a:/shinobi%20no%20shuriken/github%20repo/colaborative%20-%20editor%20_%20EM/server/src/routes/socket/index.ts)  
**Relative Lines:** 53–61

```typescript
async function setCode(                                      // L53
  snippetId: string, lang: Lang, code: string, ts: number   // L54
) {
  const k = codeKey(snippetId);                             // L55
  const currentTs = Number(await redis.hget(k, `${lang}UpdatedAt`)) || 0; // L55
  if (ts >= currentTs) {                                    // L56 ← THE LWW GATE
    await redis.hset(k, { [lang]: code, [`${lang}UpdatedAt`]: String(ts) }); // L57
    return true;  // ← accepted                            // L58
  }
  return false;   // ← SILENTLY DROPPED                    // L60
}                                                           // L61
```

**What this does:** The server compares the incoming timestamp (`ts`) from the client with the `UpdatedAt` timestamp stored in Redis. If the incoming change is "older" (even by 1ms), it is **silently discarded**.

**The Trigger Point (Line 129):**
```typescript
socket.on('code-change', async ({ snippetId, language, code, ts }) => {
  const updated = await setCode(snippetId, language, code, ts); // L129
  if (!updated) return; // If the gate (L56) fails, we stop here.
  // ... broadcast to other clients happens only if updated is true
});
```

---

## 🔄 The Full LWW Data Flow

1. **User Input:** User types a character.
2. **Emission:** `Editor.tsx` emits `{ code: fullDocument, ts: Date.now() }`.
3. **Redis Check:** Server reads the last successful timestamp from Redis.
4. **Resolution:**
    - **Accept:** If `incomingTs >= RedisTs`, overwrite the whole document and broadcast.
    - **Drop:** If `incomingTs < RedisTs`, do nothing. **Data Loss Happens Here 🔴**

---

## ⚠️ Why This Is Catastrophic

| Scenario               | Result                                                                                                                         |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **Simultaneous Edits** | Two users type at once. The one with the "later" clock wins. The other's characters simply vanish.                             |
| **Network Jitter**     | An edit that arrives "late" due to network lag triggers the `return false` on L60 and is permanently lost.                     |
| **Clock Skew**         | If User A's system clock is 1 second ahead of User B's, every single edit from User B is dropped until their clock catches up. |
| **Offline/Reconnect**  | A user who was offline reconnects with old timestamps. All their buffered work is rejected by the server as "outdated."        |

---

## ✂️ Cleanup Checklist (Moving to Yjs)

When implementing CRDTs, these specific parts of the codebase must be removed or replaced:

| Location          | Item                    | Fate                                                        |
| :---------------- | :---------------------- | :---------------------------------------------------------- |
| `Editor.tsx`      | `broadcast()` fn (L137) | **Delete.** Replaced by Yjs automatic synchronization.      |
| `Editor.tsx`      | `ts: Date.now()`        | **Delete.** Timestamps are irrelevant for CRDT merges.      |
| `Editor.tsx`      | `onCode` handler (L68)  | **Replace.** Use `ydoc.on('update', ...)` instead.          |
| `socket/index.ts` | `setCode()` (L53)       | **Delete.** Conflict resolution happens in the CRDT engine. |
| `socket/index.ts` | `getOrInitCode()`       | **Replace.** Use Yjs document binary loading.               |
| `socket/index.ts` | `code-change` event     | **Replace.** Switch to `y-websocket` message handling.      |
| Redis Schema      | `UpdatedAt` fields      | **Delete.** No longer needed to track "last" edit.          |
