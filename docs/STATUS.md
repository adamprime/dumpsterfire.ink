# Dumpster Fire — Project Status

**Last updated:** 2026-04-08
**Branch:** `feat/storage-interface-refactor`
**Tests:** 138 passing (15 test files)
**Bundle:** 388 KB gzip
**Type errors:** 0

## Current State

All four phases of the cross-browser + GitSync migration plan (PLAN.md) are code-complete on the feature branch. The branch has NOT been merged to main or deployed.

### Commits on this branch (oldest → newest)

1. `c7c63b9` — Add cross-browser + GitSync migration plan
2. `7b225a5` — Refine Phase 0 interface design after codebase review
3. `22a786a` — **Phase 0:** Decouple app from FSA behind `EntryStorage` interface
4. `a563c8f` — **Phase 1:** OPFS backend + HHMMSS entry IDs, delete FSA
5. `6ff4f9a` — **Phase 2:** Vercel AI SDK migration + prune encrypted mode
6. `4b751e4` — **Phase 3:** GitSync with isomorphic-git, CORS proxy, full UI

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
- [ ] Deploy `git-proxy/` Worker to `git-proxy.dumpsterfire.ink` (manual `wrangler deploy`)
- [ ] Smoke test Worker: curl GitHub API through proxy, verify 403 on non-GitHub URLs
- [ ] Monitor Worker for 48h before shipping app bundle (per rollout plan)
- [ ] Manual E2E test: write → push → clone on fresh browser → verify parity
- [ ] Manual test on iOS Safari (OPFS + Add-to-Home-Screen prompt)
- [ ] Manual test on Firefox (OPFS + `persist()` prompt behavior)
- [ ] Tighten CSP headers: `connect-src` for proxy, GitHub API, Anthropic, OpenAI
- [ ] Merge feature branch to main, deploy to `burn.dumpsterfire.ink`

### Should-do (before or shortly after merge)
- [ ] Benchmark OPFS fs shim with 2000-commit test repo (PLAN.md verification item)
- [ ] Confirm GitHub credential revocation API endpoint for fine-grained PATs
- [ ] Write `TESTING_GUIDE.md` with manual test plan for GitSync flows
- [ ] Personal data migration: one-time script to move author's FSA entries to OPFS
- [ ] Review bundle size — 388 KB exceeds the 200 KB budget in PLAN.md (isomorphic-git is ~89 KB). Consider lazy-loading sync module.

### Nice-to-have / future
- [ ] Code-split isomorphic-git behind dynamic import (would save ~89 KB for non-sync users)
- [ ] "Load full history" button in Settings (currently shallow clone depth:50)
- [ ] WebAuthn PRF (deferred to late 2026 per plan)
- [ ] `stats.json` recompute-from-entries after every pull (documented in plan, not yet implemented)

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
