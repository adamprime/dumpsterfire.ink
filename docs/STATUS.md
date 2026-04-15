# Dumpster Fire — Project Status

**Last updated:** 2026-04-14
**Branch:** `feat/storage-interface-refactor`
**Tests:** 138 passing (15 test files)
**Bundle:** 305 KB gzip main + 82 KB gzip sync chunk (lazy-loaded)
**Type errors:** 0

## Current State

All four phases of the cross-browser + GitSync migration plan (PLAN.md) are code-complete on the feature branch. The branch has NOT been merged to main or deployed.

Manual testing is in progress. Basic OPFS flow, animations, and AI analysis work in Chrome. **GitSync has NOT been fully tested yet** -- the CORS proxy and OPFS fs shim had bugs that were fixed, but the full connect-write-push-pull flow still needs end-to-end verification.

### Commits on this branch (oldest → newest)

**Core phases:**
1. `c7c63b9` — Add cross-browser + GitSync migration plan
2. `7b225a5` — Refine Phase 0 interface design after codebase review
3. `22a786a` — **Phase 0:** Decouple app from FSA behind `EntryStorage` interface
4. `a563c8f` — **Phase 1:** OPFS backend + HHMMSS entry IDs, delete FSA
5. `6ff4f9a` — **Phase 2:** Vercel AI SDK migration + prune encrypted mode
6. `4b751e4` — **Phase 3:** GitSync with isomorphic-git, CORS proxy, full UI

**Post-testing fixes (2026-04-10):**
7. `5c8fcee` — CSP headers + lazy-load isomorphic-git (305 KB main, 82 KB sync chunk)
8. `8a3d51b` — Stats recompute after pull, PAT revocation API, TESTING_GUIDE.md
9. `96c3b78` — Fix CSP: allow `blob:` in `worker-src` for canvas-confetti animations
10. `04950e2` — Fix Zod: remove `maxItems` (unsupported by Anthropic API)
11. `c00efeb` — Fix Zod: remove `min`/`max` on numbers (unsupported by Anthropic API)
12. `7d1635b` — Fix OPFS fs shim: wrap DOMException with Node.js-style string `.code`
13. `b13001e` — Fix CORS proxy: allow GitHub headers + use Basic auth instead of onAuth callback

### What shipped per phase

**Phase 0 — Storage interface refactor**
- `EntryStorage` interface (12 methods) in `src/lib/storage/types.ts`
- `MemoryStorage` for tests, `FsaStorage` wrapping existing FSA code (later deleted)
- Pure utilities extracted to `src/lib/entry-utils.ts`
- All 14 components refactored to use storage interface
- 24 contract tests for MemoryStorage

**Phase 1 — OPFS backend + delete FSA**
- `OpfsStorage` with in-memory entry index, `navigator.storage.persist()`
- New entry ID format: `YYYY-MM-DD-HHMMSSmmm` (replaces UUIDs)
- Welcome.tsx simplified: "Start writing" button (no folder picker)
- App.tsx: auto-reconnect to OPFS if data found
- Deleted: `filesystem.ts`, `entries.ts`, `fsa.ts` (-766 lines)
- `showDirectoryPicker` removed from `vite-env.d.ts`

**Phase 2 — Vercel AI SDK + prune encrypted mode**
- `analysis.ts` rewritten (169→82 lines): `generateText` + `Output.object` + Zod
- Models: Anthropic (Haiku 4.5 / Sonnet 4.6), OpenAI (GPT-4.1 mini/full/nano)
- Deleted: `crypto.ts`, `securityStore.ts`, `PasswordSetup.tsx`, `UnlockScreen.tsx` (-611 lines)
- API keys stored as plain strings (no encrypt/decrypt)
- `security` field removed from `DumpsterFireSettings`
- 5 analysis tests (Zod + MockLanguageModelV3)

**Phase 3 — GitSync**
- `git-proxy/`: Cloudflare Worker CORS proxy (written, not deployed)
- `opfs-git-fs.ts`: 150-line OPFS fs shim for isomorphic-git
- `GitSync` service: clone (depth:50), commit, push, pull, conflict resolution
- `syncStore.ts`: Zustand store for sync state
- `pat-store.ts`: IndexedDB PAT storage with expiration tracking
- `useSyncCommit` hook: batched commits on blur/idle 30s/goal/nav
- UI: `GitSyncSetup` wizard, `SyncStatusIndicator`, Welcome tile, Settings section
- 21 new tests (15 GitSync + 6 PAT store)

## What's Left Before Merge/Deploy

### Must-do
- [x] Deploy `git-proxy/` Worker to `git-proxy.dumpsterfire.ink` (deployed 2026-04-10)
- [x] Smoke test Worker: GitHub API → 200, non-GitHub URL → 403 (verified 2026-04-10)
- [x] Tighten CSP headers: `connect-src` for proxy, GitHub API, Anthropic, OpenAI (2026-04-10)
- [ ] **Manual E2E test: GitSync connect → write → push → clone on fresh browser → verify parity** (next step -- proxy + fs shim bugs fixed, needs re-test)
- [ ] Manual test on iOS Safari (OPFS + Add-to-Home-Screen prompt)
- [ ] Manual test on Firefox (OPFS + `persist()` prompt behavior)
- [ ] Merge feature branch to main, deploy to `burn.dumpsterfire.ink`

### Should-do (before or shortly after merge)
- [x] Write `TESTING_GUIDE.md` with manual test plan for GitSync flows (2026-04-10)
- [x] Confirm GitHub credential revocation API — `POST /credentials/revoke` (unauthenticated, via proxy). Wired into Settings disconnect flow (2026-04-10)
- [x] Implement stats.json recompute-from-entries after every pull via `onPullComplete` callback (2026-04-10)
- [x] Review bundle size — lazy-loaded isomorphic-git: main 305 KB + sync chunk 82 KB (2026-04-10)
- [ ] Benchmark OPFS fs shim with 2000-commit test repo (PLAN.md verification item)
- [ ] Personal data migration: one-time script to move author's FSA entries to OPFS

### Nice-to-have / future
- [x] Code-split isomorphic-git behind dynamic import (done 2026-04-10, saves ~83 KB)
- [ ] "Load full history" button in Settings (currently shallow clone depth:50)
- [ ] WebAuthn PRF (deferred to late 2026 per plan)

## Bugs Found & Fixed During Manual Testing (2026-04-10)

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| No sparks/fire animations | CSP `worker-src 'self'` blocked canvas-confetti's blob Worker | Added `blob:` to `worker-src` |
| AI analysis 400 "maxItems not supported" | Anthropic API rejects `maxItems` in JSON Schema | Removed `.max()` from Zod arrays, moved to `.describe()` |
| AI analysis 400 "minimum/maximum not supported" | Anthropic API rejects `minimum`/`maximum` on numbers | Removed `.min().max()` from Zod number, moved to `.describe()` |
| GitSync init crash: `(err.code \|\| "").includes is not a function` | OPFS DOMException has numeric `.code`, isomorphic-git expects string | Wrapped all fs shim errors with Node.js-style string `.code` |
| GitSync CORS error on revocation API | Proxy `Access-Control-Allow-Headers` missing `X-GitHub-Api-Version` | Added all needed headers to proxy allowlist |
| GitSync clone 401 Unauthorized | `onAuth` callback relies on 401 challenge/retry that breaks through proxy | Switched to upfront `Authorization: Basic` headers |
| Tab switching drops app state (dev only) | Vite HMR reloads modules on blur, resetting non-persisted Zustand state | Not fixed -- dev-only issue, won't affect production build |

## Resume Checklist (Next Session)

1. Start dev server: `npm run dev`
2. **Test GitSync end-to-end** (the #1 priority):
   - Open Settings > GitHub Sync > Set Up GitHub Sync
   - Create a test repo + fine-grained PAT (see TESTING_GUIDE.md section 7)
   - Connect, write an entry, trigger sync (blur window or open calendar)
   - Check GitHub repo for commits
   - If it works: test pull from incognito/second browser
3. If GitSync works: test Firefox + Safari basic OPFS flow
4. Merge to main, deploy

## Key Architecture Decisions

- **Single OPFS root** serves as both app storage (via `OpfsStorage`) and Git working tree (via `opfs-git-fs` shim). No dual stores.
- **Entry IDs are timestamps** (`YYYY-MM-DD-HHMMSSmmm`), not UUIDs. The ID IS the storage key. Eliminates sequential-session collision class for Git.
- **PAT in IndexedDB**, not localStorage. Marginal XSS improvement; real defense is CSP + Milkdown sanitization.
- **Commit batching**: OPFS autosave every 2s, Git commits only on boundary events (blur/idle/nav/goal). Keeps commit count manageable.
- **Conflict resolution**: fast-forward first; device-suffix rename for true divergence. No auto-merge UI.

## Test Inventory (138 tests)

| File | Tests | Area |
|------|-------|------|
| storage.test.ts | 26 | EntryStorage contract (MemoryStorage) |
| WhatRemains.test.tsx | 19 | Analysis panel UI |
| git.test.ts | 15 | GitSync service (mocked isomorphic-git) |
| stats.test.ts | 12 | Streak, activity, totals |
| filesystem.test.ts | 9 | Pure utilities (countWords, formatDate) |
| entries.test.ts | 9 | Entry listing, search, preview |
| calendar.test.ts | 8 | Month generation, date utilities |
| pat-store.test.ts | 6 | Device ID, expiration calculation |
| useWritingStats.test.ts | 6 | Timer, WPM |
| SaveIndicator.test.tsx | 6 | Save state UI |
| analysis.test.ts | 5 | Zod schema + MockLanguageModel |
| SparksAnimation.test.tsx | 5 | Confetti triggers |
| FireAnimation.test.tsx | 5 | 3-wave confetti |
| QuillLoader.test.tsx | 5 | Loading animation |
| themes.test.ts | 2 | Theme definitions |

## Files Changed (vs main)

45 files changed, +3080 / -1644 lines. Net: +1436 lines (includes deleting ~1400 lines of FSA + crypto code and adding ~2900 lines of new storage/sync/UI code).
