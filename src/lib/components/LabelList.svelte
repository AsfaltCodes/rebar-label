<script lang="ts">
  import { currentJob, labels, selectedLabelId, createNewLabel, deleteLabel, duplicateLabel, updateLabelById } from '$lib/stores/jobStore';
  import { PRESET_LABELS, type PresetName } from '$lib/shapes/presets';
  import { addToast } from '$lib/stores/toastStore';
  import Icon from './ui/Icon.svelte';
  import Button from './ui/Button.svelte';
  import ConfirmDialog from './ui/ConfirmDialog.svelte';

  $: job = $currentJob;
  $: allLabels = $labels;
  $: selId = $selectedLabelId;

  let deleteLabelConfirm = { open: false, id: 0, name: '' };

  function selectLabel(id: number) {
    selectedLabelId.set(id);
  }

  async function handleNew() {
    await createNewLabel();
    addToast('Label created', 'info');
  }

  async function handleDuplicate() {
    if (selId !== null) {
      await duplicateLabel(selId);
      addToast('Label duplicated', 'success');
    }
  }

  function promptDelete(id: number, name: string) {
    deleteLabelConfirm = { open: true, id, name };
  }

  async function confirmDelete() {
    await deleteLabel(deleteLabelConfirm.id);
    addToast('Label deleted', 'info');
  }

  function adjustCopies(label: any, delta: number) {
    const newCopies = Math.max(1, label.copies + delta);
    updateLabelById(label.id, { copies: newCopies });
  }

  /** Get a display name for a label: first non-empty field value, or "Label #N" */
  function getLabelName(label: any, index: number): string {
    if (job && job.fields.length > 0) {
      for (const field of job.fields) {
        const val = label.field_values[field.label];
        if (val && val.trim()) return val.trim();
      }
    }
    return `Label ${index + 1}`;
  }

  /** Get a one-line summary of key field values (up to 3, skip the first used as name) */
  function getLabelSummary(label: any): string {
    if (!job) return '';
    const parts: string[] = [];
    let skippedFirst = false;
    for (const field of job.fields) {
      if (parts.length >= 3) break;
      const val = label.field_values[field.label];
      if (val && val.trim()) {
        if (!skippedFirst) {
          skippedFirst = true;
          continue; // skip the first — it's already shown as the name
        }
        parts.push(val.trim());
      }
    }
    return parts.join(' \u00B7 ');
  }

  /** Get human-readable shape preset name */
  function getShapeName(label: any): string {
    if (!label.shape_preset || !label.shape_segments?.length) return '';
    return PRESET_LABELS[label.shape_preset as PresetName] || label.shape_preset;
  }
</script>

<div class="label-list">
  <div class="list-header">
    <span class="list-title">Labels</span>
    <span class="list-count">{allLabels.length}</span>
  </div>

  <div class="list-actions">
    <Button size="sm" variant="primary" on:click={handleNew} disabled={!job}>
      <Icon name="plus" size={14} />
      New
    </Button>
    <Button size="sm" variant="secondary" on:click={handleDuplicate} disabled={selId === null}>
      <Icon name="copy" size={14} />
      Dupe
    </Button>
  </div>

  <div class="list-scroll">
    {#if allLabels.length === 0}
      <div class="empty">
        {#if job}
          <p>No labels yet</p>
          <p class="empty-hint">Click "New" to create one</p>
        {:else}
          <p>No job open</p>
        {/if}
      </div>
    {:else}
      {#each allLabels as label, i (label.id)}
        {@const summary = getLabelSummary(label)}
        {@const shapeName = getShapeName(label)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="label-row"
          class:selected={label.id === selId}
          on:click={() => selectLabel(label.id)}
        >
          <div class="label-main">
            <div class="label-top-line">
              <span class="label-num">#{i + 1}</span>
              <span class="label-name">{getLabelName(label, i)}</span>
            </div>
            {#if summary || shapeName}
              <div class="label-summary">
                {#if shapeName}<span class="shape-name">{shapeName}</span>{/if}
                {#if shapeName && summary}<span class="sep">&middot;</span>{/if}
                {#if summary}<span class="summary-text">{summary}</span>{/if}
              </div>
            {/if}
          </div>
          <div class="label-controls">
            <div class="copies-inline">
              <button class="copies-btn" on:click|stopPropagation={() => adjustCopies(label, -1)} disabled={label.copies <= 1} title="Fewer copies">-</button>
              <span class="copies-count">{label.copies}</span>
              <button class="copies-btn" on:click|stopPropagation={() => adjustCopies(label, 1)} title="More copies">+</button>
            </div>
            <button
              class="delete-btn"
              on:click|stopPropagation={() => promptDelete(label.id, getLabelName(label, i))}
              title="Delete label"
            >
              <Icon name="trash" size={13} />
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<ConfirmDialog
  bind:open={deleteLabelConfirm.open}
  title="Delete Label"
  message={`Delete "${deleteLabelConfirm.name}"? This cannot be undone.`}
  confirmLabel="Delete"
  danger={true}
  onConfirm={confirmDelete}
/>

<style>
  .label-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface);
  }
  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-3) var(--space-2);
    flex-shrink: 0;
  }
  .list-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .list-count {
    font-size: var(--text-xs);
    color: var(--color-text-faint);
    background: var(--color-surface-alt);
    padding: 1px var(--space-2);
    border-radius: 99px;
    font-weight: 500;
  }
  .list-actions {
    display: flex;
    gap: var(--space-1);
    padding: 0 var(--space-2) var(--space-2);
    flex-shrink: 0;
  }
  .list-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 var(--space-1);
  }

  /* Label rows */
  .label-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-2);
    margin-bottom: 1px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-fast);
    position: relative;
  }
  .label-row:hover {
    background: var(--color-surface-hover);
  }
  .label-row.selected {
    background: var(--color-primary-light);
    border-left: 3px solid var(--color-primary);
    padding-left: calc(var(--space-2) - 3px);
  }

  .label-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .label-top-line {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
  }
  .label-num {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-weight: 600;
    min-width: 20px;
    text-align: right;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  .label-name {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .label-row.selected .label-name {
    color: var(--color-primary);
    font-weight: 500;
  }

  .label-summary {
    font-size: 10px;
    color: var(--color-text-faint);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding-left: 24px;
  }
  .shape-name {
    color: var(--color-primary);
    font-weight: 500;
  }
  .sep {
    margin: 0 3px;
    opacity: 0.5;
  }
  .summary-text {
    color: var(--color-text-faint);
  }

  .label-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }
  .copies-inline {
    display: flex;
    align-items: center;
    gap: 1px;
  }
  .copies-btn {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-alt);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    padding: 0;
    line-height: 1;
  }
  .copies-btn:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }
  .copies-btn:hover:not(:disabled) {
    background: var(--color-surface-hover);
    border-color: var(--color-input-border);
  }
  .copies-count {
    font-size: 10px;
    font-weight: 600;
    min-width: 14px;
    text-align: center;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    color: var(--color-text-faint);
    cursor: pointer;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    opacity: 0;
    transition: opacity var(--transition-fast), color var(--transition-fast);
  }
  .label-row:hover .delete-btn {
    opacity: 1;
  }
  .delete-btn:hover {
    color: var(--color-danger);
  }

  /* Empty state */
  .empty {
    text-align: center;
    padding: var(--space-6) var(--space-3);
    color: var(--color-text-faint);
    font-size: var(--text-sm);
  }
  .empty-hint {
    font-size: var(--text-xs);
    margin-top: var(--space-1);
  }
</style>
