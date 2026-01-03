# Three Pages - Product Specification

> A local-first, privacy-focused writing app inspired by 750words.com

## Overview

Three Pages is a web-based writing application that encourages daily writing practice with a goal of 750 words (three pages) per session. Unlike cloud-based alternatives, all data is stored locally on the user's device using the Chrome File System Access API, ensuring complete privacy and data ownership.

## Core Philosophy

- **Privacy First**: All writing stays on your device. No servers, no accounts, no data collection.
- **Frictionless Writing**: Open the app and start writing. Autosave handles the rest.
- **Meaningful Insights**: AI-powered analysis helps you understand your writing patterns and thoughts.
- **Personal Gamification**: Track streaks and progress for personal motivation (no social features).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Editor | Milkdown (ProseMirror-based) |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Local Storage | File System Access API |
| AI Integration | Anthropic Claude API, OpenAI API |
| Deployment | Netlify (static site) |
| PWA | Vite PWA Plugin |

---

## Data Architecture

### Local Folder Structure

```
/three-pages/
├── entries/
│   ├── 2026-01-02/
│   │   ├── session-1.md
│   │   ├── session-1.meta.json
│   │   ├── session-2.md
│   │   └── session-2.meta.json
│   └── 2026-01-03/
│       ├── session-1.md
│       └── session-1.meta.json
├── analysis-queue.json
└── settings.json
```

### Entry Markdown File (`session-1.md`)

Plain markdown content. The user's writing with any formatting they applied.

### Entry Metadata File (`session-1.meta.json`)

```json
{
  "id": "uuid-v4",
  "date": "2026-01-02",
  "sessionNumber": 1,
  "createdAt": "2026-01-02T17:15:00Z",
  "completedAt": "2026-01-02T17:28:00Z",
  "goal": 750,
  "stats": {
    "wordCount": 767,
    "characterCount": 4521,
    "paragraphCount": 8,
    "activeTimeSeconds": 780,
    "totalTimeSeconds": 900,
    "wordsPerMinute": 55,
    "longestFlowSeconds": 180,
    "goalReached": true,
    "goalReachedAt": "2026-01-02T17:26:00Z"
  },
  "analysis": {
    "status": "completed", // "pending" | "completed" | "failed"
    "completedAt": "2026-01-02T17:30:00Z",
    "provider": "anthropic",
    "summary": "...",
    "themes": ["work", "family", "goals"],
    "sentiment": {
      "overall": "positive",
      "arc": [
        { "segment": 1, "sentiment": "neutral" },
        { "segment": 2, "sentiment": "positive" },
        { "segment": 3, "sentiment": "positive" }
      ]
    },
    "mindset": {
      "introvertExtrovert": 0.7, // 0 = extrovert, 1 = introvert
      "positiveNegative": 0.8,   // 0 = negative, 1 = positive
      "certainUncertain": 0.4,   // 0 = uncertain, 1 = certain
      "thinkingFeeling": 0.6     // 0 = feeling, 1 = thinking
    },
    "timeOrientation": "present", // "past" | "present" | "future"
    "primaryPerspective": "I",    // "I" | "we" | "you" | "they"
    "topWords": ["work", "project", "feeling", "tomorrow", "good"],
    "extractedActions": ["Follow up with team about project deadline"],
    "extractedQuestions": ["Should I take that opportunity?"]
  }
}
```

### Analysis Queue (`analysis-queue.json`)

```json
{
  "pending": [
    {
      "entryPath": "entries/2026-01-02/session-1",
      "addedAt": "2026-01-02T17:28:00Z",
      "retryCount": 0
    }
  ]
}
```

### Settings (`settings.json`)

```json
{
  "theme": "dark",
  "wordGoal": 750,
  "security": {
    "mode": "encrypted", // "open" | "app-lock" | "encrypted"
    "passwordHash": "base64-pbkdf2-hash...", // for app-lock and encrypted modes
    "passwordSalt": "base64-salt..."
  },
  "ai": {
    "provider": "anthropic", // "anthropic" | "openai" | "none"
    "anthropicKey": {
      "salt": "base64...",
      "iv": "base64...",
      "data": "base64-encrypted..."
    },
    "openaiKey": {
      "salt": "base64...",
      "iv": "base64...",
      "data": "base64-encrypted..."
    },
    "autoAnalyze": true
  },
  "editor": {
    "fontSize": "normal", // "small" | "normal" | "large"
    "fontFamily": "serif" // "serif" | "sans" | "mono"
  },
  "writing": {
    "showWordCount": true,
    "showTimer": true,
    "showProgress": true
  }
}
```

---

## Security Architecture

Three Pages offers three security tiers, allowing users to choose their preferred balance of convenience and protection.

### Security Tiers

| Tier | Password Required | Files on Disk | API Keys | Best For |
|------|-------------------|---------------|----------|----------|
| **Open** | No | Plain text `.md` | Obfuscated (base64) | Personal device, convenience priority |
| **App Lock** | Yes, to open app | Plain text `.md` | Encrypted (AES-256) | Shared device, casual protection |
| **Encrypted** | Yes, to open app | Encrypted `.md.enc` | Encrypted (AES-256) | Maximum privacy, device theft protection |

### Tier Details

#### Open Mode
- No password required
- Entry files stored as plain markdown (readable in any text editor)
- API keys stored with basic obfuscation (base64 + reversal)
- Lowest friction, suitable for personal devices

#### App Lock Mode
- Password required to access the app
- Entry files remain plain markdown on disk
- API keys encrypted with AES-256-GCM
- Protects against: bookmark clicking, casual snooping in browser
- Does NOT protect: files if accessed directly via file system

#### Encrypted Mode
- Password required to access the app
- All entry content encrypted before writing to disk
- Files stored as `.md.enc` (unreadable without app + password)
- API keys encrypted with AES-256-GCM
- Protects against: device theft, file system access, casual snooping
- Trade-off: Files not readable outside Three Pages

### File Format by Security Mode

**Open & App Lock Mode:**
```
entries/2026-01-02/
├── session-1.md           # Plain text markdown
└── session-1.meta.json    # Plain text JSON
```

**Encrypted Mode:**
```
entries/2026-01-02/
├── session-1.md.enc       # Encrypted content blob
└── session-1.meta.enc     # Encrypted metadata
```

### Encryption Implementation

All encryption uses the **Web Crypto API** for cross-browser compatibility (Chrome, Edge, and other Chromium-based browsers).

#### Key Derivation (PBKDF2)
```typescript
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
```

#### Encryption (AES-256-GCM)
```typescript
interface EncryptedData {
  salt: string;  // Base64-encoded, unique per encryption
  iv: string;    // Base64-encoded, unique per encryption
  data: string;  // Base64-encoded ciphertext
}

async function encrypt(plaintext: string, password: string): Promise<EncryptedData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  
  return {
    salt: base64Encode(salt),
    iv: base64Encode(iv),
    data: base64Encode(new Uint8Array(encrypted))
  };
}

async function decrypt(encrypted: EncryptedData, password: string): Promise<string> {
  const salt = base64Decode(encrypted.salt);
  const iv = base64Decode(encrypted.iv);
  const data = base64Decode(encrypted.data);
  const key = await deriveKey(password, salt);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  return new TextDecoder().decode(decrypted);
}
```

#### Password Verification
For App Lock and Encrypted modes, we store a hash to verify the password without storing it:

```typescript
async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const key = await deriveKey(password, salt);
  // Export and hash the derived key as verification
  const exported = await crypto.subtle.exportKey('raw', key);
  const hash = await crypto.subtle.digest('SHA-256', exported);
  return base64Encode(new Uint8Array(hash));
}

async function verifyPassword(password: string, storedHash: string, salt: Uint8Array): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash === storedHash;
}
```

### Session Management

- Password entered once when opening the app
- Derived encryption key held in memory for the session
- Key cleared on:
  - Browser tab close
  - Manual "Lock" action
  - Configurable idle timeout (optional)
- Never persisted to disk or storage

### Security Mode Migration

Users can change security modes in settings:

| From | To | Process |
|------|----|---------|
| Open | App Lock | Set password, encrypt API keys |
| Open | Encrypted | Set password, encrypt all files + API keys |
| App Lock | Encrypted | Re-encrypt all files with same password |
| App Lock | Open | Confirm, remove password, decrypt API keys |
| Encrypted | App Lock | Decrypt all files, keep API keys encrypted |
| Encrypted | Open | Confirm (dangerous), decrypt everything |

**Warning dialogs** shown when downgrading security (Encrypted → App Lock → Open).

### Password Recovery

There is no password recovery mechanism. If a user forgets their password:

- **App Lock mode**: API keys lost (re-enter them), entries still readable
- **Encrypted mode**: All data unrecoverable

Clear warnings shown during setup:
> "If you forget your password, your encrypted data cannot be recovered. Consider using a password manager."

---

## Features - Phase 1 (MVP)

### Epic 1: Core Writing Experience

#### Story 1.1: Folder Connection
- **As a** user
- **I want to** connect the app to a folder on my computer
- **So that** my writing is saved locally and I control my data

**Acceptance Criteria:**
- [ ] "Connect Folder" button triggers File System Access API picker
- [ ] App creates required folder structure if it doesn't exist
- [ ] Connection persists across browser sessions (via stored handle)
- [ ] Clear error messages if folder access is denied or revoked
- [ ] Ability to disconnect and connect a different folder

#### Story 1.2: Writing Editor
- **As a** user
- **I want to** write in a distraction-free editor with markdown support
- **So that** I can focus on my thoughts without friction

**Acceptance Criteria:**
- [ ] Milkdown editor with Bear-style inline markdown rendering
- [ ] Headers, bold, italic, lists, blockquotes render inline
- [ ] Cursor on formatted text reveals markdown syntax
- [ ] Smooth typing experience (no lag)
- [ ] Editor fills available viewport height
- [ ] Configurable font size and family

#### Story 1.3: Autosave
- **As a** user
- **I want to** have my writing automatically saved
- **So that** I never lose my work

**Acceptance Criteria:**
- [ ] Debounced save (2 seconds after last keystroke)
- [ ] Immediate save on window blur or beforeunload
- [ ] Subtle "Saved" indicator after each save
- [ ] "Unsaved changes" indicator while dirty
- [ ] Graceful handling of save failures with retry

#### Story 1.4: Session Management
- **As a** user
- **I want to** start new writing sessions and have multiple per day
- **So that** I can write whenever inspiration strikes

**Acceptance Criteria:**
- [ ] "New Session" button creates new entry for today
- [ ] Sessions numbered sequentially (session-1, session-2, etc.)
- [ ] Each session tracked independently
- [ ] Can switch between today's sessions
- [ ] Clear indication of which session is active

#### Story 1.5: Real-time Stats
- **As a** user
- **I want to** see my progress while writing
- **So that** I know how close I am to my goal

**Acceptance Criteria:**
- [ ] Live word count display
- [ ] Progress bar toward goal (e.g., 450/750)
- [ ] Timer showing active writing time
- [ ] Words per minute (updated every 10 seconds)
- [ ] Visual celebration when goal is reached
- [ ] Stats can be hidden via settings

---

### Epic 2: Entry History & Navigation

#### Story 2.1: Calendar View
- **As a** user
- **I want to** see a calendar of my writing history
- **So that** I can track my consistency and find past entries

**Acceptance Criteria:**
- [ ] Monthly calendar view showing days with entries
- [ ] Visual indicator for goal reached vs. partial writing
- [ ] Click on day to view/select entries from that day
- [ ] Navigate between months
- [ ] Current streak displayed

#### Story 2.2: Entry Browser
- **As a** user
- **I want to** browse and read my past entries
- **So that** I can reflect on what I've written

**Acceptance Criteria:**
- [ ] List view of entries (newest first)
- [ ] Entry preview (first ~100 words)
- [ ] Filter by date range
- [ ] Search entries (full-text, local)
- [ ] View entry in read-only mode with formatting

#### Story 2.3: Entry Stats View
- **As a** user
- **I want to** see detailed stats and analysis for any entry
- **So that** I can understand my writing patterns

**Acceptance Criteria:**
- [ ] Display all metadata from meta.json
- [ ] Visualizations for sentiment, mindset metrics
- [ ] Word cloud for entry
- [ ] Show extracted themes, actions, questions
- [ ] "Analyze" button for entries pending analysis

---

### Epic 3: AI-Powered Analysis

#### Story 3.1: API Key Configuration
- **As a** user
- **I want to** configure my AI provider and API key
- **So that** I can enable AI-powered analysis

**Acceptance Criteria:**
- [ ] Settings UI for selecting provider (Anthropic/OpenAI/None)
- [ ] Secure input for API key
- [ ] "Test Connection" button to validate key
- [ ] API key stored in settings.json (consider encryption)
- [ ] Clear messaging about data privacy (keys stay local)

#### Story 3.2: Automatic Analysis Queue
- **As a** user
- **I want to** have my entries automatically analyzed when I'm online
- **So that** I get insights without manual effort

**Acceptance Criteria:**
- [ ] Completed entries added to analysis queue
- [ ] Queue processed when app is open and online
- [ ] Progress indicator for pending analyses
- [ ] Retry logic for failed analyses (max 3 retries)
- [ ] Analysis results saved to meta.json

#### Story 3.3: Per-Entry Analysis
- **As a** user
- **I want to** see AI-generated insights for my entries
- **So that** I can understand my thoughts and patterns

**Acceptance Criteria:**
- [ ] Summary generation (configurable length)
- [ ] Theme/topic extraction
- [ ] Sentiment analysis (overall + arc through entry)
- [ ] Mindset metrics (introvert/extrovert, positive/negative, etc.)
- [ ] Time orientation detection
- [ ] Perspective analysis (I/we/you/they)
- [ ] Action item extraction
- [ ] Question extraction

#### Story 3.4: Interactive AI Lenses (Stretch for MVP)
- **As a** user
- **I want to** apply different AI "lenses" to my writing
- **So that** I can get different perspectives on what I wrote

**Acceptance Criteria:**
- [ ] "Summarize" lens (default)
- [ ] "What should I do?" lens (actionable advice)
- [ ] "What am I avoiding?" lens (pattern recognition)
- [ ] "Reframe this" lens (cognitive reframing)
- [ ] Results displayed in collapsible panel
- [ ] On-demand (not automatic)

---

### Epic 4: Themes & Customization

#### Story 4.1: Theme System
- **As a** user
- **I want to** choose from multiple visual themes
- **So that** I can write in an environment that suits my mood

**Acceptance Criteria:**
- [ ] Theme selector in settings
- [ ] Themes apply to entire app
- [ ] Smooth transition between themes
- [ ] Theme preference persisted

#### Story 4.2: Theme - Dark Mode
- Clean dark theme with comfortable contrast
- Background: Near black (#111)
- Text: Off-white
- Accents: Subtle green for progress

#### Story 4.3: Theme - Light Mode
- Clean light theme
- Background: Off-white (#fafafa)
- Text: Dark gray
- Accents: Blue for progress

#### Story 4.4: Theme - Sepia
- Warm, paper-like feel
- Background: Warm cream (#f4ecd8)
- Text: Dark brown
- Font: Serif by default

#### Story 4.5: Theme - Matrix Terminal
- Retro hacker aesthetic
- Background: Black
- Text: Green (#00ff00) with slight glow
- Font: Monospace
- Optional: Scanline effect, CRT curvature

#### Story 4.6: Theme - Script on Parchment
- Elegant, traditional feel
- Background: Aged parchment texture
- Text: Dark sepia
- Font: Script/cursive style (Georgia or similar)

---

### Epic 5: PWA & Offline Support

#### Story 5.1: PWA Configuration
- **As a** user
- **I want to** install Three Pages as an app on my device
- **So that** I can access it like a native application

**Acceptance Criteria:**
- [ ] Valid web manifest
- [ ] App icon set (multiple sizes)
- [ ] Install prompt handling
- [ ] Standalone display mode
- [ ] Appropriate splash screen

#### Story 5.2: Offline Writing
- **As a** user
- **I want to** write even without internet connection
- **So that** I can write anywhere

**Acceptance Criteria:**
- [ ] Service worker caches app shell
- [ ] Writing works completely offline
- [ ] Local stats calculated offline
- [ ] Clear indicator when offline
- [ ] AI analysis queued for when online

#### Story 5.3: Sync Status
- **As a** user
- **I want to** know the status of pending AI analyses
- **So that** I understand what's processed and what's waiting

**Acceptance Criteria:**
- [ ] Badge showing number of pending analyses
- [ ] List view of queue with status
- [ ] Manual "Process Now" button
- [ ] Clear messaging about what requires connectivity

---

### Epic 6: Settings & Configuration

#### Story 6.1: Settings Panel
- **As a** user
- **I want to** configure app behavior
- **So that** it works the way I prefer

**Acceptance Criteria:**
- [ ] Accessible settings panel (sidebar or modal)
- [ ] Settings grouped by category
- [ ] Changes saved immediately
- [ ] Reset to defaults option

#### Story 6.2: Writing Goal Setting
- **As a** user
- **I want to** set my own word count goal
- **So that** I can customize the challenge

**Acceptance Criteria:**
- [ ] Numeric input for word goal
- [ ] Preset buttons (250, 500, 750, 1000)
- [ ] Default: 750
- [ ] Goal applies to new sessions
- [ ] Option for "no goal" (freeform mode)

#### Story 6.3: Editor Preferences
- **As a** user
- **I want to** customize the editor appearance
- **So that** writing is comfortable for me

**Acceptance Criteria:**
- [ ] Font size: Small, Normal, Large
- [ ] Font family: Serif, Sans-serif, Monospace
- [ ] Line spacing: Compact, Normal, Relaxed
- [ ] Editor width: Narrow, Medium, Wide, Full
- [ ] Preview of changes in real-time

---

### Epic 7: Security & Privacy

#### Story 7.1: Security Mode Selection
- **As a** user
- **I want to** choose my security level
- **So that** I can balance convenience and privacy

**Acceptance Criteria:**
- [ ] Security settings section in settings panel
- [ ] Three options: Open, App Lock, Encrypted
- [ ] Clear explanation of each mode's protection level
- [ ] Warning when downgrading security
- [ ] Migration process for changing modes (encrypt/decrypt files)

#### Story 7.2: Password Setup (App Lock & Encrypted)
- **As a** user
- **I want to** set a password to protect my writing
- **So that** others cannot access my entries

**Acceptance Criteria:**
- [ ] Password input with confirmation field
- [ ] Minimum password requirements (8+ characters)
- [ ] Password strength indicator
- [ ] Clear warning about no recovery option
- [ ] Password stored as PBKDF2 hash (never plaintext)

#### Story 7.3: Unlock Screen
- **As a** user
- **I want to** unlock the app with my password
- **So that** I can access my protected writing

**Acceptance Criteria:**
- [ ] Clean unlock screen on app open (when password set)
- [ ] Password input field
- [ ] "Unlock" button
- [ ] Error message on wrong password
- [ ] Rate limiting after failed attempts (prevent brute force)
- [ ] Optional "Remember for 24 hours" checkbox

#### Story 7.4: Content Encryption (Encrypted Mode)
- **As a** user
- **I want to** have my entries encrypted on disk
- **So that** my writing is protected even if someone accesses my files

**Acceptance Criteria:**
- [ ] Entries saved as `.md.enc` encrypted blobs
- [ ] Metadata saved as `.meta.enc` encrypted blobs
- [ ] AES-256-GCM encryption with unique IV per file
- [ ] Encryption/decryption happens transparently
- [ ] Graceful error handling for decryption failures

#### Story 7.5: API Key Encryption
- **As a** user
- **I want to** have my API keys stored securely
- **So that** they are not exposed if someone reads my settings file

**Acceptance Criteria:**
- [ ] API keys encrypted with AES-256-GCM in App Lock and Encrypted modes
- [ ] API keys obfuscated (base64 + reversal) in Open mode
- [ ] Keys decrypted on unlock and held in memory
- [ ] Keys re-encrypted when saved
- [ ] Clear UI indication that keys are protected

#### Story 7.6: Manual Lock
- **As a** user
- **I want to** manually lock the app
- **So that** I can protect my writing when stepping away

**Acceptance Criteria:**
- [ ] "Lock" button in header/menu (when password is set)
- [ ] Clears decryption key from memory
- [ ] Returns to unlock screen
- [ ] Keyboard shortcut (Cmd/Ctrl + L)

#### Story 7.7: Security Mode Migration
- **As a** user
- **I want to** change my security mode
- **So that** I can upgrade or downgrade protection as needed

**Acceptance Criteria:**
- [ ] Migration wizard in settings
- [ ] Progress indicator for batch encryption/decryption
- [ ] Handles large numbers of entries gracefully
- [ ] Rollback on failure (don't leave in inconsistent state)
- [ ] Confirmation dialog with clear warnings

---

## Features - Phase 2 (Future)

### Epic: Gamification & Badges
- Point system for achievements
- Badge collection (streaks, milestones, consistency)
- Personal statistics dashboard
- Writing streaks with fire animation

### Epic: Cross-Entry Analysis
- Weekly/monthly insights
- Trend detection over time
- Theme evolution tracking
- "You've been thinking about X" notifications

### Epic: Data Import/Export
- Import from 750words.com export
- Export to various formats (MD, PDF, JSON)
- Backup/restore functionality

### Epic: Advanced Themes
- Custom theme creator
- Additional preset themes
- Time-based theme switching (dark at night)

### Epic: Analysis Cost Estimation
- Show estimated API cost before running analysis
- Running cost tracker for the month
- Usage statistics

---

## Features - Phase 3+ (Far Future)

### Epic: Native Mobile Apps
- iOS app with local storage (Core Data / Files app integration)
- Android app with local storage
- Optional sync between devices via user's cloud storage (iCloud, Google Drive, Dropbox)

---

## Non-Functional Requirements

### Performance
- Editor typing latency < 16ms
- App load time < 2 seconds
- Autosave completes < 100ms

### Accessibility
- Keyboard navigation throughout
- Screen reader compatible
- Sufficient color contrast in all themes
- Respects prefers-reduced-motion

### Browser Support
- Chrome 86+ (required for File System Access API)
- Edge 86+
- Safari: Limited (no File System Access API - show clear message)
- Firefox: Limited (no File System Access API - show clear message)

### Security
- API keys stored locally only
- No analytics or tracking
- No external requests except AI APIs
- Clear privacy policy

---

## UI/UX Guidelines

### Layout (Desktop)
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Three Pages          [Calendar] [Settings] [Theme]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                    Writing Area                             │
│                                                             │
│                    (Milkdown Editor)                        │
│                                                             │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📝 Session 1 of 2    │   456/750 words   │  ⏱ 8:32 active │
└─────────────────────────────────────────────────────────────┘
```

### Layout (Entry View with Analysis)
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Three Pages          [Calendar] [Settings] [Theme]  │
├────────────────────────┬────────────────────────────────────┤
│                        │                                    │
│   Entry Content        │   Analysis Panel                   │
│   (Read-only)          │   ├─ Summary                       │
│                        │   ├─ Themes: work, goals           │
│                        │   ├─ Sentiment: Positive ████░░    │
│                        │   ├─ Mindset Charts                │
│                        │   ├─ Word Cloud                    │
│                        │   └─ Actions & Questions           │
│                        │                                    │
├────────────────────────┴────────────────────────────────────┤
│  Jan 2, 2026 • Session 1 • 767 words • 13 min              │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests
- Utility functions (word count, time calculations)
- State management logic
- AI response parsing

### Integration Tests
- File System operations
- Editor save/load cycle
- Settings persistence

### E2E Tests
- Full writing session flow
- Theme switching
- Offline behavior

---

## Development Phases

### Phase 1a: Foundation (Week 1-2)
- Project setup (Vite, React, TypeScript, Tailwind)
- File System Access API integration
- Basic Milkdown editor setup
- Autosave implementation
- Basic theme system (dark/light)
- Core crypto utilities (Web Crypto API wrappers)

### Phase 1b: Core Features (Week 3-4)
- Session management
- Real-time stats
- Calendar view
- Entry browser
- All 5 themes

### Phase 1c: Security & AI Integration (Week 5-6)
- Security mode selection UI
- Password setup and unlock screen
- Content encryption (Encrypted mode)
- API key encryption
- Analysis queue system
- Anthropic integration
- OpenAI integration
- Analysis display UI

### Phase 1d: Polish & PWA (Week 7-8)
- Security mode migration wizard
- Manual lock functionality
- PWA configuration
- Offline support
- Error handling
- Accessibility pass
- Performance optimization
- Testing

---

## Resolved Questions

1. ~~**API Key Storage**~~ **RESOLVED**: Three-tier security model (Open/App Lock/Encrypted) with Web Crypto API encryption.

2. ~~**Analysis Cost**~~ **RESOLVED**: Deferred to Phase 2. For MVP, analysis runs without cost estimation.

3. ~~**Editor Width**~~ **RESOLVED**: Configurable in settings (like font size/line height) with a sensible default max-width for readability.

4. ~~**Mobile Support**~~ **RESOLVED**: Out of scope. Chromium desktop browsers only (Chrome, Edge). IndexedDB rejected due to data loss risk (clearing browsing data deletes all entries). Native mobile apps may be considered in far-future phases.

---

## Appendix: AI Prompt Templates

### Entry Analysis Prompt (Anthropic/OpenAI)

```
Analyze the following personal journal entry and provide structured insights.

<entry>
{{ENTRY_CONTENT}}
</entry>

Respond with JSON matching this schema:
{
  "summary": "2-3 sentence summary of the entry",
  "themes": ["array", "of", "main", "themes"],
  "sentiment": {
    "overall": "positive|negative|neutral|mixed",
    "arc": [{"segment": 1, "sentiment": "..."}]
  },
  "mindset": {
    "introvertExtrovert": 0.0-1.0,
    "positiveNegative": 0.0-1.0,
    "certainUncertain": 0.0-1.0,
    "thinkingFeeling": 0.0-1.0
  },
  "timeOrientation": "past|present|future",
  "primaryPerspective": "I|we|you|they",
  "topWords": ["five", "most", "significant", "words"],
  "extractedActions": ["any action items mentioned"],
  "extractedQuestions": ["questions the writer is pondering"]
}

Be empathetic and insightful. This is personal writing meant for self-reflection.
```

---

*Last updated: January 3, 2026*
