# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EisenLabel** — a desktop app for creating and printing rebar labels. Built with SvelteKit + Svelte 5 frontend, Tauri 2 (Rust) backend, SQLite persistence, and jsPDF for PDF output.

## Commands

```bash
npm run dev              # Vite dev server on localhost:5173
npm run build            # Production build to ./build/
npm run check            # TypeScript + Svelte type checking
npm run check:watch      # Watch mode type checking
npm run tauri:build      # Package desktop app (requires Rust toolchain)
```

No test framework is configured. Type checking (`npm run check`) is the primary validation.

## Architecture

### Frontend (`src/`)

**Screen-based routing** — no SvelteKit dynamic routes. `currentScreen` store switches between `'editor'`, `'templates'`, `'jobs'` views in `+page.svelte`. Root layout (`+layout.svelte`) provides MenuBar, TopBar, StatusBar, and modal management.

**State management** — Svelte writable/derived stores in `src/lib/stores/`. Stores export action functions (e.g., `loadJob`, `createNewLabel`). Changes debounce 500ms before DB persistence.

**Dual-mode database** (`src/lib/db/api.ts`) — auto-detects environment via `__TAURI_INTERNALS__`:
- Dev: `LocalDB` uses localStorage
- Prod: `TauriDB` invokes Rust commands via IPC

**Key directories:**
- `components/` — Svelte 5 components (use `$props()`, `$state`, `$derived`)
- `components/ui/` — reusable primitives (Modal, Toast, Button, Icon, ConfirmDialog)
- `stores/` — jobStore, settingsStore, i18n, uiStore, themeStore, saveStatusStore, toastStore
- `db/` — database API adapter and TypeScript interfaces
- `pdf/generator.ts` — jsPDF label rendering
- `shapes/` — rebar shape presets and SVG path renderer (segments with length + angle)
- `layout/engine.ts` — page layout calculation

### Backend (`src-tauri/`)

- `commands.rs` — 16 Tauri command handlers (CRUD for templates, jobs, labels, settings)
- `db.rs` — SQLite schema init, `AppDb` struct (thread-safe Mutex)
- `lib.rs` — Tauri builder setup, plugin registration

SQLite DB location: `%APPDATA%/EisenLabel/` (Windows), `~/.config/` (Linux/macOS). JSON fields stored as TEXT.

### Data Model

Core entities: **Template** (layout config + field definitions) → **Job** (template instance with client info) → **Label** (field values, shape segments, copies). **FieldDef** has scope (`job`|`label`) and source (`manual`|`total_length`|`client_name`).

## Conventions

- **Styling**: Pure CSS with design tokens in `src/app.css` (spacing scale, color palette, z-index layers). No CSS framework.
- **i18n**: English + Romanian in `src/lib/stores/i18n.ts`. Translation function: `$_`.
- **Themes**: `'system'|'light'|'dark'` via `data-theme` attribute + CSS custom properties.
- **TypeScript**: Strict mode. Path aliases via SvelteKit (`$lib`, `$app`).
- **Components**: PascalCase naming. Svelte 5 runes syntax.
- **No linter/formatter configured** — follow existing code style.
