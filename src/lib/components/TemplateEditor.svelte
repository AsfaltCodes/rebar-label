<script lang="ts">
  import type { Template, FieldDef, Label } from '$lib/db/types';
  import { PAGE_SIZES } from '$lib/db/types';
  import { settings, updateSettings } from '$lib/stores/settingsStore';
  import { calculateLabelDimensions } from '$lib/utils/labelDimensions';
  import LabelCard from './LabelCard.svelte';
  import Icon from './ui/Icon.svelte';

  export let template: Partial<Template> = {
    name: '',
    sizing_mode: 'grid',
    columns: 2,
    rows: 5,
    label_width_mm: 80,
    label_height_mm: 50,
    logo_enabled: false,
    phone_enabled: false,
    fields: [],
  };
  export let onSave: (data: Partial<Template>) => void = () => {};
  export let onCancel: () => void = () => {};

  let name = template.name || '';
  let sizingMode: 'grid' | 'fixed' = template.sizing_mode || 'grid';
  let columns = template.columns || 2;
  let rows = template.rows || 5;
  let width = template.label_width_mm || 80;
  let height = template.label_height_mm || 50;
  let logoEnabled = template.logo_enabled || false;
  let phoneEnabled = template.phone_enabled || false;
  let fields: FieldDef[] = template.fields ? [...template.fields] : [];

  $: logoSrc = $settings.logo_image_path || null;
  $: s = $settings;

  // Preview label dimensions — compute from grid or use fixed
  $: previewDims = sizingMode === 'grid'
    ? calculateLabelDimensions(
        PAGE_SIZES[s.default_page_size || 'A4']?.width || 210,
        PAGE_SIZES[s.default_page_size || 'A4']?.height || 297,
        s.margin_top_mm, s.margin_bottom_mm,
        s.margin_left_mm, s.margin_right_mm,
        s.label_gap_mm, columns, rows
      )
    : { width, height };

  $: previewW = previewDims.width;
  $: previewH = previewDims.height;

  // Scale to fit ~360px wide preview area
  $: previewScale = Math.min(360 / previewW, 450 / previewH, 4);

  // Build a sample label for preview
  $: sampleLabel = ({
    id: 0,
    job_id: 0,
    field_values: Object.fromEntries(
      fields
        .filter(f => f.source !== 'total_length' && f.source !== 'client_name')
        .map(f => [f.label, f.default_value || f.label || 'Sample'])
    ),
    shape_preset: 'u-shape',
    shape_segments: [
      { length: 200, angle: 0 },
      { length: 500, angle: 90 },
      { length: 200, angle: 90 },
    ],
    copies: 1,
    sort_order: 0,
  }) as Label;

  function addField() {
    fields = [...fields, { label: '', field_type: 'text', default_value: '', font_size: 2, bold: false, layout: 'full', scope: 'label', source: 'manual' }];
  }

  function removeField(index: number) {
    fields = fields.filter((_, i) => i !== index);
  }

  function moveField(index: number, direction: -1 | 1) {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const newFields = [...fields];
    [newFields[index], newFields[newIdx]] = [newFields[newIdx], newFields[index]];
    fields = newFields;
  }

  async function handleLogoUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      updateSettings({ logo_image_path: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    updateSettings({ logo_image_path: '' });
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      sizing_mode: sizingMode,
      columns,
      rows,
      label_width_mm: width,
      label_height_mm: height,
      logo_enabled: logoEnabled,
      phone_enabled: phoneEnabled,
      fields,
    });
  }
</script>

<div class="template-editor">
  <div class="editor-form">
    <h3>{template.id ? 'Edit Template' : 'New Template'}</h3>

    <div class="form-group">
      <label>Template Name</label>
      <input type="text" bind:value={name} placeholder="e.g. Standard Stirrup Label" />
    </div>

    <!-- Label Sizing -->
    <div class="section">
      <h4>Label Size</h4>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" checked={sizingMode === 'fixed'} on:change={() => sizingMode = sizingMode === 'grid' ? 'fixed' : 'grid'} />
          Custom label dimensions (mm)
        </label>
      </div>

      {#if sizingMode === 'grid'}
        <div class="form-row">
          <div class="form-group">
            <label>Columns</label>
            <input type="number" bind:value={columns} min="1" max="20" step="1" />
          </div>
          <div class="form-group">
            <label>Rows</label>
            <input type="number" bind:value={rows} min="1" max="20" step="1" />
          </div>
        </div>
        <p class="hint">Labels will auto-size to fill the page in a {columns}&times;{rows} grid.</p>
      {:else}
        <div class="form-row">
          <div class="form-group">
            <label>Width (mm)</label>
            <input type="number" bind:value={width} min="20" max="500" step="5" />
          </div>
          <div class="form-group">
            <label>Height (mm)</label>
            <input type="number" bind:value={height} min="20" max="500" step="5" />
          </div>
        </div>
      {/if}
    </div>

    <!-- Branding -->
    <div class="section">
      <h4>Branding</h4>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={logoEnabled} />
          Show logo on labels
        </label>
      </div>

      {#if logoEnabled}
        <div class="logo-area">
          {#if logoSrc}
            <div class="logo-preview">
              <img src={logoSrc} alt="Logo" />
              <button class="logo-remove" on:click={clearLogo} title="Remove logo">
                <Icon name="trash" size={13} />
              </button>
            </div>
          {:else}
            <p class="hint">No logo uploaded yet.</p>
          {/if}
          <input type="file" accept="image/*" on:change={handleLogoUpload} class="file-input" />
        </div>
      {/if}

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={phoneEnabled} />
          Show phone number under logo
        </label>
        {#if phoneEnabled}
          <p class="hint">Company phone is set in Settings.</p>
        {/if}
      </div>
    </div>

    <!-- Fields -->
    <div class="fields-section">
      <div class="fields-header">
        <h4>Fields</h4>
        <button class="add-field-btn" on:click={addField}>+ Add Field</button>
      </div>

      {#if fields.length === 0}
        <p class="empty-fields">No fields yet. Click "Add Field" to define label content.</p>
      {/if}

      {#each fields as field, i}
        <div class="field-row">
          <div class="field-controls">
            <button class="move-btn" on:click={() => moveField(i, -1)} disabled={i === 0}>↑</button>
            <button class="move-btn" on:click={() => moveField(i, 1)} disabled={i === fields.length - 1}>↓</button>
          </div>
          <div class="field-inputs">
            <input
              type="text"
              class="field-name-input"
              placeholder="Field name (e.g. Client)"
              bind:value={field.label}
            />
            <select bind:value={field.field_type}>
              <option value="text">Text</option>
              <option value="number">Number</option>
            </select>
            <input
              type="text"
              class="field-default-input"
              placeholder="Default value"
              bind:value={field.default_value}
            />
            <select bind:value={field.font_size} title="Font size">
              <option value={1}>Small</option>
              <option value={2}>Medium</option>
              <option value={3}>Large</option>
            </select>
            <label class="bold-toggle" title="Bold">
              <input type="checkbox" bind:checked={field.bold} />
              <strong>B</strong>
            </label>
            <select bind:value={field.layout} title="Layout width" class="layout-select">
              <option value="full">Full</option>
              <option value="half">Half</option>
            </select>
            <select bind:value={field.scope} title="Field scope" class="scope-select" disabled={field.source === 'total_length' || field.source === 'client_name'}>
              <option value="label">Per label</option>
              <option value="job">Shared</option>
            </select>
            <select bind:value={field.source} title="Value source" class="source-select" on:change={() => { if (field.source === 'total_length') { field.scope = 'label'; field.field_type = 'number'; } if (field.source === 'client_name') { field.scope = 'job'; } }}>
              <option value="manual">Manual</option>
              <option value="total_length">Total Length</option>
              <option value="client_name">Client Name</option>
            </select>
          </div>
          <button class="remove-field-btn" on:click={() => removeField(i)}>&times;</button>
        </div>
      {/each}
    </div>

    <div class="form-actions">
      <button class="btn btn-save" on:click={handleSave} disabled={!name.trim()}>Save</button>
      <button class="btn btn-cancel" on:click={onCancel}>Cancel</button>
    </div>
  </div>

  <!-- Live preview sidebar -->
  <div class="preview-sidebar">
    <h4>Label Preview</h4>
    <div class="preview-card-wrapper">
      <LabelCard
        label={sampleLabel}
        {fields}
        widthMm={previewW}
        heightMm={previewH}
        scale={previewScale}
        logoSrc={logoEnabled ? logoSrc : null}
        {logoEnabled}
        {phoneEnabled}
        companyPhone={s.company_phone}
        clientName="Sample Client"
      />
    </div>
    <p class="preview-dims">
      {Math.round(previewW)} &times; {Math.round(previewH)} mm
    </p>
  </div>
</div>

<style>
  .template-editor {
    padding: var(--space-5);
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    gap: var(--space-6);
  }
  .editor-form {
    flex: 1;
    max-width: 800px;
    min-width: 0;
  }
  .preview-sidebar {
    width: 400px;
    flex-shrink: 0;
    position: sticky;
    top: var(--space-5);
    align-self: flex-start;
  }
  .preview-sidebar h4 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .preview-card-wrapper {
    background: var(--color-page-bg, #fff);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .preview-dims {
    text-align: center;
    font-size: var(--text-xs);
    color: var(--color-text-faint);
    margin-top: var(--space-1);
  }

  h3 {
    margin: 0 0 var(--space-4);
    font-size: var(--text-2xl);
    color: var(--color-text);
  }
  h4 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xl);
    color: var(--color-text-secondary);
  }
  .section {
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }
  .form-group {
    margin-bottom: var(--space-3);
  }
  .form-group label {
    display: block;
    font-size: var(--text-base);
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-1);
  }
  .form-group input[type="text"],
  .form-group input[type="number"] {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-md);
    font-size: var(--text-lg);
    box-sizing: border-box;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .form-row {
    display: flex;
    gap: var(--space-3);
  }
  .form-row .form-group {
    flex: 1;
  }
  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    font-size: var(--text-base) !important;
  }
  .hint {
    font-size: var(--text-sm);
    color: var(--color-text-faint);
    margin: var(--space-1) 0 0;
    line-height: 1.4;
  }

  /* Logo area */
  .logo-area {
    margin: var(--space-2) 0 var(--space-3);
    padding-left: var(--space-5);
  }
  .logo-preview {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  .logo-preview img {
    max-width: 100px;
    max-height: 48px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--space-1);
    background: var(--color-surface-alt);
  }
  .logo-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-danger);
    cursor: pointer;
  }
  .file-input {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  /* Fields */
  .fields-section {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
  }
  .fields-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }
  .add-field-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-primary-light);
    color: var(--color-primary);
    border: 1px solid var(--color-primary-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
    font-weight: 500;
    cursor: pointer;
  }
  .add-field-btn:hover {
    background: var(--color-primary-light);
  }
  .empty-fields {
    color: var(--color-text-faint);
    font-size: var(--text-base);
    text-align: center;
    padding: var(--space-4);
  }
  .field-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2);
    background: var(--color-surface-hover);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-2);
  }
  .field-controls {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .move-btn {
    padding: 1px 4px;
    font-size: 10px;
    background: var(--color-surface);
    border: 1px solid var(--color-input-border);
    border-radius: 3px;
    cursor: pointer;
    line-height: 1;
    color: var(--color-text);
  }
  .move-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .field-inputs {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    flex-wrap: wrap;
  }
  .field-name-input {
    width: 140px;
    padding: 6px 8px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
    background: var(--color-surface);
    color: var(--color-text);
  }
  .field-default-input {
    width: 120px;
    padding: 6px 8px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
    background: var(--color-surface);
    color: var(--color-text);
  }
  .field-inputs select {
    padding: 6px 8px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
    background: var(--color-surface);
    color: var(--color-text);
  }
  .bold-toggle {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: var(--text-base);
    cursor: pointer;
  }
  .bold-toggle input {
    display: none;
  }
  .bold-toggle strong {
    padding: 2px 5px;
    border: 1px solid var(--color-input-border);
    border-radius: 3px;
    color: var(--color-text-faint);
    font-size: var(--text-sm);
  }
  .bold-toggle input:checked + strong {
    background: var(--color-text);
    color: var(--color-text-inverse);
    border-color: var(--color-text);
  }
  .layout-select {
    width: 80px;
    font-size: var(--text-sm);
  }
  .scope-select {
    width: 100px;
    font-size: var(--text-sm);
  }
  .source-select {
    width: 110px;
    font-size: var(--text-sm);
  }
  .field-inputs select:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .remove-field-btn {
    background: none;
    border: none;
    color: var(--color-danger);
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
  }
  .form-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-6);
    justify-content: flex-end;
  }
  .btn {
    padding: var(--space-3) var(--space-6);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-lg);
    font-weight: 500;
    cursor: pointer;
  }
  .btn-save {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }
  .btn-save:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .btn-cancel {
    background: var(--color-surface-alt);
    color: var(--color-text-secondary);
  }
  .btn-cancel:hover {
    background: var(--color-border);
  }
</style>
