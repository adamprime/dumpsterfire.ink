# Dumpster Fire - Development Guide

> Local-first, privacy-focused writing app at dumpsterfire.ink

## Project Overview

Dumpster Fire is a 750words.com-inspired writing app that stores all data locally using the Chrome File System Access API. No servers, no accounts - just writing.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Editor**: Milkdown (ProseMirror-based, Bear-style inline markdown)
- **Styling**: Tailwind CSS v4 (via @tailwindcss/vite plugin)
- **State**: Zustand (with persist middleware)
- **Storage**: File System Access API (Chromium browsers only)
- **AI**: Anthropic Claude API, OpenAI API (user provides keys)
- **Testing**: Vitest (unit), Playwright (E2E)

## Project Structure

```
src/
├── components/       # React components
│   ├── Editor.tsx    # Main writing view with stats
│   ├── MilkdownEditor.tsx  # Milkdown wrapper
│   └── Welcome.tsx   # Folder picker / onboarding
├── hooks/            # Custom React hooks
├── lib/              # Utilities and services
│   ├── filesystem.ts # File System API operations
│   └── crypto.ts     # Web Crypto API (encryption)
├── stores/           # Zustand stores
│   └── appStore.ts   # Global app state
├── styles/           # CSS files
│   └── index.css     # Tailwind + CSS variables
└── types/            # TypeScript types
    └── filesystem.ts # Data schemas
```

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm run test     # Run Vitest unit tests
npm run test:e2e # Run Playwright E2E tests
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
│       └── YYYY-MM-DD-1.meta.json # Entry metadata
├── settings.json                   # App settings
└── analysis-queue.json             # Pending AI analyses
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
- Immediate: on window blur or beforeunload
- Skip if content unchanged

### Editor
- Milkdown with commonmark + gfm presets
- Nord theme as base (customized per app theme)
- Content changes fire markdown listener

### Themes
CSS variables in `:root` and `[data-theme="..."]`:
- `--color-bg`, `--color-surface`, `--color-text`
- `--color-text-muted`, `--color-accent`, `--color-border`

## Testing Guidelines

### Unit Tests (Vitest)
- Test utility functions in isolation
- Mock File System API
- Test Zustand stores

### E2E Tests (Playwright)
- Test full user flows
- Use test folder for file operations
- Clean up after tests

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
