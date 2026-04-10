# Manual Testing Guide

Run these tests in a browser before merging `feat/storage-interface-refactor` to main.

## Prerequisites

```bash
npm run dev   # http://localhost:5173
```

---

## 1. Basic OPFS Flow (Chrome, Firefox, Safari)

Test in each browser. This is the core "does the app work" check.

- [ x] **Chrome** — Open app, see Welcome screen with two tiles ("Start Writing" and "Sync to GitHub")
- [ x] **Firefox** — Same Welcome screen renders
- [ x] **Safari (macOS)** — Same Welcome screen renders

For each browser:

- [ x] Click "Start Writing"
- [ x] Editor loads, cursor is in the writing area
- [x ] Type ~50 words, verify word count updates in header
- [x ] Wait 3 seconds — SaveIndicator shows "Saved"
- [x ] Refresh the page — app auto-reconnects, your entry is still there
- [ x] Close and reopen the browser — entry persists (OPFS is durable)

## 2. Entry Management

- [ x] Write enough to create a full entry (any word count)
- [ x] Open Calendar (calendar icon in header) — today is highlighted
- [ x] Open Entry Browser (list icon in header) — your entry appears with preview
- [ x] Search for a word you wrote — entry shows up in results
- [ x] Create a new session (if the UI supports it) — verify session count increments

## 3. Goal + What Remains Flow

- [ x] Set word goal to 50 (Settings > Daily Word Goal) so it's easy to hit
- [ x] Write 50+ words
- [ ] Sparks animation plays (embers rising, ~5 seconds)
- [ x] "Strike the match" button appears at bottom center
- [ ] Click it — fire animation plays (~2.5 seconds)
- [ x] Split view opens: masked entry on left, What Remains panel on right
- [ ] If API keys are configured: AI analysis loads (QuillLoader shows, then results)
- [x ] Click the masked entry to return to full editor

## 4. Settings

- [ x] Open Settings (gear icon)
- [ x] Change theme — preview updates immediately
- [ x] Change word goal — saves correctly
- [ x] Change font — editor updates
- [ x] "Configure API Keys" opens the API key modal
- [ x] GitHub Sync section shows "Set Up GitHub Sync" button (if not connected)
- [ x] Save and close — settings persist on refresh

## 5. iOS Safari (iPhone/iPad)

- [ ] Open http://localhost:5173 in Safari (or deploy to a test URL)
- [ ] "Add to Home Screen" banner appears (if not already installed as PWA)
- [ ] Click "Start Writing" — OPFS initializes without error
- [ ] Write and save — entry persists on refresh
- [ ] PWA mode: add to Home Screen, open from icon — app loads, entry still there

## 6. Firefox Specific

- [ ] First write may trigger a `navigator.storage.persist()` prompt — accept it
- [ ] Verify entries persist after accepting persistent storage
- [ ] If the prompt is declined, the app should still work (just no persistence guarantee)

---

## 7. GitSync (requires GitHub setup)

This is the most complex flow. You need a real GitHub repo and PAT.

### Setup

1. Create an empty private repo: https://github.com/new?name=dumpsterfire-test-sync&visibility=private
2. Create a fine-grained PAT at https://github.com/settings/personal-access-tokens/new
   - Select only the test repo
   - Permissions: Contents (Read and Write), Metadata (Read)
   - Set an expiration date (e.g., 30 days)
3. Copy the repo URL and PAT

### Test: Fresh Setup via Welcome Screen

- [ ] Open app in a fresh browser/incognito (no existing data)
- [ ] Click "Set Up GitHub Sync" on Welcome screen
- [ ] Step 1: "Create Private Repo" link works (opens GitHub in new tab)
- [ ] Step 2: "Create PAT" link works, permissions list is clear
- [ ] Step 3: Paste repo URL + PAT + expiration date
- [ ] Click "Connect & Sync" — verifies PAT against GitHub API
- [ ] App initializes — you're in the editor
- [ ] Sync status indicator shows in the header ("Synced" or "Local only")

### Test: Write and Push

- [ ] Write an entry (~50 words)
- [ ] Wait for autosave (2s), then trigger a sync commit by:
  - Clicking away from the browser window (blur), OR
  - Waiting 30 seconds idle, OR
  - Opening the Calendar or Entry Browser
- [ ] Check the GitHub repo — you should see commits with your entry files
- [ ] Verify the repo structure: `entries/YYYY/MM/YYYY-MM-DD-HHMMSSmmm.md` + `.meta.json`

### Test: Settings Sync Controls

- [ ] Open Settings > GitHub Sync section
- [ ] Status shows "Synced" (green dot)
- [ ] Click "Push now" — pushes immediately
- [ ] Click "Pull now" — pulls latest
- [ ] If you set a PAT expiration: verify the expiration warning shows when appropriate

### Test: Multi-Device Sync (two browsers)

- [ ] Browser A: write an entry, wait for it to push to GitHub
- [ ] Browser B (incognito or different browser): set up GitSync with same repo
- [ ] Browser B should clone and show the entry from Browser A
- [ ] Write a different entry in Browser B, push
- [ ] Browser A: click "Pull now" in Settings — Browser B's entry appears

### Test: Disconnect

- [ ] Settings > GitHub Sync > "Disconnect & Revoke Token"
- [ ] Confirm the dialog
- [ ] Sync status returns to "Local only" / disconnected
- [ ] Local entries are still there (disconnect doesn't delete data)
- [ ] Writing continues to work normally without sync

### Test: Settings Setup (not from Welcome)

- [ ] Start with a local-only app (click "Start Writing" on Welcome)
- [ ] Open Settings > GitHub Sync > "Set Up GitHub Sync"
- [ ] Complete the setup wizard
- [ ] Existing local entries should now sync to the repo

---

## 8. CSP Verification

Open browser DevTools > Console while using the app.

- [ ] No CSP violation errors during normal usage
- [ ] No CSP violation errors when using AI analysis (Anthropic/OpenAI calls)
- [ ] No CSP violation errors when using GitSync (proxy + GitHub API calls)
- [ ] Fonts load correctly (Google Fonts is allowlisted)

---

## 9. PWA / Offline

- [ ] Install as PWA (Chrome: address bar install icon, or "Add to Home Screen")
- [ ] Open PWA — app loads
- [ ] Disconnect from internet (airplane mode or disable Wi-Fi)
- [ ] App still loads and you can write
- [ ] Entries save to OPFS while offline
- [ ] Reconnect — if GitSync is enabled, queued changes should push

---

## Quick Smoke Test (minimum viable)

If you're short on time, just do these:

1. [ ] Chrome: Start Writing → type 50 words → refresh → entry persists
2. [ ] Firefox: same as above
3. [ ] Safari: same as above
4. [ ] GitSync: setup → write → push → verify on GitHub
5. [ ] DevTools console: no CSP errors
