# RebarLabel - Design Document

## Overview

Desktop application for creating and printing rebar labels. Replaces handwritten labels with a structured, template-based system. Used by a company team with varying technical skill levels.

## Architecture

### Stack
- **Tauri** (Rust) - Native shell, file system, PDF generation
- **Svelte** - Frontend UI framework (lightweight, reactive, compiles away)
- **SQLite** - Local database for templates, jobs, settings
- **SVG** - Rebar shape rendering (scales for print, easy to manipulate)

### Data Flow
```
User Input (Svelte UI)
    -> Label State (Svelte stores)
    -> Live Preview (SVG/CSS render)
    -> Print/Export (Tauri Rust -> PDF generation)

Persistence:
    Svelte stores <-> Tauri commands <-> SQLite
```

### Project Structure
```
src/
  lib/
    components/     -- Svelte UI components
    shapes/         -- Shape presets & SVG rendering logic
    stores/         -- Svelte stores (label state, page state)
    db/             -- Database operations (via Tauri invoke)
  routes/           -- App pages or App.svelte
src-tauri/
  src/
    main.rs         -- Tauri app entry
    db.rs           -- SQLite operations
    pdf.rs          -- PDF generation
    commands.rs     -- Tauri commands (bridge to frontend)
```

## Data Model

### Template
A reusable label layout definition.

```
Template {
  id: integer (PK)
  name: text                     -- "Standard Stirrup Label"
  label_width_mm: real
  label_height_mm: real
  logo_enabled: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

### TemplateField
Custom text fields belonging to a template.

```
TemplateField {
  id: integer (PK)
  template_id: integer (FK)
  label: text                    -- "Client", "Diameter", anything
  field_type: text               -- "text", "number", "dropdown"
  default_value: text            -- optional pre-fill
  dropdown_options: text         -- JSON array, only for dropdown type
  font_size: real
  position_x: real               -- position within label (mm)
  position_y: real
  bold: boolean
  italic: boolean
  sort_order: integer
}
```

### Job
A specific print session/project.

```
Job {
  id: integer (PK)
  name: text                     -- "Bridge Project Batch 3"
  template_id: integer (FK)
  page_size: text                -- "A4", "A3", "Letter", "custom"
  page_width_mm: real            -- for custom sizes
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
  field_values: text             -- JSON: {"Client": "ACME", "Diameter": "16"}
  shape_preset: text             -- "stirrup", "L-shape", "straight", etc. or null
  shape_segments: text           -- JSON: [{length, angle}] pairs
  hook_length: real              -- if applicable
  copies: integer                -- how many copies on the page
  sort_order: integer
}
```

### Settings
App-wide preferences.

```
Settings {
  key: text (PK)
  value: text
}

Keys:
  logo_image_path
  default_page_size
  default_template_id
  company_name
  margin_top_mm
  margin_bottom_mm
  margin_left_mm
  margin_right_mm
  label_gap_mm (default: 2)
```

### Key Decisions
- Fields are fully custom. No hardcoded field names. The template defines what fields exist.
- Shape config is per-label, not per-template. Same template can have labels with different rebar shapes.
- "Copies" field avoids duplicating label data when you need many identical labels.

## UX Layout

### Main Screen
```
+-------------------------------------------------------------+
|  [Logo] RebarLabel    [Jobs v]  [Templates]  [Settings]      |
+-------------------------+-----------------------------------+
|                         |                                   |
|   LABEL BUILDER         |        LIVE PAGE PREVIEW          |
|   PANEL (left ~35%)     |        (right ~65%)               |
|                         |                                   |
|  +- Template ---------+ |   +-----------------------------+ |
|  | [Select v]  [New]  | |   |  +-----+ +-----+ +-----+   | |
|  +--------------------+ |   |  |Lbl 1| |Lbl 2| |Lbl 3|   | |
|                         |   |  +-----+ +-----+ +-----+   | |
|  +- Fields -----------+ |   |  +-----+ +-----+ +-----+   | |
|  | Client: [____]     | |   |  |Lbl 4| |Lbl 5| |Lbl 6|   | |
|  | Diameter: [__]     | |   |  +-----+ +-----+ +-----+   | |
|  | Grade: [____]      | |   |                             | |
|  +--------------------+ |   +-----------------------------+ |
|                         |                                   |
|  +- Shape ------------+ |   Page 1 of 1   [A4 v] [Print]   |
|  | [Stirrup v]        | |                                   |
|  |  +-----------+     | |                                   |
|  |  | shape     |     | |                                   |
|  |  | preview   |     | |                                   |
|  |  +-----------+     | |                                   |
|  | A: [350] mm        | |                                   |
|  | B: [250] mm        | |                                   |
|  | C: [350] mm        | |                                   |
|  | D: [250] mm        | |                                   |
|  +--------------------+ |                                   |
|                         |                                   |
|  Copies: [6]            |                                   |
|  [Add to Page]          |                                   |
|                         |                                   |
+-------------------------+-----------------------------------+
```

### Workflow

1. **Start**: Open app -> see last job or "New Job" prompt
2. **Pick/create template**: Select existing or create new (defines fields + label dimensions)
3. **Fill in label**: Enter values for each field, pick shape preset, enter dimensions
4. **Add to page**: Click "Add to Page" -> label appears in preview grid, repeated N times (copies)
5. **Repeat**: Fill in next label variation, add to page
6. **Edit on preview**: Click any label in preview -> loads into left panel for editing. Right-click -> delete.
7. **Print**: Hit print -> generates PDF with exact page dimensions and margins

### Live Preview Behavior
- Labels auto-fill the page in a grid (label size + page size + margins = grid layout)
- Overflow creates new pages automatically
- Each label shows: logo (top), text fields (middle), shape drawing (bottom)
- Selected label gets a highlight border
- Page navigation when multiple pages exist

## Shape System

### Presets

| Preset    | Description               | Parameters                        |
|-----------|---------------------------|-----------------------------------|
| Straight  | Simple bar                | Total length                      |
| L-shape   | One bend                  | A, B lengths + angle              |
| U-shape   | Two bends                 | A, B, C lengths                   |
| Z-shape   | Two opposite bends        | A, B, C lengths                   |
| Stirrup   | Closed rectangle          | A, B lengths + hook length        |
| Triangle  | Closed triangle           | A, B, C lengths                   |
| Hook      | Bar with hook end         | Length + hook radius              |
| Custom    | User-defined segments     | N segments, each: length + angle  |

### Rendering
- Each preset is a function: parameters -> SVG path data
- Dimension labels shown alongside the drawn shape (actual measurements)
- Same SVG logic used for:
  - Small preview in the shape panel (left)
  - Label rendering in the page preview (right)
  - PDF vector output (print)

## PDF Generation

- Generated on the Rust side using the `printpdf` crate
- Frontend sends structured layout data to Tauri backend
- Rust renders PDF with exact millimeter positioning
- SVG shapes embedded as vector graphics (not rasterized)
- Black-only output (safe for any printer)
- Page dimensions match selected paper size exactly

## Page Layout Engine

- Input: page size (mm), margins (mm), label size (mm), gap (mm)
- Calculates: columns = floor((page_width - margins) / (label_width + gap))
- Calculates: rows = floor((page_height - margins) / (label_height + gap))
- Labels placed left-to-right, top-to-bottom
- Overflow to next page when current page is full

## Storage

- SQLite database: `%APPDATA%/RebarLabel/data.db`
- Logo images: `%APPDATA%/RebarLabel/logos/`
- Export/import: Jobs and templates exportable as JSON files

## Scope

### v1 (MVP)
- Template creation with custom fields
- All 8 shape presets with numeric input + live preview
- Live page preview with label grid
- Click-to-edit and right-click-to-delete on preview
- PDF generation and system print dialog
- Save/load jobs and templates in SQLite
- Optional logo upload
- Page size selection (A4, A3, Letter, custom)
- App settings (margins, defaults, company name)

### v2+ (Future)
- Drag-to-reorder labels on preview
- Batch import from CSV/Excel
- Multi-page navigation improvements
- Label duplication shortcuts
- Dark mode
- Undo/redo
- Tauri auto-updater for distributing updates
