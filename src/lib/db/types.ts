export interface FieldDef {
  label: string;
  field_type: 'text' | 'number';
  default_value: string;
  font_size: number; // 1=small(8pt), 2=medium(10pt), 3=large(12pt)
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

export interface AppSettings {
  logo_image_path: string;
  default_page_size: string;
  default_template_id: string;
  company_name: string;
  margin_top_mm: number;
  margin_bottom_mm: number;
  margin_left_mm: number;
  margin_right_mm: number;
  label_gap_mm: number;
}

export const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  'A4': { width: 210, height: 297 },
  'A3': { width: 297, height: 420 },
  'Letter': { width: 215.9, height: 279.4 },
};

export const DEFAULT_SETTINGS: AppSettings = {
  logo_image_path: '',
  default_page_size: 'A4',
  default_template_id: '',
  company_name: '',
  margin_top_mm: 10,
  margin_bottom_mm: 10,
  margin_left_mm: 10,
  margin_right_mm: 10,
  label_gap_mm: 2,
};
