<script lang="ts">
  import { currentJob, selectedLabel, updateSelectedLabel, updateJob } from '$lib/stores/jobStore';
  import { saveStatus } from '$lib/stores/saveStatusStore';
  import { settings } from '$lib/stores/settingsStore';
  import type { Segment } from '$lib/shapes/presets';
  import type { FieldDef } from '$lib/db/types';
  import FieldInput from './FieldInput.svelte';
  import ShapeEditor from './ShapeEditor.svelte';
  import Icon from './ui/Icon.svelte';

  $: job = $currentJob;
  $: label = $selectedLabel;
  $: s = $settings;
  $: logoSrc = s.logo_image_path || null;
  $: totalLength = (label?.shape_segments || []).reduce((sum: number, s: any) => sum + (Number(s.length) || 0), 0);

  function isJobScoped(field: FieldDef): boolean {
    return field.scope === 'job';
  }

  function isComputed(field: FieldDef): boolean {
    return field.source === 'total_length' || field.source === 'client_name';
  }

  // Reactive lookup — Svelte tracks job, label, and totalLength dependencies
  $: fieldValues = buildFieldValues(job, label, totalLength);

  function buildFieldValues(jobData: any, labelData: any, totalLen: number): Record<string, string> {
    const vals: Record<string, string> = {};
    if (!jobData) return vals;
    for (const f of jobData.fields) {
      if (f.source === 'total_length') {
        vals[f.label] = totalLen > 0 ? `${totalLen} mm` : '—';
      } else if (f.source === 'client_name') {
        vals[f.label] = jobData.client_name || '—';
      } else if (f.scope === 'job') {
        vals[f.label] = jobData?.job_field_values?.[f.label] || '';
      } else {
        vals[f.label] = labelData?.field_values?.[f.label] || '';
      }
    }
    return vals;
  }

  function handleFieldChange(field: FieldDef, value: string) {
    if (isJobScoped(field)) {
      if (!job) return;
      const newValues = { ...(job.job_field_values || {}), [field.label]: value };
      updateJob({ job_field_values: newValues });
    } else {
      if (!label) return;
      const newValues = { ...label.field_values, [field.label]: value };
      updateSelectedLabel({ field_values: newValues });
    }
  }

  function handleShapeChange(preset: string | null, segs: Segment[]) {
    updateSelectedLabel({ shape_preset: preset, shape_segments: segs });
  }

  function handleCopiesChange(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value) || 1;
    updateSelectedLabel({ copies: Math.max(1, val) });
  }
</script>

<div class="label-editor">
  {#if job && label}
    <div class="editor-header">
      <span class="editor-title">Label #{label.sort_order + 1}</span>
      <span class="save-indicator" class:visible={$saveStatus !== 'idle'}>
        {#if $saveStatus === 'saving'}
          Saving...
        {:else if $saveStatus === 'saved'}
          <Icon name="check" size={12} /> Saved
        {:else if $saveStatus === 'error'}
          Save failed
        {/if}
      </span>
    </div>

    {#if job.logo_enabled && !logoSrc}
      <div class="warning-hint">Logo enabled but not uploaded — set in Settings.</div>
    {/if}
    {#if job.phone_enabled && !s.company_phone}
      <div class="warning-hint">Phone enabled but not set — configure in Settings.</div>
    {/if}

    <div class="section">
      <div class="section-header">Fields</div>
      <div class="fields-list">
        {#each job.fields as field}
          <div class="field-wrapper">
            {#if isComputed(field)}
              <FieldInput
                {field}
                value={fieldValues[field.label] || '—'}
                readonly={true}
              />
              <span class="computed-badge" title="Auto-calculated from shape segments">auto</span>
            {:else}
              <FieldInput
                {field}
                value={fieldValues[field.label] || ''}
                onChange={(v) => handleFieldChange(field, v)}
              />
              {#if isJobScoped(field)}
                <span class="shared-badge" title="Shared across all labels in this job">shared</span>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <div class="section">
      <ShapeEditor
        shapePreset={label.shape_preset}
        segments={label.shape_segments}
        onChange={handleShapeChange}
      />
      {#if totalLength > 0}
        <div class="total-length">
          Total Length: <strong>{totalLength} mm</strong>
        </div>
      {/if}
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
      <p>No label selected</p>
      <p class="empty-hint">Select a label from the list or create a new one</p>
    </div>
  {:else}
    <div class="empty-state">
      <p>No job open</p>
      <p class="empty-hint">Create or open a job to start editing</p>
    </div>
  {/if}
</div>

<style>
  .label-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
    height: 100%;
    overflow-y: auto;
  }
  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .editor-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .save-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-faint);
    opacity: 0;
    transition: opacity var(--transition-normal);
  }
  .save-indicator.visible {
    opacity: 1;
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .section-header {
    font-weight: 600;
    font-size: var(--text-base);
    color: var(--color-text);
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--color-border);
  }
  .fields-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .field-wrapper {
    position: relative;
  }
  .shared-badge {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 9px;
    color: var(--color-primary);
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  .computed-badge {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 9px;
    color: var(--color-text-faint);
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  .copies-section {
    padding-top: var(--space-1);
  }
  .copies-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-base);
    font-weight: 500;
    color: var(--color-text-secondary);
  }
  .copies-input {
    width: 60px;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
    text-align: center;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .copies-input:focus {
    outline: none;
    border-color: var(--color-input-focus);
    box-shadow: 0 0 0 2px var(--color-input-focus-ring);
  }
  .warning-hint {
    font-size: var(--text-xs);
    color: var(--color-warning, #e0a030);
    background: rgba(255, 170, 0, 0.08);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    border-left: 2px solid var(--color-warning, #e0a030);
    line-height: 1.4;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-7) var(--space-4);
    color: var(--color-text-faint);
    font-size: var(--text-md);
    flex: 1;
  }
  .empty-hint {
    font-size: var(--text-sm);
    margin-top: var(--space-1);
  }
</style>
