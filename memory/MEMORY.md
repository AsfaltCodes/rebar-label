# RebarLabel Project Memory

## Project Overview
Desktop app for creating/printing rebar labels. Tauri v2 + SvelteKit + SQLite + jsPDF.

## Key Paths
- Design doc: `docs/plans/2026-03-02-rebar-label-maker-design.md`
- Implementation plan: `docs/plans/2026-03-03-rebar-label-implementation.md`
- DB schema init: `src-tauri/src/db.rs`
- Tauri commands: `src-tauri/src/commands.rs`
- Frontend DB bridge: `src/lib/db/api.ts` (dual-mode: localStorage dev / Tauri prod)
- Types: `src/lib/db/types.ts`

## Build Environment (Windows)
- Rust toolchain: `stable-x86_64-pc-windows-gnu` (default)
- MinGW: WinLibs installed via winget at `C:\Users\Matei\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin`
- **CRITICAL**: MinGW must be in PATH for cargo build. Use: `export PATH="/c/Users/Matei/AppData/Local/Microsoft/WinGet/Packages/BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe/mingw64/bin:$PATH"`
- Cargo.toml crate-type must be `["rlib"]` only (not cdylib/staticlib) to avoid export ordinal overflow on Windows GNU target
- SQLite DB location: `%APPDATA%/RebarLabel/data.db`

## Implementation Status (as of 2026-03-03)
All 18 tasks COMPLETE. MVP is fully functional.
- Tasks 0-17: Frontend + backend all implemented
- Task 18: Integration test passed (`npx tauri dev` runs cleanly)

## Architecture Notes
- Frontend has dual DB adapter: `LocalDB` (localStorage) for `npm run dev`, `TauriDB` (invoke) for Tauri
- Tauri commands use `State<AppDb>` with `Mutex<Connection>` for thread-safe SQLite access
- JSON fields (fields, field_values, shape_segments) stored as TEXT in SQLite, parsed in TypeScript
- Tauri invoke param names: frontend uses camelCase, Rust uses snake_case (auto-converted)
