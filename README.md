# Dumpster Fire 🔥

> Spill the ink. Light it up. See what remains.

A local-first, privacy-focused writing app inspired by [750words.com](https://750words.com). All your writing stays on your device - no servers, no accounts, no data collection.

**Live at [dumpsterfire.ink](https://dumpsterfire.ink)**

## Features

- **Local-first storage** - Uses Chrome File System Access API to save directly to your chosen folder
- **Distraction-free editor** - Milkdown with inline markdown rendering and typewriter scrolling
- **Multiple sessions per day** - Write whenever inspiration strikes
- **Real-time stats** - Word count, active time, and WPM tracking
- **5 themes** - Dark, light, sepia, matrix (green terminal), parchment (handwritten)
- **Autosave** - 2-second debounce, never lose your work
- **"What Remains" AI analysis** - Hit your goal, strike the match, see insights emerge from the ashes
- **PWA support** - Install as a standalone app, works offline
- **Security options** - Open, App Lock (password), or Encrypted modes

## The Flow

1. **Write** - Set a word goal (default 750) and start typing
2. **Hit your goal** - Sparks animation celebrates your achievement  
3. **Strike the match** - A rising inferno of embers engulfs the screen
4. **What Remains** - Your entry is analyzed, revealing themes, mood, and insights
5. **Rekindle** - Made changes? Re-run the analysis anytime

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in Chrome or Edge, select a folder, and start writing.

## Browser Support

Requires a Chromium-based browser (Chrome 86+, Edge 86+) for File System Access API. Safari and Firefox are not supported.

## Tech Stack

- React 18 + TypeScript + Vite
- Milkdown (ProseMirror-based editor)
- Tailwind CSS v4
- Zustand for state management
- Web Crypto API for encryption
- Anthropic Claude / OpenAI for AI analysis (bring your own keys)
- Vitest + Playwright for testing

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build  
npm run preview   # Preview production build
npm run test      # Run unit tests (91 tests)
npm run test:e2e  # Run E2E tests
npm run typecheck # TypeScript check
npm run lint      # ESLint
```

## Data Storage

All data is stored in your selected folder:

```
your-folder/
├── entries/
│   └── 2026/01/
│       ├── 2026-01-03-1.md        # Entry content (markdown)
│       └── 2026-01-03-1.meta.json # Metadata + analysis
├── settings.json                   # App preferences
```

## Documentation

- [AGENTS.md](./AGENTS.md) - Development guide for contributors and AI agents
- [SPEC.md](./SPEC.md) - Full product specification

## License

[Elastic License 2.0](./LICENSE) - Free to use, modify, and self-host. Cannot be offered as a managed service.
