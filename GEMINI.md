# GEMINI.md - EisenLabel (lockIn)

## Project Overview
**EisenLabel** (internally referred to as `lockIn`) is a specialized desktop application for generating and managing rebar (reinforcing bar) labels used in construction and engineering. It allows users to define label templates, manage jobs, and generate print-ready PDF documents with accurate geometric shapes and engineering dimensions.

### Core Technologies
- **Frontend**: [SvelteKit](https://kit.svelte.dev/) with [Svelte 5](https://svelte.dev/).
- **Desktop Wrapper**: [Tauri 2](https://v2.tauri.app/) (Rust).
- **Persistence**: SQLite (via `rusqlite` in Rust) for production, with a `localStorage` fallback for web-only development.
- **Document Generation**: `jsPDF` for PDF labels and `exceljs` for data exports.
- **State Management**: Custom Svelte stores with debounced auto-save logic.

## Project Structure
- `src/lib/db/`: Database abstraction layer (`api.ts`) and TypeScript types (`types.ts`).
- `src/lib/stores/`: Application state (jobs, labels, settings, UI state).
- `src/lib/layout/`: Engine for calculating label positions on physical pages (A4, A3, etc.).
- `src/lib/shapes/`: Geometry logic for rendering rebar shapes and placing dimension labels.
- `src/lib/pdf/`: Logic for drawing labels, logos, and shapes into PDF documents.
- `src-tauri/src/`: Rust backend, including SQLite schema definitions (`db.rs`) and IPC command handlers (`commands.rs`).
- `docs/plans/`: Detailed design and implementation plans for core features.

## Building and Running
### Development
- **Web only**: `npm run dev` (uses LocalStorage).
- **Desktop (Tauri)**: `npx tauri dev` (requires Rust environment).

### Production Build
- **Frontend**: `npm run build`
- **Tauri App**: `npm run tauri:build`

### Testing & Linting
- **Type Check**: `npm run check`
- **Lint**: `npm run lint` (if configured, otherwise use standard Svelte/TS linting).

## Development Conventions
- **Persistence**: All changes to labels and jobs should be persisted via the stores (e.g., `jobStore.ts`), which handle debounced calls to the `db` API.
- **Runes**: While using Svelte 5, the project currently employs Svelte 4-style stores for shared state. New components should prefer Svelte 5 runes (`$state`, `$derived`, `$effect`) where appropriate.
- **Geometry**: Rebar shapes use a "CNC-style" relative angle convention (bend angles) rather than absolute coordinate angles.
- **Database Migrations**: Managed manually in `src-tauri/src/db.rs` using `ALTER TABLE` statements within the `AppDb::init` function.

## Key Files for Reference
- `src/lib/db/api.ts`: The bridge between frontend and persistence.
- `src/lib/stores/jobStore.ts`: Central hub for label and job state.
- `src/lib/shapes/renderer.ts`: Core geometry and SVG path generation logic.
- `src/lib/pdf/generator.ts`: The "source of truth" for how labels are printed.
- `src-tauri/src/db.rs`: SQLite schema and migration logic.
