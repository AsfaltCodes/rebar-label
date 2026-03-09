import { type Template, type Job, type Label, type AppSettings, DEFAULT_SETTINGS, type FieldDef } from './types';

// Check if running inside Tauri
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// LocalStorage-based fallback for dev mode (no Tauri)
class LocalDB {
  private getStore<T>(key: string): T[] {
    const data = localStorage.getItem(`eisenlabel_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private setStore<T>(key: string, data: T[]): void {
    localStorage.setItem(`eisenlabel_${key}`, JSON.stringify(data));
  }

  private nextId(key: string): number {
    const items = this.getStore<{ id: number }>(key);
    return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  }

  // Templates
  async listTemplates(): Promise<Template[]> {
    return this.getStore<Template>('templates');
  }

  async getTemplate(id: number): Promise<Template | null> {
    return this.getStore<Template>('templates').find(t => t.id === id) || null;
  }

  async createTemplate(data: Omit<Template, 'id' | 'created_at' | 'updated_at'>): Promise<Template> {
    const templates = this.getStore<Template>('templates');
    const now = new Date().toISOString();
    const template: Template = { ...data, id: this.nextId('templates'), created_at: now, updated_at: now };
    templates.push(template);
    this.setStore('templates', templates);
    return template;
  }

  async updateTemplate(id: number, data: Partial<Omit<Template, 'id' | 'created_at' | 'updated_at'>>): Promise<Template> {
    const templates = this.getStore<Template>('templates');
    const idx = templates.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Template ${id} not found`);
    templates[idx] = { ...templates[idx], ...data, updated_at: new Date().toISOString() };
    this.setStore('templates', templates);
    return templates[idx];
  }

  async deleteTemplate(id: number): Promise<void> {
    const templates = this.getStore<Template>('templates').filter(t => t.id !== id);
    this.setStore('templates', templates);
  }

  // Jobs
  async listJobs(): Promise<Job[]> {
    return this.getStore<Job>('jobs').map(j => ({ ...j, job_field_values: j.job_field_values || {} }));
  }

  async getJob(id: number): Promise<Job | null> {
    const job = this.getStore<Job>('jobs').find(j => j.id === id) || null;
    return job ? { ...job, job_field_values: job.job_field_values || {} } : null;
  }

  async createJob(data: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    const jobs = this.getStore<Job>('jobs');
    const now = new Date().toISOString();
    const job: Job = { ...data, id: this.nextId('jobs'), created_at: now, updated_at: now };
    jobs.push(job);
    this.setStore('jobs', jobs);
    return job;
  }

  async updateJob(id: number, data: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>): Promise<Job> {
    const jobs = this.getStore<Job>('jobs');
    const idx = jobs.findIndex(j => j.id === id);
    if (idx === -1) throw new Error(`Job ${id} not found`);
    jobs[idx] = { ...jobs[idx], ...data, updated_at: new Date().toISOString() };
    this.setStore('jobs', jobs);
    return jobs[idx];
  }

  async deleteJob(id: number): Promise<void> {
    const jobs = this.getStore<Job>('jobs').filter(j => j.id !== id);
    this.setStore('jobs', jobs);
    // Also delete labels for this job
    const labels = this.getStore<Label>('labels').filter(l => l.job_id !== id);
    this.setStore('labels', labels);
  }

  // Labels
  async listLabels(jobId: number): Promise<Label[]> {
    return this.getStore<Label>('labels').filter(l => l.job_id === jobId).sort((a, b) => a.sort_order - b.sort_order);
  }

  async createLabel(data: Omit<Label, 'id'>): Promise<Label> {
    const labels = this.getStore<Label>('labels');
    const label: Label = { ...data, id: this.nextId('labels') };
    labels.push(label);
    this.setStore('labels', labels);
    return label;
  }

  async updateLabel(id: number, data: Partial<Omit<Label, 'id'>>): Promise<Label> {
    const labels = this.getStore<Label>('labels');
    const idx = labels.findIndex(l => l.id === id);
    if (idx === -1) throw new Error(`Label ${id} not found`);
    labels[idx] = { ...labels[idx], ...data };
    this.setStore('labels', labels);
    return labels[idx];
  }

  async deleteLabel(id: number): Promise<void> {
    const labels = this.getStore<Label>('labels').filter(l => l.id !== id);
    this.setStore('labels', labels);
  }

  // Settings
  async getSettings(): Promise<AppSettings> {
    const stored = localStorage.getItem('eisenlabel_settings');
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
  }

  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...data };
    localStorage.setItem('eisenlabel_settings', JSON.stringify(updated));
    return updated;
  }
}

// Tauri-backed DB (wraps invoke calls) - will be used when running in Tauri
class TauriDB {
  private async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }

  async listTemplates(): Promise<Template[]> {
    const raw = await this.invoke<any[]>('list_templates');
    return raw.map(t => ({ ...t, fields: JSON.parse(t.fields || '[]') }));
  }

  async getTemplate(id: number): Promise<Template | null> {
    const raw = await this.invoke<any>('get_template', { id });
    if (!raw) return null;
    return { ...raw, fields: JSON.parse(raw.fields || '[]') };
  }

  async createTemplate(data: Omit<Template, 'id' | 'created_at' | 'updated_at'>): Promise<Template> {
    const raw = await this.invoke<any>('create_template', {
      name: data.name,
      sizingMode: data.sizing_mode || 'grid',
      columns: data.columns || 2,
      rows: data.rows || 5,
      labelWidthMm: data.label_width_mm,
      labelHeightMm: data.label_height_mm,
      logoEnabled: data.logo_enabled,
      phoneEnabled: data.phone_enabled || false,
      pageSize: data.page_size || 'A4',
      pageWidthMm: data.page_width_mm || 210,
      pageHeightMm: data.page_height_mm || 297,
      pageOrientation: data.page_orientation || 'portrait',
      fields: JSON.stringify(data.fields),
    });
    return { ...raw, fields: JSON.parse(raw.fields || '[]') };
  }

  async updateTemplate(id: number, data: Partial<Omit<Template, 'id' | 'created_at' | 'updated_at'>>): Promise<Template> {
    const payload: Record<string, unknown> = { id };
    if (data.name !== undefined) payload.name = data.name;
    if (data.sizing_mode !== undefined) payload.sizingMode = data.sizing_mode;
    if (data.columns !== undefined) payload.columns = data.columns;
    if (data.rows !== undefined) payload.rows = data.rows;
    if (data.label_width_mm !== undefined) payload.labelWidthMm = data.label_width_mm;
    if (data.label_height_mm !== undefined) payload.labelHeightMm = data.label_height_mm;
    if (data.logo_enabled !== undefined) payload.logoEnabled = data.logo_enabled;
    if (data.phone_enabled !== undefined) payload.phoneEnabled = data.phone_enabled;
    if (data.fields !== undefined) payload.fields = JSON.stringify(data.fields);
    const raw = await this.invoke<any>('update_template', payload);
    return { ...raw, fields: JSON.parse(raw.fields || '[]') };
  }

  async deleteTemplate(id: number): Promise<void> {
    await this.invoke('delete_template', { id });
  }

  async listJobs(): Promise<Job[]> {
    const raw = await this.invoke<any[]>('list_jobs');
    return raw.map(j => ({ ...j, fields: JSON.parse(j.fields || '[]'), job_field_values: JSON.parse(j.job_field_values || '{}') }));
  }

  async getJob(id: number): Promise<Job | null> {
    const raw = await this.invoke<any>('get_job', { id });
    if (!raw) return null;
    return { ...raw, fields: JSON.parse(raw.fields || '[]'), job_field_values: JSON.parse(raw.job_field_values || '{}') };
  }

  async createJob(data: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    const raw = await this.invoke<any>('create_job', {
      name: data.name,
      sourceTemplateId: data.source_template_id,
      fields: JSON.stringify(data.fields),
      sizingMode: data.sizing_mode || 'grid',
      columns: data.columns || 2,
      rows: data.rows || 5,
      labelWidthMm: data.label_width_mm,
      labelHeightMm: data.label_height_mm,
      logoEnabled: data.logo_enabled,
      phoneEnabled: data.phone_enabled || false,
      pageSize: data.page_size,
      pageWidthMm: data.page_width_mm,
      pageHeightMm: data.page_height_mm,
      pageOrientation: data.page_orientation,
      clientName: data.client_name || '',
      notes: data.notes || '',
      jobFieldValues: JSON.stringify(data.job_field_values || {}),
    });
    return { ...raw, fields: JSON.parse(raw.fields || '[]'), job_field_values: JSON.parse(raw.job_field_values || '{}') };
  }

  async updateJob(id: number, data: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>): Promise<Job> {
    const payload: Record<string, unknown> = { id };
    if (data.name !== undefined) payload.name = data.name;
    if (data.fields !== undefined) payload.fields = JSON.stringify(data.fields);
    if (data.page_size !== undefined) payload.pageSize = data.page_size;
    if (data.page_width_mm !== undefined) payload.pageWidthMm = data.page_width_mm;
    if (data.page_height_mm !== undefined) payload.pageHeightMm = data.page_height_mm;
    if (data.page_orientation !== undefined) payload.pageOrientation = data.page_orientation;
    if (data.client_name !== undefined) payload.clientName = data.client_name;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.job_field_values !== undefined) payload.jobFieldValues = JSON.stringify(data.job_field_values);
    const raw = await this.invoke<any>('update_job', payload);
    return { ...raw, fields: JSON.parse(raw.fields || '[]'), job_field_values: JSON.parse(raw.job_field_values || '{}') };
  }

  async deleteJob(id: number): Promise<void> {
    await this.invoke('delete_job', { id });
  }

  async listLabels(jobId: number): Promise<Label[]> {
    const raw = await this.invoke<any[]>('list_labels', { jobId });
    return raw.map(l => ({
      ...l,
      field_values: JSON.parse(l.field_values || '{}'),
      shape_segments: JSON.parse(l.shape_segments || '[]'),
    }));
  }

  async createLabel(data: Omit<Label, 'id'>): Promise<Label> {
    const raw = await this.invoke<any>('create_label', {
      jobId: data.job_id,
      fieldValues: JSON.stringify(data.field_values),
      shapePreset: data.shape_preset,
      shapeSegments: JSON.stringify(data.shape_segments),
      copies: data.copies,
      sortOrder: data.sort_order,
    });
    return {
      ...raw,
      field_values: JSON.parse(raw.field_values || '{}'),
      shape_segments: JSON.parse(raw.shape_segments || '[]'),
    };
  }

  async updateLabel(id: number, data: Partial<Omit<Label, 'id'>>): Promise<Label> {
    const payload: Record<string, unknown> = { id };
    if (data.field_values !== undefined) payload.fieldValues = JSON.stringify(data.field_values);
    if (data.shape_preset !== undefined) payload.shapePreset = data.shape_preset;
    if (data.shape_segments !== undefined) payload.shapeSegments = JSON.stringify(data.shape_segments);
    if (data.copies !== undefined) payload.copies = data.copies;
    if (data.sort_order !== undefined) payload.sortOrder = data.sort_order;
    const raw = await this.invoke<any>('update_label', payload);
    return {
      ...raw,
      field_values: JSON.parse(raw.field_values || '{}'),
      shape_segments: JSON.parse(raw.shape_segments || '[]'),
    };
  }

  async deleteLabel(id: number): Promise<void> {
    await this.invoke('delete_label', { id });
  }

  async getSettings(): Promise<AppSettings> {
    const raw = await this.invoke<Record<string, string>>('get_all_settings');
    return {
      logo_image_path: raw.logo_image_path || '',
      default_page_size: raw.default_page_size || 'A4',
      default_page_orientation: (raw.default_page_orientation as 'portrait' | 'landscape') || 'portrait',
      company_name: raw.company_name || '',
      company_phone: raw.company_phone || '',
      margin_top_mm: raw.margin_top_mm !== undefined ? parseFloat(raw.margin_top_mm) : 0,
      margin_bottom_mm: raw.margin_bottom_mm !== undefined ? parseFloat(raw.margin_bottom_mm) : 0,
      margin_left_mm: raw.margin_left_mm !== undefined ? parseFloat(raw.margin_left_mm) : 0,
      margin_right_mm: raw.margin_right_mm !== undefined ? parseFloat(raw.margin_right_mm) : 0,
      label_gap_mm: raw.label_gap_mm !== undefined ? parseFloat(raw.label_gap_mm) : 0,
    };
  }

  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    for (const [key, value] of Object.entries(data)) {
      await this.invoke('set_setting', { key, value: String(value) });
    }
    return this.getSettings();
  }
}

// Export a singleton DB instance
export const db = isTauri() ? new TauriDB() : new LocalDB();
