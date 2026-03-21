# RebarLabel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production Tauri + Svelte desktop app for creating, previewing, and printing rebar labels.

**Architecture:** Tauri v2 (Rust shell) + SvelteKit frontend + SQLite (via better-sqlite3 or Tauri SQL plugin) + jsPDF for PDF generation. Single render pipeline: Svelte components render label previews as HTML/SVG, jsPDF reuses same logic for PDF output. Tauri handles file dialogs and native window only.

**Tech Stack:** Tauri v2, SvelteKit, TypeScript, SQLite, jsPDF, SVG, Inter font (bundled)

**Prerequisites:** Node.js v22 (installed), Rust toolchain (NOT installed -- Task 0 installs it)

---

### Task 0: Install Rust Toolchain

Tauri requires Rust. It is not currently installed on this machine.

**Step 1: Install Rust via rustup**

Run: Download and run rustup-init. On Windows, the recommended approach is:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

After install, add to PATH:
```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

**Step 2: Verify installation**

Run: `rustc --version && cargo --version`
Expected: rustc 1.x.x and cargo 1.x.x

**Step 3: Install Tauri CLI prerequisites (Windows)**

Tauri v2 on Windows requires the WebView2 runtime (comes with Windows 10/11) and Visual Studio C++ Build Tools. Check if MSVC is available:
```bash
where cl.exe 2>nul || echo "Need VS Build Tools"
```

If missing, this must be installed manually by the user.

**Step 4: Commit nothing** -- this is environment setup only.

---

### Task 1: Scaffold Tauri + SvelteKit Project

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`
- Create: `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/app.html`

**Step 1: Create SvelteKit project**

```bash
cd E:/lockIn
npm create svelte@latest . -- --template skeleton --types typescript
```

Select: Skeleton project, TypeScript, no extras.

**Step 2: Install dependencies**

```bash
npm install
```

**Step 3: Add Tauri v2**

```bash
npm install -D @tauri-apps/cli@latest
npx tauri init
```

During init:
- App name: RebarLabel
- Window title: RebarLabel
- Dev server URL: http://localhost:5173
- Dev command: npm run dev
- Build command: npm run build

**Step 4: Install Tauri API package**

```bash
npm install @tauri-apps/api@latest
```

**Step 5: Add adapter-static for Tauri**

```bash
npm install -D @sveltejs/adapter-static
```

Update `svelte.config.js` to use adapter-static:
```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' })
  }
};
```

**Step 6: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server at http://localhost:5173

**Step 7: Verify Tauri builds**

Run: `npx tauri dev`
Expected: Native window opens with SvelteKit content

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri v2 + SvelteKit project"
```

---

### Task 2: SQLite Database Layer (Tauri Side)

**Files:**
- Create: `src-tauri/src/db.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add rusqlite dependency**

In `src-tauri/Cargo.toml`, add:
```toml
[dependencies]
rusqlite = { version = "0.31", features = ["bundled"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
dirs = "5"
```

**Step 2: Create db.rs with schema initialization**

Create `src-tauri/src/db.rs` with:
- `init_db()` function that creates `%APPDATA%/RebarLabel/data.db`
- Creates tables: `templates`, `jobs`, `labels`, `settings`
- Inserts default settings if they don't exist
- Schema matches the design doc data model exactly

**Step 3: Create Tauri commands in main.rs**

CRUD commands for each entity:
- Templates: `list_templates`, `get_template`, `create_template`, `update_template`, `delete_template`
- Jobs: `list_jobs`, `get_job`, `create_job`, `update_job`, `delete_job`
- Labels: `list_labels`, `get_label`, `create_label`, `update_label`, `delete_label`
- Settings: `get_setting`, `set_setting`, `get_all_settings`

Each command is a `#[tauri::command]` that takes params and returns JSON.

**Step 4: Register commands in main.rs**

```rust
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_templates, get_template, create_template, update_template, delete_template,
            list_jobs, get_job, create_job, update_job, delete_job,
            list_labels, get_label, create_label, update_label, delete_label,
            get_setting, set_setting, get_all_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 5: Verify build compiles**

Run: `cd src-tauri && cargo build`
Expected: Compiles without errors

**Step 6: Commit**

```bash
git add src-tauri/
git commit -m "feat: add SQLite database layer with CRUD commands"
```

---

### Task 3: Frontend Database Bridge (TypeScript)

**Files:**
- Create: `src/lib/db/templates.ts`
- Create: `src/lib/db/jobs.ts`
- Create: `src/lib/db/labels.ts`
- Create: `src/lib/db/settings.ts`
- Create: `src/lib/db/types.ts`

**Step 1: Create TypeScript types**

`src/lib/db/types.ts`:
```typescript
export interface FieldDef {
  label: string;
  field_type: 'text' | 'number';
  default_value: string;
  font_size: number;
  bold: boolean;
}

export interface Template {
  id: number;
  name: string;
  label_width_mm: number;
  label_height_mm: number;
  logo_enabled: boolean;
  fields: FieldDef[];
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: number;
  name: string;
  source_template_id: number;
  fields: FieldDef[];
  label_width_mm: number;
  label_height_mm: number;
  logo_enabled: boolean;
  page_size: string;
  page_width_mm: number;
  page_height_mm: number;
  page_orientation: 'portrait' | 'landscape';
  created_at: string;
  updated_at: string;
}

export interface Segment {
  length: number;
  angle: number;
}

export interface Label {
  id: number;
  job_id: number;
  field_values: Record<string, string>;
  shape_preset: string | null;
  shape_segments: Segment[];
  copies: number;
  sort_order: number;
}

export interface Settings {
  logo_image_path: string;
  default_page_size: string;
  default_template_id: string;
  company_name: string;
  margin_top_mm: string;
  margin_bottom_mm: string;
  margin_left_mm: string;
  margin_right_mm: string;
  label_gap_mm: string;
}
```

**Step 2: Create Tauri invoke wrappers for each entity**

Each file wraps `@tauri-apps/api/core` invoke calls with proper typing.
Example `src/lib/db/templates.ts`:
```typescript
import { invoke } from '@tauri-apps/api/core';
import type { Template, FieldDef } from './types';

export async function listTemplates(): Promise<Template[]> { ... }
export async function getTemplate(id: number): Promise<Template> { ... }
export async function createTemplate(name: string, ...): Promise<Template> { ... }
export async function updateTemplate(id: number, ...): Promise<Template> { ... }
export async function deleteTemplate(id: number): Promise<void> { ... }
```

**Step 3: Commit**

```bash
git add src/lib/db/
git commit -m "feat: add TypeScript DB bridge with types and invoke wrappers"
```

---

### Task 4: Svelte Stores (Application State)

**Files:**
- Create: `src/lib/stores/jobStore.ts`
- Create: `src/lib/stores/uiStore.ts`
- Create: `src/lib/stores/settingsStore.ts`

**Step 1: Create job store**

`src/lib/stores/jobStore.ts`:
- Writable store for `currentJob: Job | null`
- Writable store for `labels: Label[]`
- Writable store for `selectedLabelId: number | null`
- Derived store `selectedLabel` from labels + selectedLabelId
- Functions: `loadJob(id)`, `addLabel()`, `updateLabel(id, changes)`, `deleteLabel(id)`, `saveJob()`
- Auto-save with 500ms debounce on label changes

**Step 2: Create UI store**

`src/lib/stores/uiStore.ts`:
- Writable store for `currentScreen: 'editor' | 'templates' | 'settings'`
- Writable store for `currentPage: number` (preview pagination)

**Step 3: Create settings store**

`src/lib/stores/settingsStore.ts`:
- Loads settings from DB on init
- Writable store with save-on-change

**Step 4: Commit**

```bash
git add src/lib/stores/
git commit -m "feat: add Svelte stores for job, UI, and settings state"
```

---

### Task 5: Shape System (SVG Rendering)

**Files:**
- Create: `src/lib/shapes/presets.ts`
- Create: `src/lib/shapes/renderer.ts`
- Create: `src/lib/shapes/ShapePreview.svelte`

**Step 1: Create shape presets**

`src/lib/shapes/presets.ts`:
```typescript
import type { Segment } from '$lib/db/types';

export type PresetName = 'straight' | 'l-shape' | 'u-shape' | 'z-shape' | 'stirrup' | 'triangle' | 'hook' | 'custom';

export function getPresetSegments(preset: PresetName): Segment[] {
  switch (preset) {
    case 'straight': return [{ length: 1000, angle: 0 }];
    case 'l-shape': return [{ length: 500, angle: 90 }, { length: 300, angle: 0 }];
    case 'u-shape': return [{ length: 300, angle: 90 }, { length: 500, angle: 90 }, { length: 300, angle: 0 }];
    case 'z-shape': return [{ length: 300, angle: -90 }, { length: 500, angle: 90 }, { length: 300, angle: 0 }];
    case 'stirrup': return [
      { length: 350, angle: 90 }, { length: 250, angle: 90 },
      { length: 350, angle: 90 }, { length: 250, angle: 90 },
    ];
    case 'triangle': return [
      { length: 300, angle: 120 }, { length: 300, angle: 120 }, { length: 300, angle: 0 },
    ];
    case 'hook': return [{ length: 500, angle: 0 }, { length: 50, angle: 180 }];
    case 'custom': return [];
  }
}
```

**Step 2: Create SVG renderer**

`src/lib/shapes/renderer.ts`:
- Function `segmentsToSvgPath(segments: Segment[]): string` -- converts segments to SVG path d attribute
- Function `segmentsToPoints(segments: Segment[]): {x,y}[]` -- for dimension labels
- Function `calculateBounds(segments): {minX, minY, maxX, maxY}` -- for viewBox
- Handles closed shapes (start ~= end)
- Handles hook arcs

**Step 3: Create ShapePreview Svelte component**

`src/lib/shapes/ShapePreview.svelte`:
- Props: `segments: Segment[]`, `width`, `height`
- Renders SVG with auto-scaling viewBox
- Shows dimension labels alongside segments

**Step 4: Commit**

```bash
git add src/lib/shapes/
git commit -m "feat: add shape system with presets, SVG renderer, and preview component"
```

---

### Task 6: Page Layout Engine

**Files:**
- Create: `src/lib/layout/engine.ts`

**Step 1: Create layout engine**

`src/lib/layout/engine.ts`:
```typescript
export interface PageLayout {
  columns: number;
  rows: number;
  labelsPerPage: number;
  positions: { x: number; y: number; page: number }[];
  totalPages: number;
}

export function calculateLayout(
  pageWidth: number, pageHeight: number,
  marginTop: number, marginBottom: number,
  marginLeft: number, marginRight: number,
  labelWidth: number, labelHeight: number,
  gap: number,
  labels: { copies: number }[]
): PageLayout {
  const cols = Math.floor((pageWidth - marginLeft - marginRight + gap) / (labelWidth + gap));
  const rows = Math.floor((pageHeight - marginTop - marginBottom + gap) / (labelHeight + gap));
  const labelsPerPage = cols * rows;

  // Expand labels by copies count
  const positions = [];
  let slot = 0;
  for (const label of labels) {
    for (let c = 0; c < label.copies; c++) {
      const page = Math.floor(slot / labelsPerPage);
      const posOnPage = slot % labelsPerPage;
      const col = posOnPage % cols;
      const row = Math.floor(posOnPage / cols);
      positions.push({
        x: marginLeft + col * (labelWidth + gap),
        y: marginTop + row * (labelHeight + gap),
        page,
      });
      slot++;
    }
  }

  return { columns: cols, rows, labelsPerPage, positions, totalPages: Math.ceil(slot / labelsPerPage) || 1 };
}
```

**Step 2: Commit**

```bash
git add src/lib/layout/
git commit -m "feat: add page layout engine with grid calculation and pagination"
```

---

### Task 7: Label Preview Component

**Files:**
- Create: `src/lib/components/LabelCard.svelte`

**Step 1: Create LabelCard component**

Renders a single label as an HTML element (for the page preview):
- Zone 1: Logo (optional image, centered)
- Zone 2: 2-column fields table (label: value)
- Zone 3: ShapePreview SVG (centered)
- Props: `label: Label`, `fields: FieldDef[]`, `width_mm`, `height_mm`, `selected: boolean`, `logoSrc: string | null`
- Uses mm-to-px scaling for preview (1mm = ~3.78px at 96dpi, but scaled to fit preview)
- Click handler emits `on:select`
- Context menu handler emits `on:delete`

**Step 2: Commit**

```bash
git add src/lib/components/LabelCard.svelte
git commit -m "feat: add LabelCard component with 3-zone layout"
```

---

### Task 8: Page Preview Component

**Files:**
- Create: `src/lib/components/PagePreview.svelte`

**Step 1: Create PagePreview**

- Takes `labels`, `job` (for page/label dimensions), `settings` (for margins)
- Calls `calculateLayout()` to get positions
- Renders a scaled page (white rectangle with shadow) containing LabelCard instances
- Page pagination: shows current page, prev/next buttons
- Highlights selected label
- Click on label -> selects it (updates store)
- Right-click -> context menu with delete option

**Step 2: Commit**

```bash
git add src/lib/components/PagePreview.svelte
git commit -m "feat: add PagePreview component with grid layout and pagination"
```

---

### Task 9: Label Editor Panel (Left Side)

**Files:**
- Create: `src/lib/components/LabelEditor.svelte`
- Create: `src/lib/components/FieldInput.svelte`
- Create: `src/lib/components/ShapeEditor.svelte`

**Step 1: Create FieldInput component**

Simple component: label text + input field. Binds to a value, emits changes.

**Step 2: Create ShapeEditor component**

- Preset dropdown (selects from shape presets, fills segments)
- Segment list: each row has length input + angle input + [x] remove button
- [+ Add Segment] button
- "No shape" checkbox
- Small ShapePreview above the inputs

**Step 3: Create LabelEditor component**

Main left panel:
- Shows fields from current job's field definitions
- Each field rendered as FieldInput, bound to selectedLabel.field_values[field.label]
- ShapeEditor bound to selectedLabel.shape_preset + shape_segments
- Copies number input
- [+ New Label] and [Delete] buttons at bottom
- All changes update the store immediately (always-live)

**Step 4: Commit**

```bash
git add src/lib/components/LabelEditor.svelte src/lib/components/FieldInput.svelte src/lib/components/ShapeEditor.svelte
git commit -m "feat: add LabelEditor panel with field inputs and shape editor"
```

---

### Task 10: Top Navigation Bar

**Files:**
- Create: `src/lib/components/TopBar.svelte`

**Step 1: Create TopBar**

- App logo/name on left
- [Jobs v] dropdown: lists recent jobs, [New Job] button
- [Templates] button: switches to template manager screen
- [Settings] button: opens settings modal
- Styled as a compact header bar

**Step 2: Commit**

```bash
git add src/lib/components/TopBar.svelte
git commit -m "feat: add top navigation bar with job/template/settings access"
```

---

### Task 11: Main Editor Screen (Compose Everything)

**Files:**
- Create: `src/routes/+page.svelte` (overwrite scaffold)
- Create: `src/routes/+layout.svelte` (overwrite scaffold)
- Create: `src/lib/components/EditorScreen.svelte`

**Step 1: Create layout**

`+layout.svelte`: TopBar + slot for current screen content. Global CSS reset + Inter font import.

**Step 2: Create EditorScreen**

Split panel: LabelEditor (left 35%) | PagePreview (right 65%). Resizable divider (stretch goal, fixed ratio for v1 is fine).

**Step 3: Create +page.svelte**

Routes based on `currentScreen` store:
- 'editor' -> EditorScreen
- 'templates' -> TemplateManager (Task 12)
- 'settings' -> SettingsModal (Task 13)

On mount: load last job from settings, or show "New Job" prompt.

**Step 4: Verify in browser**

Run: `npm run dev`
Expected: Split panel layout visible, left editor and right preview

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: compose main editor screen with split panel layout"
```

---

### Task 12: Template Manager Screen

**Files:**
- Create: `src/lib/components/TemplateManager.svelte`
- Create: `src/lib/components/TemplateEditor.svelte`

**Step 1: Create TemplateManager**

- Lists all templates as cards (name, dimensions, field count)
- [+ New Template] button
- Each card has [Edit], [Duplicate], [Delete] actions
- Clicking Edit opens TemplateEditor

**Step 2: Create TemplateEditor**

Modal/inline form:
- Template name input
- Label width + height inputs (mm)
- Logo enabled toggle
- Fields list:
  - Each field: label input, type dropdown (text/number), default value, font size select (S/M/L), bold toggle
  - Drag handles or up/down arrows for reordering
  - [x] button to remove
  - [+ Add Field] button at bottom
- [Save] and [Cancel] buttons

**Step 3: Commit**

```bash
git add src/lib/components/TemplateManager.svelte src/lib/components/TemplateEditor.svelte
git commit -m "feat: add template manager screen with CRUD and field editor"
```

---

### Task 13: Settings Modal

**Files:**
- Create: `src/lib/components/SettingsModal.svelte`

**Step 1: Create SettingsModal**

Overlay modal with:
- Company name input
- Default page size dropdown (A4, A3, Letter)
- Margins: top, bottom, left, right (mm inputs)
- Label gap (mm input)
- Logo upload: file picker + preview + clear button
- Logo stored via Tauri command (copies file to appdata)
- [Save] and [Cancel]

**Step 2: Commit**

```bash
git add src/lib/components/SettingsModal.svelte
git commit -m "feat: add settings modal with margins, logo upload, and defaults"
```

---

### Task 14: New Job Flow

**Files:**
- Create: `src/lib/components/NewJobModal.svelte`

**Step 1: Create NewJobModal**

- Template picker dropdown (list all templates)
- Job name input
- Page size dropdown + custom dimensions
- Orientation toggle (portrait/landscape)
- [Create] button:
  1. Copies template fields into new job
  2. Creates first blank label
  3. Opens job in editor
  4. Selects first label

**Step 2: Commit**

```bash
git add src/lib/components/NewJobModal.svelte
git commit -m "feat: add new job creation flow with template selection"
```

---

### Task 15: PDF Generation

**Files:**
- Create: `src/lib/pdf/generator.ts`

**Step 1: Install jsPDF**

```bash
npm install jspdf
```

**Step 2: Create PDF generator**

`src/lib/pdf/generator.ts`:
- Function `generatePdf(job: Job, labels: Label[], settings: Settings, logoDataUrl: string | null): Blob`
- Uses jsPDF to create document with exact page dimensions
- Calls calculateLayout() for label positions
- For each label:
  - Draw border rectangle
  - Draw logo (if enabled, as image)
  - Draw 2-column fields table (text)
  - Draw shape SVG (convert segments to jsPDF line/arc commands)
- Returns PDF blob

**Step 3: Add font bundling**

Download Inter font .ttf, convert to base64, register with jsPDF:
```typescript
import { inter_base64 } from './inter-font';
doc.addFileToVFS('Inter-Regular.ttf', inter_base64);
doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
doc.setFont('Inter');
```

**Step 4: Create print/save function**

```typescript
export async function printJob(job, labels, settings, logo) {
  const blob = generatePdf(job, labels, settings, logo);
  // Use Tauri save dialog
  const { save } = await import('@tauri-apps/plugin-dialog');
  const path = await save({ filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (path) {
    // Write blob to file via Tauri
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(path, bytes);
  }
}
```

**Step 5: Wire Print button in PagePreview to call printJob()**

**Step 6: Commit**

```bash
git add src/lib/pdf/ package.json package-lock.json
git commit -m "feat: add PDF generation with jsPDF and bundled Inter font"
```

---

### Task 16: Auto-Save System

**Files:**
- Modify: `src/lib/stores/jobStore.ts`

**Step 1: Add debounced auto-save**

Every time labels or job data changes, debounce 500ms then persist to SQLite via Tauri commands. Show a subtle "Saved" indicator in the UI.

**Step 2: Commit**

```bash
git add src/lib/stores/jobStore.ts
git commit -m "feat: add debounced auto-save for labels and job data"
```

---

### Task 17: Styling & Polish

**Files:**
- Create: `src/app.css` (global styles)
- Modify: All component files (add scoped styles)

**Step 1: Global styles**

- CSS reset
- Inter font-face
- CSS variables for spacing, colors, borders
- Clean, minimal aesthetic (light gray background, white cards, subtle shadows)

**Step 2: Component polish**

- All inputs styled consistently
- Buttons with hover/active states
- Selected label highlight (blue border)
- Print button prominent
- Responsive panel widths
- Scrollable left panel if content overflows

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add global styles and component polish"
```

---

### Task 18: Integration Test & Build

**Step 1: Full workflow test in dev mode**

Run: `npx tauri dev`
Test manually:
1. Create a template with 3 fields
2. Create a job from that template
3. Add 3 different labels with different shapes
4. Verify preview shows correct layout
5. Generate PDF and verify output
6. Close and reopen -- verify data persisted

**Step 2: Production build**

Run: `npx tauri build`
Expected: Produces `.exe` installer in `src-tauri/target/release/bundle/`

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: RebarLabel v1 MVP complete"
```

---

## Build Order Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 0 | Install Rust | - |
| 1 | Scaffold project | 0 |
| 2 | SQLite DB layer | 1 |
| 3 | TS DB bridge | 2 |
| 4 | Svelte stores | 3 |
| 5 | Shape system | 1 |
| 6 | Layout engine | 1 |
| 7 | LabelCard component | 5 |
| 8 | PagePreview | 6, 7 |
| 9 | LabelEditor panel | 4, 5 |
| 10 | TopBar | 4 |
| 11 | Main editor screen | 8, 9, 10 |
| 12 | Template manager | 3, 4 |
| 13 | Settings modal | 3, 4 |
| 14 | New job flow | 3, 4, 12 |
| 15 | PDF generation | 5, 6 |
| 16 | Auto-save | 4 |
| 17 | Styling | 11-16 |
| 18 | Integration test | All |

Tasks 5, 6 can run in parallel with 2, 3, 4.
Tasks 12, 13 can run in parallel with 7, 8, 9.
