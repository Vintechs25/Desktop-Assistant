---
name: Electron Desktop App
description: Key architectural decisions and gotchas for the desktop-assistant Electron project.
---

# Electron Desktop Assistant — Durable Notes

## Project location
`artifacts/desktop-assistant/` — standalone pnpm package, NOT in the root tsconfig references (leaf artifact).

## Cannot run in Replit preview
Electron is a native desktop app. The user must `cd artifacts/desktop-assistant && npm install && npm run dev` on their own machine.

## Critical wiring rules
- Any new IPC channel must be added in THREE places in order: `src/shared/types.ts` → `src/preload/index.ts` → `src/main/ipc/*-handlers.ts`
- `capture:screen` returns a **full data URL** (`data:image/png;base64,...`) — never add the prefix again in renderer code
- Main→renderer push events (global shortcuts): main sends via `mainWindow.webContents.send('app:<event>')`, renderer listens via `window.api.onMessage('app:<event>', cb)`. Channel names must match exactly — this was the source of a bug with `app:openCommandPalette` vs `app:commandPalette`.

## Provider storage
Providers stored in settings DB under the key `providerConfigs` (JSON array). NOT in the typed `Settings` shape — accessed via `(settings as Record<string, unknown>)['providerConfigs']`. See `provider-store.ts`.

## better-sqlite3 is main-process only
Never import `better-sqlite3` or `tesseract.js` in renderer code. Both are externalized in `electron.vite.config.ts`. OCR and DB calls must go through IPC.

## PostCSS
Configured via `postcss.config.js` — Vite picks it up automatically. Do NOT add `css.postcss` block to `electron.vite.config.ts` (caused `require()` ESM errors).

**Why:** electron-vite config is TypeScript ESM; `require()` for plugins fails at build time.

## tsconfig structure
- `tsconfig.node.json` → extends `@electron-toolkit/tsconfig/tsconfig.node.json`, covers main + preload
- `tsconfig.web.json` → extends `@electron-toolkit/tsconfig/tsconfig.web.json`, covers renderer
- Root `tsconfig.json` is just a solution file pointing to both
