# Dumpster Fire: Cross-Browser + GitSync Migration Plan

_Planning doc — April 2026. Supersedes the current FSA-only architecture._
_Deepened: 2026-04-08 (added Key Technical Decisions, System-Wide Impact, expanded Phase 3 and Risks after targeted research)._

## Goals

1. Run everywhere: Chrome, Safari (desktop + iOS), Firefox, Edge, Android. Pure PWA, no native wrapper.
2. Preserve "zero-knowledge against the app author" — no user writing ever touches our infrastructure.
3. Give advanced users their markdown files forever, via sync to a private GitHub repo they own.
4. Modernize the AI provider layer via Vercel AI SDK.
5. Prune unused complexity (encrypted mode, FSA codepath).

## Non-goals

- First-class mobile writing UX. Target is "writable on mobile, great on desktop." Serious writing = keyboard = iPad/laptop/desktop.
- Real-time multi-device sync. Eventual consistency via Git push/pull is fine.
- Multi-user or collaborative features.
- Self-hosted Gitea / non-GitHub backends in v1 (the sync layer is abstract enough to add later).

## Architecture after this plan

```
┌─────────────── Browser PWA ───────────────┐
│                                           │
│  Editor ── Zustand ── EntryStorage iface  │
│                           │               │
│                           ▼               │
│                     OpfsStorage           │  ← cross-browser local cache
│                           │               │
│                           ▼               │
│                  [optional] GitSync       │  ← isomorphic-git on top of OPFS
│                                           │
│  AnalysisService ── Vercel AI SDK ──────> direct to Claude/OpenAI (BYOK)
│                                           │
└───────────────┬───────────────────────────┘
                │ (GitSync enabled only)
                ▼
      Cloudflare Worker: git-proxy.dumpsterfire.ink
                │
                ▼
       user's own private GitHub repo
```

**Principles:**
- OPFS is the single source of truth while the app is running.
- When GitSync is on, the user's GitHub repo is the source of truth across devices — connecting a new device rebuilds everything from the repo.
- Plaintext markdown in the repo. No client-side encryption of repo contents.
- Stats (`stats.json`) is synced alongside entries so a new device rebuilds state in one clone.

## Key Technical Decisions

These are the major forks. Each captures rationale and rejected alternatives so the reasoning survives future re-reads.

### KTD-1: OPFS with plain markdown files (not SQLite-WASM, not IndexedDB)

**Decision:** Primary local storage is OPFS with one `.md` + `.meta.json` per entry, mirroring the current directory layout.

**Rationale:**
- OPFS ships across Chrome, Edge, Firefox, Safari (desktop + iOS 15.2+) and gets ~20% of device disk quota on iOS 17+ (tens of GB in practice). No backend. No cross-browser workarounds.
- SQLite-WASM would add ~1 MB to the bundle for zero benefit at this scale. A single user writing daily for 20 years produces ~40 MB of markdown. Directory walks cached in memory on app load handle entry enumeration trivially.
- IndexedDB was rejected because plain files give Phase 3 GitSync a more natural working-tree representation and because OPFS semantics (exclusive file handles, atomic rename via `move()`) better match our write patterns.
- SQLite remains a cleanly-addable *derived index* later if we ever want full-text search. Markdown files stay the source of truth; we don't have to migrate storage to add it.

**Rejected:** SQLite-WASM now, IndexedDB-only, localStorage.

### KTD-2: OPFS-only (no FSA fallback, no migration path)

**Decision:** Kill the File System Access API codepath entirely. OPFS is the single local backend.

**Rationale:**
- Zero real users today (traffic stats confirmed during planning). No migration cost.
- Two storage backends doubles test surface area and makes every Phase-3 decision ambiguous (where does the Git working tree live?).
- "I want to see my files on disk" users are served better by Phase 3 GitSync — they get timestamped commits with version history instead of a raw folder.

**Rejected:** Dual-backend (OPFS + FSA), FSA as opt-in power-user mode.

### KTD-3: Plaintext markdown in the Git repo (encrypted mode deleted)

**Decision:** When GitSync is enabled, commit plaintext `.md` files. Delete the app's "encrypted" security mode, `lib/crypto.ts`, and the password/unlock UI.

**Rationale:**
- The user's own private GitHub repo is already their infrastructure, not ours. "Zero-knowledge against the app author" is preserved by design.
- Plaintext gives the user real value: grep, Obsidian/VS Code compatibility, GitHub web UI readable, portable to any Git client.
- The existing encrypted mode was "security theater to prove I could build it" (per the author). Maintaining two storage-encryption codepaths across OPFS, GitSync, and the editor is non-trivial.
- Users who want content encrypted from GitHub can still encrypt their repo at the transport/rest layer through GitHub (private repo ACLs, Secret Scanning, etc.) or switch to a self-hosted Gitea.

**Rejected:** Ciphertext-in-repo with client-side encryption; dual-mode (plaintext OR encrypted per-user).

### KTD-4: Entry ID schema is `YYYY-MM-DD-HHMMSS` (breaking change from `session` integer)

**Decision:** Replace the `(date, session)` tuple with a single timestamp-based string ID.

**Rationale:**
- Eliminates the sequential-session collision class in multi-device Git sync: two devices can't race to claim "today, session 2."
- Total ordering is natural and filename-sortable.
- Breaking change is free (no users to migrate; author will rebuild their own history manually if desired).

**Rejected:** UUID filenames (uglier, no sort), keeping session numbers with auto-rename on conflict (added complexity).

### KTD-5: Vercel AI SDK with `generateObject` + Zod (not hand-rolled)

**Decision:** Adopt `ai` + `@ai-sdk/anthropic` (≥ 2.0.49) + `@ai-sdk/openai`. Use `generateObject` with a Zod schema for the "What Remains" analysis.

**Rationale:**
- Unified provider abstraction across Anthropic/OpenAI/Gemini/Ollama via a single call shape.
- `generateObject` with Zod eliminates the current manual JSON fence-stripping and lossy defaulting in `parseAnalysisResponse`. Schema validation at the SDK layer turns malformed LLM output into a catchable error instead of silently-wrong data.
- The `dangerouslyAllowBrowser` + `anthropic-dangerous-direct-browser-access: true` header pattern is officially supported for BYOK client-side use (vercel/ai#3041, anthropic-ai/sdk#248).
- `@ai-sdk/anthropic` ≥ 2.0.49 retains user-supplied betas/headers (earlier versions silently overwrote them, see vercel/ai#4792). **Minimum version: 2.0.49. Pin in package.json with `^2.0.49`.**
- Streaming via `streamText` returns an async iterable — integrates into Zustand without needing `@ai-sdk/react`.

**Rejected:** Hand-rolled multi-provider abstraction (saves bundle size but forfeits `generateObject`, Zod validation, streaming ergonomics); LangChain.js (too heavy, server-oriented); LlamaIndex.ts (RAG-focused, wrong tool).

### KTD-6: isomorphic-git with a custom minimal OPFS fs shim (not lightning-fs, not `@componentor/fs`)

**Decision:** Write a small custom filesystem adapter (~150 lines) implementing the isomorphic-git fs interface directly on top of OPFS. The Git working tree lives in the same OPFS directory that `OpfsStorage` writes to.

**Rationale:**
- `lightning-fs` (the canonical isomorphic-git fs) is backed by IndexedDB, not OPFS. Using it would force a dual-store design where every entry save writes to OPFS *and* to a duplicate tree in IDB, with a sync step before every commit. That duplicates storage, doubles failure modes, and complicates recovery.
- `@componentor/fs` is a third-party OPFS adapter advertised for isomorphic-git, but it's less mature, thinly documented, and adopting it adds a supply-chain risk for the project's most critical data path.
- The isomorphic-git `fs` interface is small: `readFile`, `writeFile`, `unlink`, `readdir`, `mkdir`, `rmdir`, `stat`, `lstat`, `readlink`, `symlink`. We can skip `readlink`/`symlink` (Git content files are fine without symlink support for our use case — we don't track any).
- Custom shim is ~150 lines, tested against the shared storage test suite, fully under our control.
- **Critical consequence:** the OPFS directory tree IS the Git working tree. No dual-store. Single source of truth preserved.

**Rejected:** lightning-fs + dual-store (too much duplication and failure surface); `@componentor/fs` (third-party immaturity risk on the most critical data path).

### KTD-7: Fine-grained GitHub PAT, user-created, stored in IndexedDB with expiration UX

**Decision:** GitSync uses a user-supplied fine-grained GitHub PAT scoped to a single private repo. The PAT lives in IndexedDB (not localStorage). Expiration date is captured at setup time and a proactive "your token expires in 7 days" banner nudges re-entry. The user creates both the repo and the PAT; we do not integrate with GitHub's OAuth app or REST repo-creation flow in v1.

**Rationale:**
- **No backend** rules out OAuth app flow (would need a server-side client secret).
- **Fine-grained PATs** limit blast radius to a single repo with Contents=Read/Write and Metadata=Read. Classic PATs or OAuth app scopes are broader and therefore worse.
- **IndexedDB over localStorage**: marginally harder to exfiltrate via trivial XSS (requires Promise-based access), and doesn't leak in devtools' "Application → Local Storage" quick-glance view. It is **not** a meaningful defense against a real XSS vulnerability — we mitigate XSS via CSP headers and Milkdown's sanitized rendering, not via storage choice.
- **Expiration UX is load-bearing**: GitHub fine-grained PATs max at 1 year; most users will set 90 days. We detect expiry proactively so users aren't stranded mid-write.
- **GitHub's credential revocation API** (extended 2026-03-26) gives users a programmatic recovery path if they think the PAT leaked. We document this in the disconnect/revoke UI.
- **User creates the repo** in v1 because doing it for them requires broader PAT scope at creation time (administrative scope on the user's account). Path (b) — we create the repo — is a v2 enhancement behind an opt-in "Let us set it up" flow.

**Rejected:** OAuth app flow (requires backend); localStorage (marginally worse); app-creates-repo in v1 (broader scope requirement).

### KTD-8: Commit batching — commit on blur/idle, not per-save

**Decision:** GitSync commits happen on editor blur, on view-change, on idle (>30s without typing), or on explicit "Save" — NOT on every 2s autosave tick. Autosave still writes to OPFS immediately; Git commit is a separate debounced layer.

**Rationale:**
- The current editor autosaves every 2s. If every autosave becomes a Git commit, a 30-minute session produces ~900 commits — noise in the repo, perf hit on push, and hostile to `git log` review.
- Blur/idle/navigation is a natural checkpoint for the writer. "Session boundary" = "commit boundary" reads cleanly in git history.
- Push is further debounced (5s idle after last commit) so a burst of commits batches into one network roundtrip.
- If a writer hits their goal and triggers "What Remains," that's also a commit boundary.

**Rejected:** Commit-per-autosave (noisy); squash-on-push (loses within-session granularity); manual-commit-only (users would forget).

## High-Level Technical Design

Non-prescriptive sketch of the data flow with GitSync enabled.

```
[User types]
    │
    ▼
[Editor autosave (2s debounce)]
    │
    ▼
[OpfsStorage.saveEntry] ──────► OPFS: entries/YYYY/MM/YYYY-MM-DD-HHMMSS.md
    │                                         (+ .meta.json)
    │
    ▼
[Commit trigger? blur / idle>30s / goal reached / nav]
    │  no ──► done
    │
    yes
    ▼
[GitSync.commit("entry: 2026-04-08T14:32:11")]
    │
    ▼ (writes to same OPFS tree via custom fs shim)
[isomorphic-git: add + commit]
    │
    ▼
[Push debounce (5s idle)]
    │
    ▼
[isomorphic-git.push via git-proxy.dumpsterfire.ink] ──► GitHub (user's repo)
    │
    ├── success: UI "Synced ✓"
    └── failure: queue + exponential backoff, UI "Offline — will push when connected"


On new-device hydration:
[User pastes repo URL + PAT]
    │
    ▼
[GitSync.clone → OPFS via custom fs shim]
    │
    ▼
[OpfsStorage reads tree as if it had written it locally]
    │
    ▼
[Stats rebuilt from entries, cached to stats.json]
```

Key invariants:
- **OPFS tree = Git working tree.** Single source of truth.
- **Stats are derived.** `stats.json` in the repo is a cache; correctness recovery = delete and recompute from entries.
- **Autosave always wins locally.** Network or Git errors never block writing.
- **Commit messages carry entry IDs** for future reference / search / rollback.

## System-Wide Impact

Cross-cutting effects beyond the direct file-level changes.

### Editor behavior
- **Autosave + commit debounce interaction:** autosave stays at 2s (local OPFS write). Git commit layer sits above autosave and triggers on higher-level boundaries (blur, idle>30s, goal, nav). Two debounces, different concerns.
- **Blur detection** becomes a first-class event the editor must emit reliably. Milkdown's blur events + a window `visibilitychange` handler.
- **Save status indicator** gains a second state: "Saved locally" vs "Synced to GitHub." Current `SaveIndicator.tsx` needs a new dimension.
- **Offline writing feels identical to online writing** — crucial for the local-first promise. Never block a keystroke on network.

### State management
- `appStore` swaps `folderHandle` for `storage: EntryStorage`. Single change, 13-file blast radius.
- New `syncStore` (Zustand) tracks: GitSync enabled?, connection state (idle/syncing/offline/error), last push timestamp, pending commit count, PAT expiration date.
- `securityStore` is deleted entirely (Phase 2).

### Entry browser / Dashboard / Calendar
- Filename schema change (`YYYY-MM-DD-HHMMSS` → single string ID) ripples through every component that formats or matches entry metadata. Search-and-replace is deceptively simple; the risk is anywhere that splits on `-` assuming date format.
- The in-memory entry index built on app load needs invalidation hooks on `saveEntry` / `deleteEntry` / `GitSync.pull`.

### Stats & streak
- `stats.json` is synced via GitSync. On pull, if the remote stats are newer, overwrite locally AND recompute-from-entries to verify. Mismatch → trust recomputation, log warning.
- Streak calculation must handle the case where a remote pull reveals entries written on a different device today. Current streak logic probably assumes "today" = "local today."

### PWA / service worker
- Service worker must NOT cache GitHub API responses (correctness issue).
- Service worker must NOT intercept requests to `git-proxy.dumpsterfire.ink` (would break the proxy).
- On install/update, invalidate any stale entry index.

### Settings
- Settings UI gets a new "GitHub Sync" section: connection status, repo URL, PAT entry/rotation, last sync time, token expiration warning, "Disconnect & revoke token" button.
- API key config UI (`ApiKeyConfig.tsx`) merges into Settings and gains model selection (Haiku 4.5 / Sonnet 4.6 / GPT-5.4 / GPT-5.4 mini / GPT-5.4 nano).

### Bundle size
- Current: baseline (no measurement captured in the plan).
- Vercel AI SDK + Zod: +30–50 KB gz estimated.
- isomorphic-git + custom fs shim: +~100 KB gz.
- Net add: ~130–150 KB gz. Acceptable for a desktop-primary PWA. Phase 1 should capture the baseline so we can measure delta precisely per phase.

### Deployment surface
- New artifact: Cloudflare Worker at `git-proxy.dumpsterfire.ink`. Separate deploy pipeline. First Worker we ship for this project.
- PWA manifest unchanged.

### Testing surface
- Shared `EntryStorage` parity test suite (new).
- New GitSync test harness — real `isomorphic-git` against a local bare repo or in-memory Git server.
- Mocked AI SDK via `ai/test` utilities.
- Bundle size regression check in CI (new).

## Phases

### Phase 0 — Storage interface refactor (prerequisite)

**Goal:** Decouple all 13 FSA-touching files from `FileSystemDirectoryHandle`, hide storage behind an interface. No behavior change.

**Tasks:**
- Create `src/lib/storage/types.ts` with `EntryStorage` interface:
  ```ts
  interface EntryStorage {
    listEntries(): Promise<EntryMetadata[]>
    loadEntry(id: string): Promise<{ content: string; meta: EntryMetadata } | null>
    saveEntry(id: string, content: string, meta: EntryMetadata): Promise<void>
    createEntry(date: string): Promise<EntryMetadata>
    deleteEntry(id: string): Promise<void>
    getSettings(): Promise<DumpsterFireSettings>
    saveSettings(s: DumpsterFireSettings): Promise<void>
    getStats(): Promise<Stats | null>
    saveStats(s: Stats): Promise<void>
  }
  ```
- Entry IDs switch from `(date, session)` tuple to a single string: `YYYY-MM-DD-HHMMSS` (decision #4 from discussion). This is a breaking schema change — acceptable given no existing users.
- Port current `lib/filesystem.ts` + `lib/entries.ts` logic into `src/lib/storage/fsa.ts` as `FsaStorage` (temporary; deleted in Phase 1).
- Replace `folderHandle` in `appStore` with `storage: EntryStorage | null`.
- Update all 13 touchpoints to consume `storage` instead of `folderHandle`.
- Rewrite existing tests against the interface (they should mostly pass unchanged with a `MemoryStorage` test double — which is itself a useful new artifact).

**Test strategy:**
- New `MemoryStorage` in-memory implementation for unit tests.
- All existing 103 tests migrate to `MemoryStorage`; zero FSA in test code.
- Integration smoke test: can still pick a folder, write, save, reload.

**Exit criteria:** green tests, manual smoke test passes, no component references `FileSystemDirectoryHandle` except the FSA implementation file.

---

### Phase 1 — OPFS backend + remove FSA

**Goal:** Ship cross-browser. OPFS becomes the only local storage backend.

**Tasks:**
- Implement `src/lib/storage/opfs.ts` (`OpfsStorage`) against the interface. Mirror layout:
  ```
  entries/YYYY/MM/YYYY-MM-DD-HHMMSS.md
  entries/YYYY/MM/YYYY-MM-DD-HHMMSS.meta.json
  settings.json
  stats.json
  ```
  Plain files. No SQLite.
- Use async OPFS API (`getFileHandle` / `createWritable`). Sync access handles only if we hit perf issues (we won't at this scale — see Phase 0 discussion).
- Build an in-memory entry index on app load (one directory walk), invalidate on write. Dashboard/EntryBrowser reads from the index.
- Rewrite `Welcome.tsx`:
  - No "pick a folder" flow.
  - First-run: "Start writing" button. OPFS is initialized on click.
  - iOS detection: if iOS Safari and not installed as PWA, show Add-to-Home-Screen banner explaining eviction risk. Link to docs.
- Call `navigator.storage.persist()` on init (best-effort persistence).
- Delete `src/lib/filesystem.ts`, `src/lib/storage/fsa.ts`, FSA shims in `vite-env.d.ts`.

**Test strategy:**
- Unit: `OpfsStorage` tested via `MemoryStorage` parity tests (shared test suite applied to both implementations).
- E2E (Playwright): new test suite running against a real browser's OPFS. Cover: create entry → reload → entry persists; two concurrent tabs (Web Lock behavior).

**Exit criteria:** App runs on Safari desktop, Firefox desktop, Chrome desktop, iOS Safari, Android Chrome. 103 unit tests still green. New E2E tests pass on all three desktop browsers in CI.

---

### Phase 2 — Vercel AI SDK migration + prune encrypted mode

**Goal:** Clean AI provider layer. Structured output. Updated models.

**Tasks:**
- Add deps: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `zod` (likely already transitively present).
- **Verify first**: confirm `@ai-sdk/anthropic` forwards `anthropic-dangerous-direct-browser-access: true` header. If not, pass it via provider config or wrap the raw `@anthropic-ai/sdk` in a custom provider. Budget: 1 hour.
- Rewrite `src/lib/analysis.ts`:
  ```ts
  const AnalysisSchema = z.object({
    summary: z.string(),
    themes: z.array(z.string()).max(4),
    sentiment: z.object({
      overall: z.enum(['positive', 'negative', 'neutral', 'mixed']),
      score: z.number().min(0).max(1),
    }),
    mindset: z.string(),
    topWords: z.array(z.string()).length(5),
  })

  export async function analyzeEntry(content, provider, apiKey, modelChoice) {
    const model = pickModel(provider, modelChoice, apiKey)
    const { object } = await generateObject({
      model,
      schema: AnalysisSchema,
      prompt: ANALYSIS_PROMPT.replace('{{ENTRY_CONTENT}}', content),
    })
    return { analyzedAt: new Date().toISOString(), provider, model: model.modelId, ...object }
  }
  ```
- **Model defaults:**
  - Anthropic: **Claude Haiku 4.5** as default, **Sonnet 4.6** as "smarter" option.
  - OpenAI: **GPT-5.4 mini** (`gpt-5.4-mini-2026-03-17`) as default, **GPT-5.4** as "smarter" option. GPT-5.4 nano available as "cheapest." Kill `gpt-4o-mini`.
- Kill manual JSON fence-stripping and `parseAnalysisResponse` — Zod validation via `generateObject` replaces it.
- **Prune encrypted mode:**
  - Delete `src/components/PasswordSetup.tsx`, `src/components/UnlockScreen.tsx`.
  - Simplify `stores/securityStore.ts` or delete it entirely.
  - Remove `security` field from `DumpsterFireSettings` (or leave as `{ mode: 'open' }` stub for schema stability).
  - Delete `src/lib/crypto.ts` and `src/lib/crypto.test.ts`. Gone.
  - Remove unlock flow from `App.tsx`.

**Test strategy:**
- Mock `generateObject` via the Vercel SDK's built-in `MockLanguageModelV1` in `ai/test`.
- Unit tests for each provider path. Schema validation tests (invalid LLM response → caught).
- Manual smoke: run an analysis end-to-end against real Claude + real GPT with a test API key.

**Exit criteria:** `lib/analysis.ts` is ~40 lines instead of 169. No encrypted-mode UI paths remain. Bundle size delta measured and documented.

---

### Phase 3 — GitSync

**Goal:** Optional advanced feature. Sync OPFS contents to a user-owned private GitHub repo for multi-device continuity and "my files forever" peace of mind.

**Tasks:**

**3a. CORS proxy**
- New tiny repo / directory: `git-proxy/` with a Cloudflare Worker implementation (Hono or raw `fetch` handler, ~50 lines).
- Deploy to `git-proxy.dumpsterfire.ink`.
- Allowlist: only `https://api.github.com/*`, `https://github.com/*/*.git/*` paths. Reject anything else.
- Require a User-Agent header (blocks the dumbest abuse).
- Rate limit by IP via Cloudflare's built-in rules.
- Document in README that the proxy sees only TLS-encrypted traffic and has no ability to read repo contents.

**3b. GitSync service**
- Add `isomorphic-git`. **Do NOT add `@isomorphic-git/lightning-fs`** (IndexedDB-backed, would force a dual-store design — see KTD-6).
- Write `src/lib/storage/opfs-git-fs.ts`: a ~150-line custom filesystem adapter implementing isomorphic-git's fs interface (`readFile`, `writeFile`, `unlink`, `readdir`, `mkdir`, `rmdir`, `stat`, `lstat`) directly on OPFS. Skip `readlink`/`symlink` — not used by our content. Pointed at the **same** OPFS root directory that `OpfsStorage` writes to.
- Test the shim against the shared `EntryStorage` parity suite PLUS a focused test that exercises isomorphic-git's actual fs call patterns (clone, add, commit, push, pull).
- New `src/lib/sync/git.ts`:
  ```ts
  class GitSync {
    async connect(repoUrl: string, pat: string): Promise<void>
    async clone(): Promise<void>         // initial device setup
    async commit(message: string): Promise<void>
    async push(): Promise<void>
    async pull(): Promise<void>
    async status(): Promise<SyncStatus>  // ahead/behind/dirty/clean
  }
  ```
- Backing filesystem: the custom OPFS fs shim from above. The OPFS directory tree IS the Git working tree. Single source of truth.
- **Commit batching (see KTD-8):** commits do NOT fire on every autosave. They fire on: editor blur, idle >30s since last keystroke, view navigation, goal reached, explicit "Save" action. Autosave continues to write OPFS every 2s — only the Git commit layer is debounced.
- On `GitSync.commit`, stage and commit all dirty files in one operation with a message like `entry: 2026-04-08T14:32:11` (entry ID) or `stats: 2026-04-08` for stats-only updates.
- Debounced push (5s idle since last commit).
- On push failure: exponential backoff (5s → 15s → 45s → 2m → 5m cap), queue persisted in OPFS so a refresh doesn't lose pending pushes, surface status in UI.
- On app load with GitSync connected: fetch + fast-forward pull first, then render. If the working tree is ahead of remote (offline edits), push before or after render per the retry policy.
- On new device setup: user pastes repo URL + PAT → `clone` into OPFS via the fs shim → app hydrates from clone as if it had written the tree itself.
- **Shallow clone on hydration:** use `depth: 50` for initial clone to bound download size. Users almost never need ancient history at hydration time. If they do, expose a "Load full history" in Settings later.

**3c. GitHub auth** (see KTD-7)
- Fine-grained PAT, user-created, scoped to a single private repo.
- **Required scopes:** Contents = Read and Write, Metadata = Read. Nothing else. Document this exactly in the setup wizard.
- **Store PAT in IndexedDB, not localStorage.** Slightly harder XSS surface and doesn't show in the "Application → Local Storage" devtools panel. This is NOT a meaningful defense against real XSS — we rely on CSP + Milkdown sanitization for that.
- **Capture expiration date at setup.** When the user pastes the PAT, hit `GET /user` with the token to verify and ask them to also paste/select the expiration they set. Persist it.
- **Proactive expiration UX:**
  - 14 days before: non-blocking banner "GitHub token expires April 22. Rotate now →"
  - 3 days before: persistent warning
  - On expiry: sync pauses, error state, "Token expired — paste a new one" modal. Local writes continue uninterrupted.
- **Revocation path:** Settings includes "Disconnect & revoke token" which calls GitHub's credential revocation API (extended for PATs as of 2026-03-26) to server-side invalidate the token, then deletes it from IndexedDB. Document this as the compromise-recovery flow.
- **Never log the PAT.** Audit all error paths, sync status strings, and Sentry-style error capture to confirm no token leakage. This is a test assertion, not a code-review afterthought.
- Settings UI: "Connect to GitHub" form with repo URL + PAT fields, link to the exact fine-grained PAT creation URL with query params pre-filling repo + permissions, inline step-by-step.

**3d. Onboarding UX**
- Welcome screen gets a second tile: "Sync to GitHub (advanced)" → opens GitSync setup.
- Setup wizard:
  1. "Create an empty private repo on GitHub." (link to github.com/new with query params pre-filling name)
  2. "Create a fine-grained PAT scoped to that repo." (link + clear scope instructions)
  3. Paste URL + PAT → we clone → done.
- "New device" flow is the same wizard — detects existing content in the repo and hydrates instead of initializing.

**3e. Conflict handling**
- File naming: `YYYY-MM-DD-HHMMSS.md` eliminates the sequential-session collision class (each write-session creates a new filename based on its start time).
- **True edit-same-file conflict** (user edits entry `2026-04-08-143211.md` on laptop, goes offline, edits the SAME entry on phone, both try to push): `isomorphic-git` will detect the conflict on push. Resolution:
  1. Fetch remote
  2. If local ref is behind: attempt fast-forward pull (no conflict) — works for the 99% case of non-overlapping edits on different files
  3. If files truly diverge: **keep both** by renaming the local version to `{id}-conflict-{device-suffix}.md` and pushing. Surface a non-blocking "merged with conflicts, review in Settings" notification. Let the user reconcile manually — this is rare enough that building an auto-merge UI is overkill.
- **Stats.json conflicts:** never merge. Recompute from entries after every pull. Treat `stats.json` purely as a cache. Document this clearly — the file is persisted only so new devices don't have to rebuild from zero on first render.
- **Device suffix** for conflict resolution: random 4-char alphanumeric generated at GitSync setup, persisted per-device in IndexedDB. Not a user-meaningful identifier; purely for disambiguation in the rare conflict case.

**3f. Sync status UI**
- Small indicator in the Editor header: "Synced ✓" / "Syncing…" / "Offline — will push when connected" / "Error — see details".
- Manual "Push now" / "Pull now" buttons in Settings.

**Test strategy:**
- Unit: `GitSync` with a memory-backed fs + a local Git test server (`node-git-server` or similar in test harness).
- Integration: create → commit → push → clone on fresh OPFS → verify parity.
- E2E: skip in CI (requires real GitHub token); document manual test plan in `TESTING_GUIDE.md`.

**Exit criteria:**
- Worker deployed and responding at `git-proxy.dumpsterfire.ink`.
- Laptop → write → push → phone → pull → see entry. Verified manually.
- New-device hydration from a populated repo works end-to-end.
- Offline writing queues and pushes on reconnect.

---

### Phase 4 — Crypto modernization (bundled with above work)

**Note:** With encrypted mode pruned in Phase 2, there's no app-side crypto left to modernize. `lib/crypto.ts` is deleted entirely. Phase 4 collapses into Phase 2 as a deletion.

_(Original plan had Argon2id migration; no longer applicable.)_

---

### Phase 5 — WebAuthn PRF

**Deferred.** Revisit in late 2026 when iOS roaming authenticator support and cross-browser maturity improve.

## Ordering & dependencies

```
Phase 0 (storage refactor) ──> internal milestone, no ship

Phase 1 (OPFS + kill FSA) ──┐
                            │
Phase 2 (AI SDK + kill crypto) ─┼──> SHIP TOGETHER as one release
                            │
Phase 3 (GitSync)           ──┘
```

**Bundled rollout (decision 2026-04-08):** Phases 1, 2, and 3 ship as a single release rather than three sequential releases. Rationale:
- Zero active users and no marketing push planned, so there's no value in incremental visible releases.
- Bundling closes the iOS-eviction risk window (R1) entirely — no production user is ever exposed to OPFS-without-GitSync.
- The custom OPFS fs shim (KTD-6) is the most uncertain piece; bundling means we're not "shipped" until that's proven, preventing partial-state stranding.
- Phase 0 is still an internal milestone (refactor + tests green) before any of the user-visible work begins.

Internal sequencing within the bundle still follows 0 → 1 → 2 → 3 because of code dependencies, but the release happens once at the end.

## Risks & mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | iOS Safari OPFS eviction deletes user's writing before GitSync ships | Low | High | **Mitigated by bundled rollout:** Phases 1+2+3 ship together, so no iOS user is ever exposed to OPFS-without-GitSync in production. Author also confirms zero active users and no marketing push planned until the bundle lands. Aggressive "Add to Home Screen" prompt on iOS Safari first-run remains as belt-and-suspenders. `navigator.storage.persist()` called on init. |
| R2 | `@ai-sdk/anthropic` <2.0.49 drops custom headers, breaking direct-browser access | Low | Medium | Pin `@ai-sdk/anthropic` ≥ 2.0.49 in package.json. Add a runtime assertion that `anthropic-dangerous-direct-browser-access: true` is actually sent (inspect request in a dev-mode test). Fallback plan: wrap the raw `@anthropic-ai/sdk` package in a custom AI SDK provider (~1 hour of work). |
| R3 | isomorphic-git performance degrades at 1000+ commits on mobile | Low | Medium | Shallow clone on hydration (`depth: 50`). Commit batching (KTD-8) keeps commit count well below per-entry levels — expect ~1 commit per writing session, not per autosave. Benchmark with a 2000-commit test repo before Phase 3 exit. Escape hatch: squash old history via server-side rebase if a user ever hits the wall. |
| R4 | Custom OPFS fs shim has subtle bugs isomorphic-git exercises | Medium | High | Build the shim test suite around isomorphic-git's actual call patterns, not just fs-level assertions. Clone → add → commit → push → reclone → verify parity is the gold test. Include pathological cases (concurrent writes, interrupted writes, missing parent dirs). Budget 2x initial estimate for shim work. Fallback: fall back to `@componentor/fs` if our shim proves unstable (adds supply-chain risk but unblocks the phase). |
| R5 | CORS proxy becomes abuse target | Low | Medium | Allowlist ONLY `api.github.com` and `github.com/*.git/*` paths. Reject requests without a browser-shaped User-Agent. Cloudflare rate-limit rules: 60 req/min per IP. Monitor Worker metrics; if abuse appears, add a simple proof-of-work or origin header check. No auth layer — the proxy is public by design. |
| R6 | GitHub PAT leaks via XSS | Low | Critical | Strict CSP headers (no inline scripts, no eval, restrict `connect-src` to api.github.com + the proxy + api.anthropic.com + api.openai.com). Milkdown's sanitized markdown rendering is the other half. IndexedDB over localStorage is a minor defense-in-depth measure, NOT a substitute. Document the threat model honestly in SECURITY.md. |
| R7 | GitHub PAT expires mid-session | High | Low | Capture expiration at setup, proactive 14d/3d/0d banners, graceful degradation (sync pauses, local writes continue). Never block writing on token state. |
| R8 | User forgets or loses their PAT across devices | Medium | Low | The repo itself is the durable backup. Generate a new PAT on GitHub, re-connect, zero data loss. Document this as the standard recovery flow. |
| R9 | Cross-device same-entry edit conflict | Low | Low | Timestamp-based filenames eliminate 99% of cases. For the remaining 1%: keep-both with conflict suffix + non-blocking notification for manual review. No auto-merge UI. |
| R10 | CORS proxy outage blocks all GitSync | Low | High | Monitor uptime (Cloudflare Worker is already 99.99%+ reliable). Local writes continue uninterrupted during an outage; sync resumes when the proxy is back. Document "sync is optional; your writing is always safe locally." Belt: allow users to configure a custom proxy URL in Settings for self-hosting. |
| R11 | Schema break (entry ID format) silently corrupts an existing deployment | Low | High | No existing deployment exists (confirmed). For Phase 1 migration, `OpfsStorage` is a fresh OPFS directory; the author handles their own personal data migration manually. No automatic migration logic to test or ship. |
| R12 | Bundle size grows unacceptably | Medium | Low | Capture baseline in Phase 0 (`npm run build` size). Measure per-phase delta. Budget: total add < 200 KB gz across all phases. If exceeded, revisit Vercel AI SDK vs hand-rolled abstraction. |
| R13 | Autosave and GitSync commit debounce interact badly (e.g., commit fires mid-write) | Medium | Medium | Commits fire on boundary events (blur/idle/nav/goal), NOT on a time-based trigger during active typing. Integration test: rapid-fire typing for 5 minutes should produce zero commits; blur should produce exactly one. |
| R14 | `navigator.storage.persist()` prompts unexpectedly in Firefox | Medium | Low | Call `persist()` only after user has interacted meaningfully (written first entry), not on app load. Firefox's explicit prompt is fine UX at that moment. Silent-grant on Chrome/Safari is unaffected. |
| R15 | Service worker caches GitHub API or proxy responses, causing stale sync state | Low | High | Explicit `NetworkOnly` routing strategy for `api.github.com`, the proxy domain, and all AI provider APIs in the service worker config. Verify with a test that hits the proxy with cache-busting headers and checks the response is fresh. |

## Rollout plan

Single bundled release. No incremental ships.

1. **Phases 0–3 land on a feature branch.** All work merges to the branch in dependency order; nothing reaches main/`burn.dumpsterfire.ink` until the bundle is complete.
2. **Cloudflare Worker deployment** happens before the app bundle ships:
   - Create `git-proxy/` directory with Worker source.
   - Deploy to `git-proxy.dumpsterfire.ink` via `wrangler deploy`.
   - Smoke test: `curl` a GitHub API call through the proxy, confirm response.
   - Smoke test: confirm non-GitHub URLs are rejected with 403.
   - Monitor for 48h before merging the app bundle to main.
3. **App bundle ships to `burn.dumpsterfire.ink`** after the Worker is green for 48h and the full bundle passes all tests (unit + E2E across Chrome, Safari desktop, Firefox; manual smoke on iOS Safari and Android Chrome).
4. **GitSync UI is default-off** in Settings — power-user opt-in. The "GitSync (advanced)" tile on the welcome screen is the discoverable entry point.
5. **No feature flags** in the app itself. Rollback = revert + redeploy.
6. **CSP header tightening** lands as part of the bundle (the new `connect-src` list covers the proxy, GitHub API, Anthropic, and OpenAI in one shot).
7. **Personal data migration** for the author's own historical entries (the only existing FSA user) is a manual one-time script run locally — not part of the shipped code.

## Open verification items

**Resolved during deepening pass (2026-04-08):**

- [x] `@ai-sdk/anthropic` header forwarding → **Resolved.** Version ≥ 2.0.49 retains user-supplied betas and headers. Pin accordingly.
- [x] Claude Haiku 4.5 API model ID → **Resolved.** `claude-haiku-4-5` (alias, auto-upgrades) or `claude-haiku-4-5-20251001` (pinned, EOL ≥ 2026-10-01). Plan uses the alias.
- [x] isomorphic-git OPFS adapter → **Resolved.** No official adapter; `lightning-fs` is IndexedDB-only; `@componentor/fs` exists but is immature. Decision: write a custom OPFS fs shim (~150 lines). See KTD-6.

**Still open, to verify before Phase 2:**

- [ ] Confirm exact `claude-sonnet-4-6` (or latest Sonnet) API model ID as the "smarter" option for the analysis UI. The plan names Sonnet 4.6 but the ID hasn't been verified against the Anthropic model list.
- [ ] Confirm `gpt-5.4` full variant API model ID (we have `gpt-5.4-mini-2026-03-17` and `gpt-5.4-nano-2026-03-17` confirmed; full `gpt-5.4` ID still needs verification against the OpenAI models endpoint).
- [ ] Verify Milkdown's current XSS sanitization guarantees against our target CSP — do we need an extra sanitizer pass, or is the built-in renderer sufficient for markdown-in, markdown-out?

**Still open, to verify before Phase 3:**

- [ ] Benchmark custom OPFS fs shim against isomorphic-git operations on a realistic 2000-commit test repo. Target: clone in <10s, commit in <500ms, push in <3s (Claude web equivalents).
- [ ] Confirm GitHub credential revocation API endpoint and request shape for fine-grained PATs (2026-03-26 extension) — need exact URL, method, and required scopes.
- [ ] Confirm Cloudflare Worker free tier limits cover expected usage (100k req/day is the baseline; at ~10 Git requests per active user per day we can support ~10k DAU before paying).

**Deferred to Phase 5 / future:**

- [ ] WebAuthn PRF cross-device passkey stability on iOS 19+ (if released) and any changes to roaming authenticator PRF support.

## What stays the same

- Milkdown editor, typewriter scrolling, themes, SparksAnimation, FireAnimation, WhatRemains component, Dashboard + ActivityGrid, streak display.
- 750-word goal, session concept, meta.json sidecar format.
- "Rekindle" flow.
- PWA manifest and service worker.

## What gets deleted

- `src/lib/filesystem.ts`
- `src/lib/crypto.ts` + test
- `src/components/PasswordSetup.tsx`
- `src/components/UnlockScreen.tsx`
- `src/components/ApiKeyConfig.tsx` (merged into Settings with new provider abstraction)
- FSA shims in `src/vite-env.d.ts`
- Folder-picker UI in `Welcome.tsx`
- `security` mode field and `securityStore`

## What gets added

- `src/lib/storage/types.ts`, `memory.ts`, `opfs.ts`
- `src/lib/sync/git.ts`
- `src/lib/ai/providers.ts` (thin Vercel AI SDK wrappers)
- `git-proxy/` Cloudflare Worker
- Onboarding wizard for GitSync
- Sync status indicator component

## Sources & References

Research captured during the initial plan and the 2026-04-08 deepening pass.

**OPFS & browser storage:**
- [MDN: Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [web.dev: The Origin Private File System](https://web.dev/articles/origin-private-file-system)
- [RxDB: OPFS notes on iOS 17 quota](https://rxdb.info/rx-storage-opfs.html)
- [MDN: StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
- [web.dev: Persistent storage](https://web.dev/articles/persistent-storage)

**isomorphic-git & browser Git:**
- [isomorphic-git/cors-proxy](https://github.com/isomorphic-git/cors-proxy)
- [isomorphic-git/lightning-fs](https://github.com/isomorphic-git/lightning-fs)
- [isomorphic-git docs: Bring Your Own FS](https://isomorphic-git.org/docs/en/fs)
- `@componentor/fs` — alternative OPFS adapter (considered and rejected due to supply-chain risk, see KTD-6)

**Vercel AI SDK & BYOK:**
- [Vercel AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6)
- [vercel/ai#3041 — dangerouslyAllowBrowser for Anthropic](https://github.com/vercel/ai/issues/3041)
- [AI SDK Providers: Anthropic](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [Simon Willison: Claude's API now supports CORS](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/)
- [anthropics/anthropic-sdk-typescript#248 — dangerouslyAllowBrowser](https://github.com/anthropics/anthropic-sdk-typescript/issues/248)

**Model IDs:**
- [Claude Haiku 4.5 on anthropic.com](https://www.anthropic.com/claude/haiku)
- [Claude models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [GPT-5.4 mini docs](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [GPT-5.4 nano docs](https://developers.openai.com/api/docs/models/gpt-5.4-nano)
- [OpenAI: Introducing GPT-5.4 mini and nano](https://openai.com/index/introducing-gpt-5-4-mini-and-nano/)

**GitHub auth & credential handling:**
- [GitHub Docs: Keeping your API credentials secure](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure)
- [GitHub Docs: Managing personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub Docs: Token expiration and revocation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation)
- [GitHub Blog (2026-03-26): Credential revocation API extended for PATs](https://github.blog/changelog/2026-03-26-credential-revocation-api-now-supports-github-oauth-and-github-app-credentials/)

**WebAuthn PRF (deferred, for future reference):**
- [Corbado: Passkeys & WebAuthn PRF for E2EE (2026)](https://www.corbado.com/blog/passkeys-prf-webauthn)
- [Yubico: Developer's Guide to PRF](https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html)

## Testing discipline

- Shared `EntryStorage` test suite runs against `MemoryStorage` and `OpfsStorage` both — parity by construction.
- Every phase updates `TESTING_GUIDE.md` with new test descriptions per CLAUDE.md convention.
- Target: no drop in the 103-test baseline through Phase 1. Gain tests in Phases 2 and 3.
