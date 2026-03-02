# RebarLabel - Design Document

## Overview

Desktop application for creating and printing rebar labels. Replaces handwritten labels with a structured, template-based system. Used by a company team with varying technical skill levels.

## Architecture

### Stack
- **Tauri** (Rust) - Native shell, file system access, file save dialogs
- **Svelte** - Frontend UI framework (lightweight, reactive, compiles away)
- **SQLite** - Local database for templates, jobs, settings
- **SVG** - Rebar shape rendering (scales for print, easy to manipulate)
- **jsPDF / pdf-lib** - Client-side PDF generation (single render pipeline, no Rust duplication)
- **Bundled font** - One legible sans-serif (Inter or Roboto), embedded in PDF output

### Data Flow
```
User Input (Svelte UI)
    -> Label State (Svelte stores)
    -> Live Preview (SVG/CSS render)
    -> PDF Export (JS library, same render logic as preview)
    -> File Save (Tauri Rust, file dialog only)

Persistence:
    Svelte stores <-> Tauri commands <-> SQLite
```

### Project Structure
```
src/
  lib/
    components/     -- Svelte UI components (panels, modals, buttons)
    shapes/         -- Shape presets & SVG rendering logic
    stores/         -- Svelte stores (label state, job state, UI state)
    pdf/            -- PDF generation (JS, reuses SVG render logic)
    db/             -- Database operations (via Tauri invoke)
  routes/           -- App screens (main editor, template manager)
src-tauri/
  src/
    main.rs         -- Tauri app entry
    db.rs           -- SQLite operations
    commands.rs     -- Tauri commands (DB access, file dialogs, logo storage)
```

Note: No `pdf.rs` -- PDF generation happens entirely in the frontend JS to avoid
maintaining two separate render pipelines.

## Data Model

### Template
A reusable starting point for creating jobs. When a job is created from a template,
the job COPIES the template's field definitions. After that, the job is self-contained.
Editing a template does not affect existing jobs.

```
Template {
  id: integer (PK)
  name: text                     -- "Standard Stirrup Label"
  label_width_mm: real
  label_height_mm: real
  logo_enabled: boolean
  fields: text                   -- JSON array of field definitions (see below)
  created_at: timestamp
  updated_at: timestamp
}
```

Field definition (stored as JSON array inside Template.fields and Job.fields):
```
FieldDef {
  label: text                    -- "Client", "Diameter", anything user wants
  field_type: text               -- "text" or "number"
  default_value: text            -- optional pre-fill value
  font_size: real                -- relative size (small/medium/large mapped to pt)
  bold: boolean
}
```

Why JSON instead of a separate table: Field definitions are always loaded/saved together
with their parent. A JSON array in a single column avoids join overhead and keeps the
schema simple. Fields are ordered by array position (no sort_order column needed).

### Job
A self-contained print session. Owns its own copy of field definitions (snapshotted
from template at creation time).

```
Job {
  id: integer (PK)
  name: text                     -- "Bridge Project Batch 3"
  source_template_id: integer    -- which template it was created from (reference only)
  fields: text                   -- JSON array of FieldDef (copied from template)
  label_width_mm: real           -- copied from template, can be changed per-job
  label_height_mm: real
  logo_enabled: boolean
  page_size: text                -- "A4", "A3", "Letter", "custom"
  page_width_mm: real            -- for custom sizes (or filled from page_size preset)
  page_height_mm: real
  page_orientation: text         -- "portrait", "landscape"
  created_at: timestamp
  updated_at: timestamp
}
```

### Label
Individual label instances within a job.

```
Label {
  id: integer (PK)
  job_id: integer (FK)
  field_values: text             -- JSON object: {"Client": "ACME", "Diameter": "16"}
  shape_preset: text             -- "stirrup", "L-shape", "straight", etc. or null
  shape_segments: text           -- JSON array: [{length, angle}, ...] (see Shape System)
  copies: integer                -- how many times this label repeats on the page
  sort_order: integer            -- position in the label list
}
```

### Settings
App-wide preferences (key-value store).

```
Settings {
  key: text (PK)
  value: text
}

Keys:
  logo_image_path                -- path to uploaded logo file, or empty
  default_page_size              -- "A4", "A3", etc.
  default_template_id            -- last used template
  company_name
  margin_top_mm                  -- default: 10
  margin_bottom_mm               -- default: 10
  margin_left_mm                 -- default: 10
  margin_right_mm                -- default: 10
  label_gap_mm                   -- default: 2
```

### Key Decisions
- **Fields are fully custom.** No hardcoded field names. Template defines what fields exist.
- **Jobs are self-contained.** Field definitions are copied from the template at job creation. Editing a template later does not break existing jobs.
- **Shape config is per-label**, not per-job. Same job can have labels with different rebar shapes.
- **Copies field** avoids duplicating label data when you need many identical labels.
- **No position_x/position_y for fields.** Labels use a fixed internal layout (see Label Layout below). This removes the need for a visual label designer and keeps the UX fast.

## Label Internal Layout

Every label uses a fixed three-zone layout. No drag-and-drop positioning.

```
+------------------------+
|       [LOGO]           |   Zone 1: Logo (optional, centered)
+------------+-----------+
| Client:    | ACME Corp |   Zone 2: Fields (2-column table)
| Diameter:  | 16mm      |     Left col: field labels
| Grade:     | B500B     |     Right col: field values
| Qty:       | 12        |     Rows ordered by field definition order
+------------+-----------+
|   +----+               |   Zone 3: Shape drawing (centered)
|   |    |  A=350 B=250  |     SVG render of rebar shape
|   +----+               |     Dimension labels shown alongside
+------------------------+
```

- Logo zone: hidden entirely if logo_enabled is false
- Fields zone: expands/contracts based on number of fields
- Shape zone: hidden entirely if no shape is selected for this label
- Font: single bundled sans-serif (Inter or Roboto), sizes controlled per-field via font_size

## UX Layout

### Main Screen (Job Editor)
```
+-------------------------------------------------------------+
|  [Logo] RebarLabel     [Jobs v]  [Templates]  [Settings]     |
+-------------------------+-----------------------------------+
|                         |                                   |
|   LABEL EDITOR          |        LIVE PAGE PREVIEW          |
|   (left ~35%)           |        (right ~65%)               |
|                         |                                   |
|  +- Fields -----------+ |   +-----------------------------+ |
|  | Client: [____]     | |   |  +-----+ +-----+ +-----+   | |
|  | Diameter: [__]     | |   |  |Lbl 1| |Lbl 2| |Lbl 3|   | |
|  | Grade: [____]      | |   |  | ***  | |     | |     |   | |
|  +--------------------+ |   |  +-----+ +-----+ +-----+   | |
|                         |   |  +-----+ +-----+ +-----+   | |
|  +- Shape ------------+ |   |  |Lbl 4| |Lbl 5| |Lbl 6|   | |
|  | [Stirrup v]        | |   |  |     | |     | |     |   | |
|  |  +-----------+     | |   |  +-----+ +-----+ +-----+   | |
|  |  | shape     |     | |   |                             | |
|  |  | preview   |     | |   +-----------------------------+ |
|  |  +-----------+     | |                                   |
|  | Seg 1: [350] mm    | |   Page 1 of 1   [A4 v] [Print]   |
|  | Seg 2: [250] mm    | |                                   |
|  | Seg 3: [350] mm    | |                                   |
|  | Seg 4: [250] mm    | |                                   |
|  +--------------------+ |                                   |
|                         |                                   |
|  Copies: [6]            |                                   |
|  [+ New Label] [Delete] |                                   |
|                         |                                   |
+-------------------------+-----------------------------------+
```

*** = selected label (highlighted border)

### Interaction Model: Always-Live Editing

The left panel is NOT a form you submit. It is a live editor for the currently selected label.

1. **New job**: User creates a job (from template or blank) -> first label auto-created and selected
2. **Edit live**: Left panel shows the selected label's fields and shape. Every keystroke updates the preview instantly.
3. **Switch labels**: Click any label in the preview -> left panel switches to that label's data.
4. **Add label**: Click [+ New Label] -> blank label added to the page, auto-selected, left panel clears for input.
5. **Delete label**: Click [Delete] or right-click label in preview -> label removed, next label auto-selected.
6. **Print**: Click [Print] -> generates PDF, opens system save/print dialog.

There is NO "Add to Page" or "Save" button. Changes are always live and auto-persisted.

### Template Manager (Separate Screen)

Accessed via [Templates] in the top bar. Opens a dedicated screen.

```
+-------------------------------------------------------------+
|  [Logo] RebarLabel     [Jobs v]  [Templates*]  [Settings]    |
+-------------------------------------------------------------+
|                                                             |
|  Templates                              [+ New Template]    |
|                                                             |
|  +- Standard Stirrup ----+  +- L-Bar Format ------+        |
|  | 80 x 50 mm            |  | 100 x 60 mm         |        |
|  | Fields: Client, Dia,  |  | Fields: Project,     |        |
|  |   Grade, Qty           |  |   Client, Length     |        |
|  | [Edit] [Duplicate]    |  | [Edit] [Duplicate]   |        |
|  | [Delete]              |  | [Delete]             |        |
|  +------------------------+  +----------------------+        |
|                                                             |
+-------------------------------------------------------------+
```

Edit opens a form:
- Template name
- Label dimensions (width x height mm)
- Logo enabled (toggle)
- Fields list: add/remove/reorder fields, set each field's label, type, default, font size, bold

### Job Management

Accessed via [Jobs v] dropdown in the top bar.
- Lists recent jobs (name + date)
- [New Job] button -> pick template -> enter job name -> lands in the editor
- Click existing job -> opens it in the editor

## Shape System

### Universal Segment Model

ALL shapes (including presets) are stored as a chain of segments:
```
[{length: 350, angle: 90}, {length: 250, angle: 90}, {length: 350, angle: 90}, {length: 250, angle: 0}]
```

Each segment: draw `length` mm, then turn `angle` degrees (0 = straight ahead, 90 = right angle bend).

### Presets

Presets are NOT separate shape types in the code. A preset is just a function that generates a pre-filled segment array. The user can always modify the segments after selecting a preset.

| Preset    | What it generates                                            |
|-----------|--------------------------------------------------------------|
| Straight  | 1 segment, 0 angle                                          |
| L-shape   | 2 segments, 90 angle between                                |
| U-shape   | 3 segments, 90-90 angles                                    |
| Z-shape   | 3 segments, alternating angles                               |
| Stirrup   | 4 segments forming closed rectangle + optional hook segment  |
| Triangle  | 3 segments forming closed triangle                           |
| Hook      | 2 segments (bar + curved hook, hook rendered as arc)         |
| Custom    | Empty, user adds segments manually                           |

### Rendering
- A single SVG render function takes a segment array and draws the shape
- Dimension labels (actual mm values) shown alongside each segment
- Same function used in: shape preview (left panel), label preview (right panel), PDF output
- Closed shapes: detected when final point is close to start point (within tolerance)
- Hook arcs: when angle is flagged as "arc", render as curve instead of sharp bend

### Shape Input UI (Left Panel)

```
+- Shape ------------------+
| Preset: [Stirrup v]      |
|                           |
|  +---------+              |
|  | SVG     |              |    <- live shape preview
|  | preview |              |
|  +---------+              |
|                           |
| Segments:                 |
| 1: [350] mm  / [90] deg  |
| 2: [250] mm  / [90] deg  |
| 3: [350] mm  / [90] deg  |
| 4: [250] mm  / [0] deg   |
| [+ Add Segment]          |
|                           |
| [ ] No shape              |    <- toggle to hide shape from label
+---------------------------+
```

Selecting a preset fills in the segments with default values. User edits them freely.
Adding/removing segments via [+ Add] and [x] buttons on each row.

## PDF Generation

- Generated entirely in the frontend using a JS library (jsPDF or pdf-lib)
- Uses the same layout engine and SVG render logic as the live preview
- Steps: calculate grid positions -> for each label, draw logo + fields table + shape SVG
- Font (Inter/Roboto) bundled as base64 in the app and registered with the PDF library
- Black-only output (safe for any printer, no color dependency)
- Page dimensions match the exact paper size from the job settings
- Output: Tauri opens a native file save dialog, writes the PDF bytes to disk

## Page Layout Engine

- Input: page_width, page_height, margin_top, margin_bottom, margin_left, margin_right, label_width, label_height, gap
- Columns: `floor((page_width - margin_left - margin_right + gap) / (label_width + gap))`
- Rows: `floor((page_height - margin_top - margin_bottom + gap) / (label_height + gap))`
- Labels per page: columns * rows
- Labels placed left-to-right, top-to-bottom
- Label position: `x = margin_left + col * (label_width + gap)`, `y = margin_top + row * (label_height + gap)`
- When total label instances (considering copies) exceed labels_per_page, create additional pages
- Overflow is automatic and reflected in preview pagination

## Storage

- SQLite database: `%APPDATA%/RebarLabel/data.db`
- Logo images: `%APPDATA%/RebarLabel/logos/`
- Auto-save: changes persisted to SQLite on every edit (debounced, ~500ms delay)
- Export/import: Jobs and templates exportable as JSON files for backup or machine transfer

## Scope

### v1 (MVP)
- Template creation/editing (separate screen with field management)
- Job creation from template (field defs copied, job is self-contained)
- Always-live label editor with instant preview updates
- All 8 shape presets generating segment arrays + custom segment editing
- Live page preview with label grid and click-to-select
- PDF generation via frontend JS library
- Save/load jobs and templates in SQLite (auto-save)
- Optional logo upload
- Page size selection (A4, A3, Letter, custom)
- App settings (margins, defaults, company name)
- Single bundled font (Inter or Roboto)

### v2+ (Future)
- Drag-to-reorder labels on preview
- Batch import from CSV/Excel
- Multi-page navigation improvements
- Label duplication shortcuts
- Dark mode
- Undo/redo
- Tauri auto-updater for distributing updates
- Export template packs (share templates between machines)
