<script lang="ts">
  import type { Template, Job } from '$lib/db/types';
  import { PAGE_SIZES } from '$lib/db/types';
  import { settings } from '$lib/stores/settingsStore';
  import { showNewJobModal, currentScreen } from '$lib/stores/uiStore';
  import { addToast } from '$lib/stores/toastStore';
  import { _ } from '$lib/stores/i18n';
  import { generateJobName } from '$lib/utils/sessionName';
  import Icon from './ui/Icon.svelte';
  import Button from './ui/Button.svelte';

  export let onCreated: (job: Job) => void = () => {};

  let templates: Template[] = [];
  let selectedTemplateId: number | null = null;
  let jobName = '';
  let clientName = '';
  let editingName = false;

  // Re-initialize when modal opens — clear stale data first to avoid showing old templates
  $: if ($showNewJobModal) {
    editingName = false;
    clientName = '';
    templates = [];
    selectedTemplateId = null;
    loadData();
  }

  async function loadData() {
    try {
      const { db } = await import('$lib/db/api');
      templates = await db.listTemplates();
      const jobs = await db.listJobs();
      jobName = generateJobName(new Date(), jobs.map(j => ({ created_at: j.created_at })));
      if (templates.length > 0) {
        selectedTemplateId = templates[0].id;
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  }

  $: selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;

  async function handleCreate() {
    if (templates.length > 0 && !selectedTemplate) return;

    try {
      const { db } = await import('$lib/db/api');

      const page_size = selectedTemplate?.page_size || 'A4';
      const page_width_mm = selectedTemplate?.page_width_mm || 209;
      const page_height_mm = selectedTemplate?.page_height_mm || 295.275;
      const page_orientation = selectedTemplate?.page_orientation || 'portrait';

      const fields = selectedTemplate ? [...selectedTemplate.fields] : [];

      const job = await db.createJob({
        name: jobName.trim() || 'Untitled Job',
        client_name: clientName.trim(),
        notes: '',
        source_template_id: selectedTemplateId || 0,
        fields,
        job_field_values: {},
        sizing_mode: selectedTemplate?.sizing_mode || 'grid',
        columns: selectedTemplate?.columns || 2,
        rows: selectedTemplate?.rows || 5,
        label_width_mm: selectedTemplate?.label_width_mm || 80,
        label_height_mm: selectedTemplate?.label_height_mm || 50,
        logo_enabled: selectedTemplate?.logo_enabled || false,
        phone_enabled: selectedTemplate?.phone_enabled || false,
        page_size,
        page_width_mm,
        page_height_mm,
        page_orientation,
        margin_top_mm: selectedTemplate?.margin_top_mm || 0,
        margin_bottom_mm: selectedTemplate?.margin_bottom_mm || 0,
        margin_left_mm: selectedTemplate?.margin_left_mm || 0,
        margin_right_mm: selectedTemplate?.margin_right_mm || 0,
        label_gap_mm: selectedTemplate?.label_gap_mm || 0,
        printer_margin_mm: selectedTemplate?.printer_margin_mm ?? 4.5,
        field_padding_mm: selectedTemplate?.field_padding_mm ?? 6,
        length_unit: selectedTemplate?.length_unit || 'mm',
      });

      // Create first blank label
      const fieldValues: Record<string, string> = {};
      for (const f of fields) {
        fieldValues[f.label] = f.default_value || '';
      }
      await db.createLabel({
        job_id: job.id,
        field_values: fieldValues,
        shape_preset: 'straight',
        shape_segments: [{ length: 200, angle: 0 }],
        copies: 1,
        sort_order: 0,
      });

      showNewJobModal.set(false);
      onCreated(job);
      addToast('Job created', 'success');
    } catch (e) {
      console.error('Failed to create job:', e);
      addToast('Failed to create job', 'error');
    }
  }

  function handleCancel() {
    showNewJobModal.set(false);
  }

  function goToTemplates() {
    showNewJobModal.set(false);
    currentScreen.set('templates');
  }
</script>

{#if $showNewJobModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="overlay" on:click|self={handleCancel}>
    <div class="modal">
      <h3>{$_('newjob.title')}</h3>

      <!-- Auto-generated name, click to edit -->
      <div class="name-row">
        {#if editingName}
          <input
            type="text"
            class="name-input"
            bind:value={jobName}
            on:blur={() => (editingName = false)}
            on:keydown={(e) => e.key === 'Enter' && (editingName = false)}
            autofocus
          />
        {:else}
          <button class="name-display" on:click={() => (editingName = true)}>
            <span class="name-text">{jobName}</span>
            <Icon name="edit" size={13} />
          </button>
        {/if}
      </div>

      <!-- Client name -->
      <div class="form-group">
        <label>{$_('newjob.client_label')}</label>
        <input type="text" bind:value={clientName} placeholder="e.g. ABC Construction" />
      </div>

      {#if templates.length > 0}
        <div class="form-group">
          <label>{$_('newjob.template_label')}</label>
          <select bind:value={selectedTemplateId}>
            {#each templates as t}
              <option value={t.id}>{t.name} ({t.sizing_mode === 'grid' ? `${t.columns}×${t.rows} grid` : `${t.label_width_mm}×${t.label_height_mm}mm`}, {t.fields.length} fields)</option>
            {/each}
          </select>
        </div>

        <div class="form-actions">
          <Button variant="primary" on:click={handleCreate}>{$_('newjob.create_btn')}</Button>
          <Button variant="ghost" on:click={handleCancel}>{$_('modal.cancel')}</Button>
        </div>
      {:else}
        <div class="empty-templates">
          <p class="hint">{$_('newjob.empty_hint')}</p>
          <Button variant="primary" on:click={goToTemplates}>
            <Icon name="plus" size={14} />
            {$_('newjob.create_template_btn')}
          </Button>
          <Button variant="ghost" on:click={handleCancel}>{$_('modal.cancel')}</Button>
        </div>
      {/if}
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
    z-index: var(--z-modal);
  }
  .modal {
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    width: 400px;
    max-width: 90vw;
    box-shadow: var(--shadow-lg);
  }
  h3 {
    margin: 0 0 var(--space-4);
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-text);
  }

  /* Name row */
  .name-row {
    margin-bottom: var(--space-4);
  }
  .name-display {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--text-md);
    cursor: pointer;
    text-align: left;
    transition: border-color var(--transition-fast);
  }
  .name-display:hover {
    border-color: var(--color-input-focus);
  }
  .name-text {
    flex: 1;
  }
  .name-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-input-focus);
    border-radius: var(--radius-md);
    font-size: var(--text-md);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: 0 0 0 2px var(--color-input-focus-ring);
    box-sizing: border-box;
  }

  /* Form */
  .form-group {
    margin-bottom: var(--space-4);
  }
  .form-group label {
    display: block;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
  }
  .form-group select,
  .form-group input[type="text"] {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-md);
    font-size: var(--text-md);
    background: var(--color-surface);
    color: var(--color-text);
    box-sizing: border-box;
  }
  .form-group input[type="text"]:focus {
    outline: none;
    border-color: var(--color-input-focus);
    box-shadow: 0 0 0 2px var(--color-input-focus-ring);
  }
  .form-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
    margin-top: var(--space-4);
  }

  /* Empty templates state */
  .empty-templates {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) 0;
  }
  .hint {
    font-size: var(--text-sm);
    color: var(--color-text-faint);
    text-align: center;
    line-height: 1.4;
  }
</style>
