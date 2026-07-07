# AI Assistant Desktop App

A production-ready cross-platform desktop AI assistant built with Electron, React 19, TypeScript, and Vite. Supports OpenAI, Anthropic, Gemini, xAI, OpenRouter, Ollama and custom providers with streaming chat, screen OCR, conversation history, and a prompt library — all stored locally with SQLite.

## Run & Operate

This is a standalone Electron project at `artifacts/desktop-assistant/`. It cannot be previewed inside Replit — users must install and run it on their local machine.

```bash
cd artifacts/desktop-assistant
npm install
npm run dev        # development with hot reload
npm run typecheck  # TypeScript check across main + renderer
npm run build      # production build (outputs to out/)
npm run package    # builds + packages with electron-builder
```

## Stack

- **Runtime:** Electron 31, Node.js 20+
- **Frontend:** React 19, Vite 5, TypeScript 5.5, Tailwind CSS 3
- **State:** Zustand 4
- **Routing:** React Router 6 (HashRouter)
- **Database:** SQLite via better-sqlite3 (synchronous, main process only)
- **AI:** openai SDK, @anthropic-ai/sdk, @google/generative-ai, axios (Ollama/OpenRouter)
- **OCR:** Tesseract.js 5
- **UI:** Framer Motion, Lucide React, React Markdown, rehype-highlight
- **Build/Package:** electron-vite 2, electron-builder 24

## Where Things Live

```
artifacts/desktop-assistant/
├── src/main/           Electron main process
│   ├── database/       SQLite schema, migrations, repositories
│   ├── ipc/            IPC handler registration (window/capture/db/system)
│   ├── services/       OCR, screenshot, hotkeys, tray, region-selector
│   └── windows/        BrowserWindow factories (main + floating)
├── src/preload/        contextBridge exposing all IPC channels to renderer
├── src/renderer/src/   React application
│   ├── components/     Layout, Sidebar, ChatArea, ChatInput, MessageBubble,
│   │                   CommandPalette, FloatingView, Notifications
│   ├── hooks/          useAI, useOCR, useTheme, useKeyboard
│   ├── pages/          Chat, Settings, History, Prompts, OCR
│   ├── providers/      AI provider adapters (openai, anthropic, gemini,
│   │                   xai, openrouter, ollama, custom)
│   ├── services/       ai-service (orchestration), export-service
│   ├── stores/         conversation, provider, settings, ui (Zustand)
│   └── utils/          cn (clsx+twMerge), format (date/bytes/tokens)
└── src/shared/
    └── types.ts        Single source of truth for shared types (main + renderer)
```

## Architecture Decisions

- **IPC via contextBridge:** All main↔renderer communication goes through `window.api`, fully typed via `src/preload/index.d.ts`. No `nodeIntegration`.
- **better-sqlite3 only in main:** SQLite is synchronous and runs only in the Electron main process. IPC handlers bridge to the renderer.
- **Provider registry in renderer:** AI providers live in the renderer process (not main) because they use browser-compatible SDKs (`dangerouslyAllowBrowser: true`). The main process handles only OCR/screenshot via Tesseract/desktopCapturer.
- **HashRouter:** Used instead of BrowserRouter because Electron loads files via `file://` protocol which doesn't support HTML5 history API.
- **Floating window:** A separate `BrowserWindow` loaded with `#floating` hash — the same React bundle detects this and renders `FloatingView` instead of the full app.
- **PostCSS:** Configured via `postcss.config.js` (auto-detected by Vite), not inline in `electron.vite.config.ts`.

## User Preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT add the `desktop-assistant` package to the root `tsconfig.json` references (it is a leaf artifact, not a composite lib).
- Icons in `resources/` are required only for `npm run package`; dev mode works without them.
- `better-sqlite3` and `tesseract.js` are externalized from the Vite bundle (they ship as native Node modules) — do not import them in renderer code.
- When adding new IPC channels: add to `src/shared/types.ts` → `src/preload/index.ts` → `src/main/ipc/*-handlers.ts`.
