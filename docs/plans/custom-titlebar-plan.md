# Plan: Merge MenuBar with OS Window Decorations

## What
Remove native OS title bar. Add drag region + window controls (—, □, ✕) to MenuBar.

## Steps

### 1. `tauri.conf.json` — disable native decorations
Add `"decorations": false` to the window config.

### 2. `capabilities/default.json` — add window permissions
Add `"core:window:default"` and `"core:window:allow-start-dragging"`.

### 3. `lib.rs` — fix broken duplicate code
Gemini left two `run()` functions. Remove the orphaned first one (lines 7-20), keep the complete second one (lines 107-157) and `apply_custom_titlebar`.

### 4. `MenuBar.svelte` — add drag region + window controls
- Add `data-tauri-drag-region` on the menubar so empty space is draggable
- Add minimize, maximize, close buttons on the far right
- Import `getCurrentWindow` from `@tauri-apps/api/window`

## Files Changed
1. `src-tauri/tauri.conf.json`
2. `src-tauri/capabilities/default.json`
3. `src-tauri/src/lib.rs`
4. `src/lib/components/MenuBar.svelte`
