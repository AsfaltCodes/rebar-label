<script lang="ts">
  import { currentJob, selectedLabel, selectedLabelId, labels, createNewLabel, deleteLabel, updateSelectedLabel } from '$lib/stores/jobStore';
  import type { Segment } from '$lib/shapes/presets';
  import FieldInput from './FieldInput.svelte';
  import ShapeEditor from './ShapeEditor.svelte';

  $: job = $currentJob;
  $: label = $selectedLabel;

  function handleFieldChange(fieldLabel: string, value: string) {
    if (!label) return;
    const newValues = { ...label.field_values, [fieldLabel]: value };
    updateSelectedLabel({ field_values: newValues });
  }

  function handleShapeChange(preset: string | null, segs: Segment[]) {
    updateSelectedLabel({ shape_preset: preset, shape_segments: segs });
  }

  function handleCopiesChange(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value) || 1;
    updateSelectedLabel({ copies: Math.max(1, val) });
  }

  async function handleNewLabel() {
    await createNewLabel();
  }

  async function handleDelete() {
    if (label) {
      await deleteLabel(label.id);
    }
  }
</script>

<div class="label-editor">
  {#if job && label}
    <div class="section">
      <div class="section-header">Fields</div>
      <div class="fields-list">
        {#each job.fields as field}
          <FieldInput
            {field}
            value={label.field_values[field.label] || ''}
            onChange={(v) => handleFieldChange(field.label, v)}
          />
        {/each}
      </div>
    </div>

    <div class="section">
      <ShapeEditor
        shapePreset={label.shape_preset}
        segments={label.shape_segments}
        onChange={handleShapeChange}
      />
    </div>

    <div class="section copies-section">
      <label class="copies-label">
        Copies:
        <input
          type="number"
          class="copies-input"
          value={label.copies}
          on:input={handleCopiesChange}
          min="1"
          max="999"
        />
      </label>
    </div>
  {:else if job}
    <div class="empty-state">
      <p>No label selected.</p>
      <p>Click <strong>+ New Label</strong> to create one.</p>
    </div>
  {:else}
    <div class="empty-state">
      <p>No job open.</p>
      <p>Create or open a job to start editing labels.</p>
    </div>
  {/if}

  <div class="actions">
    <button class="btn btn-add" on:click={handleNewLabel} disabled={!job}>
      + New Label
    </button>
    <button class="btn btn-delete" on:click={handleDelete} disabled={!label}>
      Delete
    </button>
  </div>
</div>

<style>
  .label-editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    height: 100%;
    overflow-y: auto;
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .section-header {
    font-weight: 600;
    font-size: 13px;
    color: var(--color-text);
    padding-bottom: 4px;
    border-bottom: 1px solid var(--color-border);
  }
  .fields-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .copies-section {
    padding-top: 4px;
  }
  .copies-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }
  .copies-input {
    width: 60px;
    padding: 4px 8px;
    border: 1px solid var(--color-input-border);
    border-radius: 4px;
    font-size: 13px;
    text-align: center;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
  }
  .btn {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .btn-add {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }
  .btn-add:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .btn-delete {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
  .btn-delete:hover:not(:disabled) {
    background: var(--color-danger-border);
  }
  .empty-state {
    text-align: center;
    padding: 32px 16px;
    color: var(--color-text-faint);
    font-size: 13px;
  }
  .empty-state p {
    margin: 4px 0;
  }
</style>
