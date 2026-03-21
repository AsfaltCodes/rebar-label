export interface FieldDef {
  label: string;
  field_type: 'text' | 'number';
  default_value: string;
  font_size: number; // 1=small(8pt), 2=medium(10pt), 3=large(12pt)
  bold: boolean;
  layout?: 'full' | 'half'; // 'full' = one per row (default), 'half' = two per row
  scope?: 'job' | 'label'; // 'job' = shared across all labels, 'label' = per-label (default)
  source?: 'manual' | 'total_length' | 'client_name' | 'diameter' | 'buc'; // 'manual' = user types, 'total_length' = auto from shape, 'client_name' = auto from job, 'diameter' = marks field as diameter for offer Kg calc, 'buc' = marks field as copies/quantity
}

export interface Template {
  id: number;
  name: string;
  sizing_mode: 'grid' | 'fixed';
  columns: number;
  rows: number;
  label_width_mm: number;
  label_height_mm: number;
  logo_enabled: boolean;
  phone_enabled: boolean;
  page_size: string;
  page_width_mm: number;
  page_height_mm: number;
  page_orientation: 'portrait' | 'landscape';
  margin_top_mm: number;
  margin_bottom_mm: number;
  margin_left_mm: number;
  margin_right_mm: number;
  label_gap_mm: number;
  printer_margin_mm: number;
  field_padding_mm: number;
  length_unit: 'mm' | 'cm';
  fields: FieldDef[];
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: number;
  name: string;
  client_name: string;
  notes: string;
  source_template_id: number;
  fields: FieldDef[];
  job_field_values: Record<string, string>; // values for scope:'job' fields
  sizing_mode: 'grid' | 'fixed';
  columns: number;
  rows: number;
  label_width_mm: number;
  label_height_mm: number;
  logo_enabled: boolean;
  phone_enabled: boolean;
  page_size: string;
  page_width_mm: number;
  page_height_mm: number;
  page_orientation: 'portrait' | 'landscape';
  margin_top_mm: number;
  margin_bottom_mm: number;
  margin_left_mm: number;
  margin_right_mm: number;
  label_gap_mm: number;
  printer_margin_mm: number;
  field_padding_mm: number;
  length_unit: 'mm' | 'cm';
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

export interface CustomShapePreset {
  name: string;
  segments: Segment[];
}

export interface AppSettings {
  logo_image_path: string;
  language: 'en' | 'ro';
  company_name: string;
  company_phone: string;
  custom_shape_presets: CustomShapePreset[];
  offer_format: 'pdf' | 'xlsx';
}

export const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  'A4': { width: 209, height: 295.275 },
  'A3': { width: 297, height: 420 },
  'Letter': { width: 215.9, height: 279.4 },
  'Custom': { width: 209, height: 295.275 },
};

export const REBAR_DIAMETERS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 40] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  logo_image_path: '',
  language: 'en',
  company_name: '',
  company_phone: '',
  custom_shape_presets: [],
  offer_format: 'pdf',
};
