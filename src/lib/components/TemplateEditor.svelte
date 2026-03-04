<script lang="ts">
  import type { Template, FieldDef } from '$lib/db/types';

  export let template: Partial<Template> = {
    name: '',
    label_width_mm: 80,
    label_height_mm: 50,
    logo_enabled: false,
    fields: [],
  };
  export let onSave: (data: Partial<Template>) => void = () => {};
  export let onCancel: () => void = () => {};

  let name = template.name || '';
  let width = template.label_width_mm || 80;
  let height = template.label_height_mm || 50;
  let logoEnabled = template.logo_enabled || false;
  let fields: FieldDef[] = template.fields ? [...template.fields] : [];

  function addField() {
    fields = [...fields, { label: '', field_type: 'text', default_value: '', font_size: 2, bold: false }];
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

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      label_width_mm: width,
      label_height_mm: height,
      logo_enabled: logoEnabled,
      fields,
    });
  }
</script>

<div class="template-editor">
  <h3>{template.id ? 'Edit Template' : 'New Template'}</h3>

  <div class="form-group">
    <label>Template Name</label>
    <input type="text" bind:value={name} placeholder="e.g. Standard Stirrup Label" />
  </div>

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

  <div class="form-group">
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={logoEnabled} />
      Show logo on labels
    </label>
  </div>

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

<style>
  .template-editor {
    padding: 20px;
    max-width: 640px;
    margin: 0 auto;
  }
  h3 {
    margin: 0 0 16px;
    font-size: 18px;
    color: var(--color-text);
  }
  h4 {
    margin: 0;
    font-size: 14px;
    color: var(--color-text-secondary);
  }
  .form-group {
    margin-bottom: 12px;
  }
  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 4px;
  }
  .form-group input[type="text"],
  .form-group input[type="number"] {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid var(--color-input-border);
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .form-row {
    display: flex;
    gap: 12px;
  }
  .form-row .form-group {
    flex: 1;
  }
  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px !important;
  }
  .fields-section {
    margin-top: 16px;
    border-top: 1px solid var(--color-border);
    padding-top: 12px;
  }
  .fields-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .add-field-btn {
    padding: 4px 12px;
    background: var(--color-primary-light);
    color: var(--color-primary);
    border: 1px solid var(--color-primary-border);
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }
  .add-field-btn:hover {
    background: var(--color-primary-light);
  }
  .empty-fields {
    color: var(--color-text-faint);
    font-size: 13px;
    text-align: center;
    padding: 16px;
  }
  .field-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px;
    background: var(--color-surface-hover);
    border-radius: 6px;
    margin-bottom: 4px;
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
    gap: 4px;
    flex: 1;
    flex-wrap: wrap;
  }
  .field-name-input {
    width: 120px;
    padding: 4px 6px;
    border: 1px solid var(--color-input-border);
    border-radius: 4px;
    font-size: 12px;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .field-default-input {
    width: 100px;
    padding: 4px 6px;
    border: 1px solid var(--color-input-border);
    border-radius: 4px;
    font-size: 12px;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .field-inputs select {
    padding: 4px 6px;
    border: 1px solid var(--color-input-border);
    border-radius: 4px;
    font-size: 12px;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .bold-toggle {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 13px;
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
    font-size: 12px;
  }
  .bold-toggle input:checked + strong {
    background: var(--color-text);
    color: var(--color-text-inverse);
    border-color: var(--color-text);
  }
  .remove-field-btn {
    background: none;
    border: none;
    color: var(--color-danger);
    font-size: 18px;
    cursor: pointer;
    padding: 2px 6px;
    line-height: 1;
  }
  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 20px;
    justify-content: flex-end;
  }
  .btn {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
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
