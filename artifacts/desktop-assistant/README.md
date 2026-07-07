# AI Assistant

A production-ready cross-platform desktop AI assistant built with Electron, React 19, TypeScript, and Vite.

---

## Features

- **Multi-provider AI** — OpenAI, Anthropic, Google Gemini, xAI (Grok), OpenRouter, Ollama (local), and any OpenAI-compatible API
- **Streaming responses** — Real-time token streaming with abort support
- **Screen capture & OCR** — Capture full screen, active window, or selected region; extract text with Tesseract.js
- **Rich chat UI** — Markdown rendering, syntax-highlighted code blocks with copy, tables, images, file attachments
- **Conversation management** — Folders, search, pin, archive, export (JSON / Markdown / plain text)
- **Prompt library** — Built-in and custom reusable prompts with categories, favorites, and usage tracking
- **Floating window** — Always-on-top compact assistant window
- **Command palette** — `Cmd/Ctrl+K` to quickly access any feature
- **Local SQLite database** — All data stored on-device, no cloud required
- **Dark / light / system theme**
- **Global keyboard shortcuts** (configurable)
- **Plugin-ready architecture**

---

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ (20 LTS recommended) | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `corepack enable && corepack prepare pnpm@latest --activate` |
| Python | 3.x | Required only if no prebuilt binary exists for your platform |

> **Windows users:** Python and Visual Studio Build Tools are only needed when
> `@electron/rebuild` cannot download a prebuilt `better-sqlite3` binary for your
> Electron version. In practice, prebuilt binaries exist for all common
> Windows x64 configurations — `pnpm install` should succeed without them.

### Installation (all platforms)

```bash
# Navigate into the package directory (important — do NOT install from the
# repository root, which has Linux-only workspace overrides)
cd artifacts/desktop-assistant

# Install dependencies and rebuild native modules for Electron
# (downloads prebuilt binaries; compilation fallback only if none exist)
pnpm install          # or: npm install

# Start in development mode (opens the Electron window)
pnpm dev              # or: npm run dev
```

### Windows Quick-Start (PowerShell)

```powershell
# From the repo root:
cd artifacts\desktop-assistant
pnpm install
pnpm dev
```

If `pnpm install` fails with a native module error:
1. Install Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
2. Select "Desktop development with C++" workload
3. Re-run `pnpm install`

### First Run

1. Open **Settings → Providers**
2. Add your API key for at least one provider (e.g. OpenAI)
3. Select a default model
4. Start chatting

---

## Usage

### Keyboard Shortcuts (defaults)

| Action | Shortcut |
|--------|----------|
| Toggle window | `Ctrl+Shift+A` |
| New conversation | `Ctrl+N` |
| Command palette | `Ctrl+K` |
| Capture full screen | `Ctrl+Shift+S` |
| Capture region | `Ctrl+Shift+R` |
| Send message | `Enter` |
| New line in input | `Shift+Enter` |

All shortcuts are configurable in **Settings → Shortcuts**.

### Screen Capture & OCR

- Click the camera icon in the chat input, or use the global shortcut
- Choose **Full Screen**, **Select Region**, or visit the **OCR** page for history
- Extracted text can be sent directly to the AI or copied to clipboard

### Prompt Library

- Visit the **Prompts** page to browse built-in templates
- Click any prompt to populate the chat input
- Add your own prompts with custom categories and tags

### Floating Window

- Toggle via tray icon or `Ctrl+Shift+A`
- Compact always-on-top mode — stays visible while you work in other apps

---

## Configuration

Settings are stored locally in your OS user-data directory:
- **macOS:** `~/Library/Application Support/AI Assistant/assistant.db`
- **Windows:** `%APPDATA%\AI Assistant\assistant.db`
- **Linux:** `~/.config/AI Assistant/assistant.db`

---

## Supported AI Providers

| Provider | Models | Notes |
|----------|--------|-------|
| OpenAI | GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo | Vision supported |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku | |
| Google Gemini | Gemini 1.5 Pro, Flash | Vision supported |
| xAI | Grok Beta, Grok Vision Beta | |
| OpenRouter | 200+ models | One API key, many models |
| Ollama | Any local model | No API key required |
| Custom | Any OpenAI-compatible API | Self-hosted, LM Studio, etc. |

---

## Development

```bash
# Development with hot reload
npm run dev

# Type-check all packages
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

### Project Structure

```
src/
├── main/               # Electron main process
│   ├── database/       # SQLite schema, migrations, repositories
│   ├── ipc/            # IPC handler registration
│   ├── services/       # OCR, screenshot, hotkeys, tray
│   └── windows/        # BrowserWindow factories
├── preload/            # Context bridge (exposes IPC to renderer)
├── renderer/src/       # React application
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Route-level page components
│   ├── providers/      # AI provider adapters
│   ├── services/       # AI service orchestration, export
│   ├── stores/         # Zustand state stores
│   └── utils/          # Utilities (cn, format, etc.)
└── shared/
    └── types.ts        # Shared TypeScript types (main + renderer)
```

---

## Building for Production

```bash
# Build for current platform
npm run package

# Cross-platform (requires platform-specific runners)
npm run package:win     # Windows (NSIS + portable)
npm run package:mac     # macOS (DMG)
npm run package:linux   # Linux (AppImage + deb)
```

> Add icons to `resources/` before packaging. See `resources/README.md`.

---

## Adding a New AI Provider

1. Create `src/renderer/src/providers/my-provider.ts` extending `BaseProvider`
2. Implement `chat()`, `stream()`, and `listModels()`
3. Register it in `src/renderer/src/providers/index.ts`
4. Add the new `ProviderType` to `src/shared/types.ts`
5. Add UI entry in `src/renderer/src/pages/SettingsPage.tsx`

---

## License

MIT
