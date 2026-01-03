# Dumpster Fire - Development Guide

> Local-first, privacy-focused writing app at dumpsterfire.ink

## Project Overview

Dumpster Fire is a 750words.com-inspired writing app that stores all data locally using the Chrome File System Access API. No servers, no accounts - just writing. The core concept: "Spill the ink, light it up, see what remains."

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite + vite-plugin-pwa
- **Editor**: Milkdown (ProseMirror-based, Bear-style inline markdown)
- **Styling**: Tailwind CSS v4 (via @tailwindcss/vite plugin)
- **State**: Zustand (with persist middleware)
- **Storage**: File System Access API (Chromium browsers only)
- **AI**: Anthropic Claude API, OpenAI API (user provides keys)
- **Animations**: canvas-confetti for sparks/fire effects
- **Testing**: Vitest (unit), Playwright (E2E)

## Project Structure

```
src/
├── components/          # React components
│   ├── Editor.tsx       # Main writing view with stats, split view, typewriter scroll
│   ├── MilkdownEditor.tsx   # Milkdown wrapper with typewriter mode
│   ├── Welcome.tsx      # Folder picker / onboarding
│   ├── Calendar.tsx     # Monthly calendar for entry navigation
│   ├── EntryBrowser.tsx # List view of all entries with search
│   ├── Settings.tsx     # App settings panel (scrollable)
│   ├── WhatRemains.tsx  # Analysis panel (stats + AI insights + Rekindle)
│   ├── SparksAnimation.tsx  # Ember animation on goal reached
│   ├── FireAnimation.tsx    # Rising inferno (3-wave confetti burst)
│   ├── QuillLoader.tsx  # Loading animation for AI analysis
│   ├── SaveIndicator.tsx    # Save state indicator (dirty/saving/saved)
│   ├── ApiKeyConfig.tsx # API key management
│   ├── PasswordSetup.tsx    # Security password setup
│   └── UnlockScreen.tsx # Password unlock screen
├── hooks/               # Custom React hooks
│   └── useWritingStats.ts   # Timer, WPM tracking
├── lib/                 # Utilities and services
│   ├── filesystem.ts    # File System API operations
│   ├── crypto.ts        # Web Crypto API (encryption)
│   ├── analysis.ts      # AI analysis (Anthropic/OpenAI) - warm, supportive tone
│   ├── calendar.ts      # Calendar utilities
│   └── entries.ts       # Entry browsing utilities
├── stores/              # Zustand stores
│   ├── appStore.ts      # Global app state (persisted)
│   └── securityStore.ts # Session security state
├── styles/              # CSS files
│   └── index.css        # Tailwind + CSS variables + 5 themes
├── types/               # TypeScript types
│   └── filesystem.ts    # Data schemas
└── test/                # Test setup
    └── setup.ts         # Vitest setup with testing-library
```

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build (includes PWA service worker)
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm run test     # Run Vitest unit tests
npm run test:e2e # Run Playwright E2E tests
npm run typecheck # TypeScript check
```

## Development Workflow

### TDD Approach
1. Write failing test first
2. Implement minimal code to pass
3. Refactor while keeping tests green

### File Naming
- Components: PascalCase (`Editor.tsx`)
- Utilities: camelCase (`filesystem.ts`)
- Tests: `*.test.ts` for unit, `*.spec.ts` for E2E

### State Management
- Use Zustand stores for global state
- Local component state for UI-only concerns
- File system is source of truth for entries

## Data Storage

All data stored in user-selected folder:

```
/user-folder/
├── entries/
│   └── YYYY/MM/
│       ├── YYYY-MM-DD-1.md        # Entry content
│       └── YYYY-MM-DD-1.meta.json # Entry metadata + analysis
├── settings.json                   # App settings
```

## Security Tiers

| Mode | Password | Files | API Keys |
|------|----------|-------|----------|
| Open | No | Plain `.md` | Obfuscated |
| App Lock | Yes | Plain `.md` | Encrypted |
| Encrypted | Yes | `.md.enc` | Encrypted |

All encryption uses Web Crypto API (AES-256-GCM, PBKDF2 key derivation).

## Browser Support

**Required**: Chromium-based browsers (Chrome 86+, Edge 86+)
- File System Access API not available in Safari/Firefox

## Key Implementation Notes

### Autosave
- Debounced: 2 seconds after last keystroke
- Immediate: on window blur
- Skip if content unchanged
- Saves `writingTimeSeconds` to metadata for stats

### Editor
- Milkdown with commonmark + gfm presets
- Nord theme as base (customized per app theme)
- Typewriter scrolling keeps cursor at 40% from top
- Uses refs for callbacks to prevent editor recreation

### Themes
CSS variables in `:root` and `[data-theme="..."]`:
- `--color-bg`, `--color-surface`, `--color-text`
- `--color-text-muted`, `--color-accent`, `--color-border`
- `--font-editor` for theme-specific fonts

Available themes: dark, light, sepia, matrix, parchment

### "What Remains" Flow (Goal Completion)
The core UX when a user hits their word goal:

1. **Goal reached** → `SparksAnimation` triggers (embers rise, 5 seconds)
2. **Button appears** → "Strike the match" fixed at bottom center with glow
3. **User clicks** → `FireAnimation` plays (3-wave rising inferno, ~2.5s)
4. **Split view opens** → Entry masked on left, `WhatRemains` panel on right
5. **AI analysis** → `QuillLoader` shows while fetching, then displays results
6. **Rekindle** → If content changed since analysis, button appears to re-run
7. **Click masked entry** → Returns to full-width editor

### AI Analysis Tone
The AI prompt is designed to be warm, supportive, and encouraging - like a good friend reflecting on your writing. It celebrates the act of writing itself, uses second person ("you/your"), and avoids clinical or judgmental language.

### PWA Support
- Service worker via vite-plugin-pwa (Workbox)
- Caches all assets for offline use
- Google Fonts cached for 1 year
- Auto-update registration
- Installable on desktop and mobile

## Testing

### Setup
- **Framework**: Vitest with jsdom environment
- **React Testing**: @testing-library/react + @testing-library/jest-dom
- **E2E**: Playwright (Chromium only - File System API requirement)
- **Setup file**: `src/test/setup.ts` loads jest-dom matchers

### Running Tests
```bash
npm run test             # Run all unit tests in watch mode
npm run test -- --run    # Run once (CI mode)
npm run test:e2e         # Run Playwright E2E tests
npm run typecheck        # TypeScript check (run before committing)
```

### Current Test Coverage (91 tests)

| Area | File | Tests | What's Tested |
|------|------|-------|---------------|
| **Crypto** | `crypto.test.ts` | 17 | Encryption, decryption, hashing, key derivation |
| **Filesystem** | `filesystem.test.ts` | 9 | Word counting, date formatting |
| **Calendar** | `calendar.test.ts` | 8 | Month generation, date utilities |
| **Entries** | `entries.test.ts` | 9 | Entry listing, search, preview |
| **Writing Stats** | `useWritingStats.test.ts` | 6 | Timer, WPM calculation |
| **Themes** | `themes.test.ts` | 2 | Theme definitions |
| **Sparks** | `SparksAnimation.test.tsx` | 5 | Confetti trigger, colors |
| **Fire** | `FireAnimation.test.tsx` | 5 | 3-wave confetti, timing |
| **Quill Loader** | `QuillLoader.test.tsx` | 5 | Render, animations |
| **What Remains** | `WhatRemains.test.tsx` | 19 | Stats, analysis, Rekindle button |
| **Save Indicator** | `SaveIndicator.test.tsx` | 6 | Dirty/saving/saved states |

### Writing New Tests

**Component tests** - use React Testing Library:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from './MyComponent'

it('does something', () => {
  render(<MyComponent prop="value" />)
  expect(screen.getByText('Expected')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button'))
})
```

**Async/timer tests** - use fake timers with act():
```typescript
import { act } from 'react'

vi.useFakeTimers()
render(<AnimatedComponent />)
await act(async () => {
  vi.advanceTimersByTime(1000)
})
vi.useRealTimers()
```

**Mocking modules**:
```typescript
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))
```

### What to Test
- ✅ Utility functions (pure logic)
- ✅ Component rendering and interactions
- ✅ State changes and callbacks
- ✅ Animation triggers and completion
- ⚠️ File System API (mock in unit tests, real in E2E)
- ⚠️ External APIs (mock responses)

## Common Patterns

### Reading/Writing Files
```typescript
import { getOrCreateEntry, saveEntry } from '@/lib/filesystem'

// Load today's entry
const { content, metadata } = await getOrCreateEntry(folderHandle)

// Save entry
await saveEntry(folderHandle, date, session, content, metadata)
```

### Using App Store
```typescript
import { useAppStore } from '@/stores/appStore'

const { folderHandle, theme, setTheme } = useAppStore()
```

### Preventing Component Recreation
When passing callbacks that depend on changing props (like `typewriterMode`), use refs to prevent unnecessary recreation:
```typescript
const typewriterModeRef = useRef(typewriterMode)
typewriterModeRef.current = typewriterMode

const callback = useCallback(() => {
  if (typewriterModeRef.current) { /* ... */ }
}, []) // Empty deps - uses ref
```

## Git Workflow

- `main` branch is production
- Feature branches: `feature/description`
- Commits: conventional commits style preferred
- Run tests before pushing

## Resources

- [SPEC.md](./SPEC.md) - Full product specification
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [Milkdown Docs](https://milkdown.dev/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
