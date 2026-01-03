# Dumpster Fire

> Where your messy thoughts go to burn bright

A local-first, privacy-focused writing app inspired by 750words.com. All your writing stays on your device - no servers, no accounts, no data collection.

## Features

- **Local-first storage** - Uses Chrome File System Access API to save directly to your chosen folder
- **Distraction-free writing** - Clean Milkdown editor with inline markdown rendering
- **Multiple sessions per day** - Write whenever inspiration strikes
- **Real-time stats** - Word count, active time, and WPM tracking
- **Dark/light themes** - More themes coming soon
- **Autosave** - Never lose your work

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in Chrome or Edge, select a folder, and start writing.

## Browser Support

Requires a Chromium-based browser (Chrome 86+, Edge 86+) for File System Access API.

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run test      # Run unit tests
npm run test:e2e  # Run E2E tests
npm run typecheck # TypeScript check
```

## License

MIT
