# Claude Agent Instructions

This file provides operating instructions for AI coding agents working in this repository.

Last updated: 2026-03-07

---

## 0. File-loading & Priority (new)

**Agent startup / pre-change checklist**

1. Always read `CLAUDE.md` first (this file).
2. Automatically locate and load `architecture.md` **and** `PRD.md` if they exist in the repository root.

   * If not found in the root, search these common locations (in order): `docs/`, `doc/`, `design/`, `architecture/` and load the first matching `architecture*.md` and `PRD*.md` files found.
   * If multiple candidate files exist, prefer the one with the most recent modification timestamp and surface the selection in your summary.
3. Treat these files as authoritative references for design and product requirements respectively:

   * `architecture.md` = authoritative system design, flows, component boundaries, and deployment constraints.
   * `PRD.md` = authoritative product behavior, acceptance criteria, and scope.
4. If you encounter a direct conflict between these documents and `CLAUDE.md`, follow this priority unless instructed otherwise:

   * `PRD.md` (product intent / acceptance criteria)
   * `architecture.md` (system design constraints)
   * `CLAUDE.md` (agent operating rules)
   * Any lower-priority discrepancy **must** be called out to the human reviewer in the change summary.
5. Do **not** modify `architecture.md` or `PRD.md` automatically. Propose edits in your PR summary and only update those files when the human reviewer asks or when the change is part of a documented "documentation update" PR.

> Why: making the agent explicitly load these docs avoids assumptions and ensures design + product constraints are respected for both small and high-impact changes.

---

## 1️⃣ Project Context

This repository contains a full-stack collaborative code editor.

Stack summary:

* Frontend: React 18, TypeScript, Vite, Monaco Editor, Socket.IO client
* Backend: Node.js, Express, TypeScript, Socket.IO server
* Data: MongoDB (persistent), Redis (realtime/session state)
* Auth/Security: JWT, bcrypt, Zod validation, Helmet, rate limiting

Primary domain objects:

* `User`
* `Snippet`

Collaboration model:

* Socket room per snippet
* per-language (`html`, `css`, `js`) code updates
* presence, cursor, and typing indicators
* autosave from Redis to MongoDB

---

## 2️⃣ Repository Layout

* `client/` frontend application
* `server/` backend API + socket server
* `docker-compose.yml` local MongoDB + Redis
* `postman_collection.json` API reference/test collection
* `README.md` human project documentation
* `architecture.md` system design documentation (automatically loaded)
* `PRD.md` product requirements (automatically loaded)

Key backend files:

* `server/src/index.ts`
* `server/src/routes/auth.ts`
* `server/src/routes/snippets.ts`
* `server/src/routes/socket/index.ts`

Key frontend files:

* `client/src/pages/Explore.tsx`
* `client/src/pages/Editor.tsx`
* `client/src/components/CodeEditor.tsx`
* `client/src/components/LivePreview.tsx`

---

## 3️⃣ Agent Objectives

When implementing or modifying code:

* Preserve existing behavior unless change request explicitly requires behavior change.
* Keep edits minimal, local, and reversible.
* Prioritize correctness and data safety for realtime collaboration code.
* Keep frontend and backend contracts aligned (event names, payload shapes, endpoint responses).

When writing docs:

* Keep docs concise but accurate.
* Prefer codebase facts over assumptions.
* **Consult `architecture.md` for system-level decisions and `PRD.md` for product acceptance criteria**.
* Update `architecture.md` and `PRD.md` only when the change is a documented documentation update and included in the PR; otherwise propose changes in the PR description.

---

## 4️⃣ Coding Standards

General:

* Use TypeScript consistently.
* Favor clear, explicit naming over short abbreviations.
* Avoid broad refactors unless requested.
* Keep functions focused and small where practical.

Backend:

* Validate inbound REST payloads with Zod.
* Keep auth and owner checks explicit on protected snippet operations.
* For socket changes, define and document event payload contracts.
* Avoid blocking operations in socket event handlers.

Frontend:

* Keep React state minimal and derived state computed with memoization where useful.
* Keep editor interactions responsive; avoid expensive re-renders.
* Preserve keyboard save shortcut and existing UX affordances unless requested.

---

## 5️⃣ Workflow Rules

Before coding:

1. Read affected files end-to-end.
2. Identify API/event contracts involved.
3. Check for side effects across client and server.
4. **Read the relevant sections of `architecture.md` and `PRD.md` and cite the lines/sections that influenced your design choices in the PR summary.**

During coding:

1. Edit only required files.
2. Keep naming and file conventions consistent.
3. Add short comments only for non-obvious logic.

After coding:

1. Run or describe relevant validation (build/tests/lint if available).
2. Summarize changed files and behavioral impact.
3. Call out risks, assumptions, and follow-up actions. Explicitly call out any divergence from `architecture.md` or `PRD.md` and why.

---

## 6️⃣ Tool Usage Guidance

Use this order of preference:

* Fast code search: `rg` for file and text lookup.
* Read files before editing.
* Use focused patch-style edits for single-file changes.
* Verify behavior by checking related frontend and backend call sites.

When changing collaboration protocol:

* Update both emitter and listener sides.
* Confirm room join/leave cleanup paths.
* Confirm persistence behavior (Redis and MongoDB interplay).

When changing API schemas:

* Update validators, route handlers, and impacted frontend calls.
* Ensure error handling remains structured and predictable.

---

## 7️⃣ Safety and Security Rules

Must not:

* expose secrets in code, docs, logs, or examples
* commit credentials or environment values that resemble production secrets
* weaken auth checks for convenience
* disable security middleware without explicit request

Must do:

* preserve or improve input validation
* preserve protected route authorization checks
* preserve sandboxing boundaries for live preview

---

## 8️⃣ Testing and Validation Expectations

Minimum validation after non-trivial changes:

* Backend TypeScript build: `npm run build` in `server/`
* Frontend TypeScript + build: `npm run build` in `client/`
* Manual smoke for auth, snippet CRUD, and editor realtime flow

Manual realtime smoke checklist:

1. Log in with two browser sessions.
2. Open same snippet in both.
3. Edit HTML/CSS/JS and verify remote update propagation.
4. Verify presence list, cursor update, typing indicator.
5. Save, refresh, and verify persistence.

---

## 9️⃣ High-Risk Areas

Treat the following files and flows as high impact:

* `server/src/routes/socket/index.ts` (realtime correctness + autosave)
* `client/src/pages/Editor.tsx` (event wiring + local draft behavior)
* auth middleware and JWT utility
* snippet ownership checks in update/delete routes

Any changes here should include explicit impact notes and cross-reference `architecture.md` sections that describe the flow.

---

## 🔁 10️⃣ Common Tasks Playbook

Add REST endpoint:

1. Define/extend Zod schema.
2. Implement route with auth/ownership checks.
3. Update frontend API calls.
4. Document endpoint in README or architecture doc if major.

Add socket event:

1. Define payload shape in both client and server.
2. Register server listener and outbound broadcast.
3. Add client listener cleanup in `useEffect` return.
4. Validate multi-user behavior manually.

Add snippet field:

1. Extend Mongoose schema.
2. Update create/update validators and handlers.
3. Update frontend models/usages.
4. Review serialization impact.

---

## 11️⃣ Documentation Maintenance Rule

For major feature changes, update in same PR:

* `PRD.md` for product behavior and scope
* `architecture.md` for system flow and design decisions
* `README.md` for developer setup or usage changes

**When to update `architecture.md` and `PRD.md`:**

* Update `PRD.md` when the product acceptance criteria or scope changes.
* Update `architecture.md` when component boundaries, data flow, deployment, or scaling approach changes.
* If a change requires edits to either, include a short changelog entry in the respective doc and a clear rationale in the PR.

---

## 12️⃣ Change Summary Requirements (new)

Every PR must include a short "Agent-sourced summary" that contains:

* Files changed and reasons.
* Which sections / lines of `architecture.md` and `PRD.md` influenced the change (copy the relevant headings or bullet lines).
* Any deviations from the documents and the justification.
* Manual validation steps performed and their results.

---

*End of file.*
