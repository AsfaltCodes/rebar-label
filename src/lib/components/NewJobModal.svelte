<script lang="ts">
  import { onMount } from 'svelte';
  import type { Template, Job } from '$lib/db/types';
  import { PAGE_SIZES } from '$lib/db/types';
  import { settings } from '$lib/stores/settingsStore';
  import { showNewJobModal } from '$lib/stores/uiStore';

  export let onCreated: (job: Job) => void = () => {};

  let templates: Template[] = [];
  let selectedTemplateId: number | null = null;
  let jobName = '';
  let pageSize = $settings.default_page_size || 'A4';
  let orientation: 'portrait' | 'landscape' = 'portrait';
  let customWidth = 210;
  let customHeight = 297;

  onMount(async () => {
    try {
      const { db } = await import('$lib/db/api');
      templates = await db.listTemplates();
      if (templates.length > 0) {
        selectedTemplateId = templates[0].id;
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  });

  $: selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
  $: pageDims = pageSize === 'custom'
    ? { width: customWidth, height: customHeight }
    : PAGE_SIZES[pageSize] || PAGE_SIZES['A4'];
  $: effectiveWidth = orientation === 'landscape' ? pageDims.height : pageDims.width;
  $: effectiveHeight = orientation === 'landscape' ? pageDims.width : pageDims.height;

  async function handleCreate() {
    if (!jobName.trim()) return;
    if (!selectedTemplate && templates.length > 0) return;

    try {
      const { db } = await import('$lib/db/api');

      const fields = selectedTemplate ? [...selectedTemplate.fields] : [];
      const labelW = selectedTemplate ? selectedTemplate.label_width_mm : 80;
      const labelH = selectedTemplate ? selectedTemplate.label_height_mm : 50;
      const logoEnabled = selectedTemplate ? selectedTemplate.logo_enabled : false;

      const job = await db.createJob({
        name: jobName.trim(),
        source_template_id: selectedTemplateId || 0,
        fields,
        label_width_mm: labelW,
        label_height_mm: labelH,
        logo_enabled: logoEnabled,
        page_size: pageSize,
        page_width_mm: effectiveWidth,
        page_height_mm: effectiveHeight,
        page_orientation: orientation,
      });

      // Create first blank label
      const fieldValues: Record<string, string> = {};
      for (const f of fields) {
        fieldValues[f.label] = f.default_value || '';
      }
      await db.createLabel({
        job_id: job.id,
        field_values: fieldValues,
        shape_preset: null,
        shape_segments: [],
        copies: 1,
        sort_order: 0,
      });

      showNewJobModal.set(false);
      onCreated(job);
    } catch (e) {
      console.error('Failed to create job:', e);
    }
  }

  function handleCancel() {
    showNewJobModal.set(false);
  }
</script>

{#if $showNewJobModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="overlay" on:click|self={handleCancel}>
    <div class="modal">
      <h3>New Job</h3>

      <div class="form-group">
        <label>Job Name</label>
        <input type="text" bind:value={jobName} placeholder="e.g. Bridge Project Batch 3" autofocus />
      </div>

      {#if templates.length > 0}
        <div class="form-group">
          <label>Template</label>
          <select bind:value={selectedTemplateId}>
            {#each templates as t}
              <option value={t.id}>{t.name} ({t.label_width_mm}×{t.label_height_mm}mm, {t.fields.length} fields)</option>
            {/each}
          </select>
        </div>
      {:else}
        <p class="hint">No templates yet. Job will start with no fields. Create a template first for better results.</p>
      {/if}

      <div class="form-row">
        <div class="form-group">
          <label>Page Size</label>
          <select bind:value={pageSize}>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="Letter">Letter</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div class="form-group">
          <label>Orientation</label>
          <select bind:value={orientation}>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
      </div>

      {#if pageSize === 'custom'}
        <div class="form-row">
          <div class="form-group">
            <label>Width (mm)</label>
            <input type="number" bind:value={customWidth} min="50" max="1000" />
          </div>
          <div class="form-group">
            <label>Height (mm)</label>
            <input type="number" bind:value={customHeight} min="50" max="1000" />
          </div>
        </div>
      {/if}

      <div class="page-summary">
        Page: {effectiveWidth} × {effectiveHeight} mm
        {#if selectedTemplate}
          · Labels: {selectedTemplate.label_width_mm} × {selectedTemplate.label_height_mm} mm
        {/if}
      </div>

      <div class="form-actions">
        <button class="btn btn-create" on:click={handleCreate} disabled={!jobName.trim()}>Create Job</button>
        <button class="btn btn-cancel" on:click={handleCancel}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--color-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
  }
  .modal {
    background: var(--color-surface);
    border-radius: 12px;
    padding: 24px;
    width: 420px;
    max-width: 90vw;
    box-shadow: var(--shadow-lg);
  }
  h3 {
    margin: 0 0 16px;
    font-size: 18px;
    color: var(--color-text);
  }
  .form-group {
    margin-bottom: 12px;
  }
  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-muted);
    margin-bottom: 4px;
  }
  .form-group input,
  .form-group select {
    width: 100%;
    padding: 8px 10px;
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
  .hint {
    font-size: 12px;
    color: var(--color-warning);
    background: var(--color-warning-bg);
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 12px;
  }
  .page-summary {
    font-size: 12px;
    color: var(--color-text-muted);
    padding: 8px 0;
  }
  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
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
  .btn-create {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }
  .btn-create:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .btn-create:disabled {
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
