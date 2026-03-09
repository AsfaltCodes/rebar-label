<script lang="ts">
  import { currentJob, labels, selectedLabelId, selectedLabelIds, createNewLabel, deleteLabels, duplicateLabel, updateLabelById } from '$lib/stores/jobStore';
  import { PRESET_LABELS, type PresetName } from '$lib/shapes/presets';
  import { addToast } from '$lib/stores/toastStore';
  import { _ } from '$lib/stores/i18n';
  import Icon from './ui/Icon.svelte';
  import Button from './ui/Button.svelte';

  $: job = $currentJob;
  $: allLabels = $labels;
  $: selId = $selectedLabelId;
  $: selIds = $selectedLabelIds;

  let lastSelectedIdx = 0;

  function handleSelectLabel(e: MouseEvent, id: number, index: number) {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    if (isShift) {
      const start = Math.min(lastSelectedIdx, index);
      const end = Math.max(lastSelectedIdx, index);
      const newSelected = new Set(isCtrl ? $selectedLabelIds : []);
      for (let i = start; i <= end; i++) {
        newSelected.add(allLabels[i].id);
      }
      selectedLabelIds.set(newSelected);
      selectedLabelId.set(id);
    } else if (isCtrl) {
      const newSelected = new Set($selectedLabelIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
        if (newSelected.size === 0) {
          selectedLabelId.set(null);
        } else if ($selectedLabelId === id) {
          selectedLabelId.set(Array.from(newSelected)[0]);
        }
      } else {
        newSelected.add(id);
        selectedLabelId.set(id);
      }
      selectedLabelIds.set(newSelected);
      lastSelectedIdx = index;
    } else {
      selectedLabelIds.set(new Set([id]));
      selectedLabelId.set(id);
      lastSelectedIdx = index;
    }
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

  async function performDelete(id: number) {
    const idsToDelete = (selIds.has(id) && selIds.size > 1) ? Array.from(selIds) : [id];
    await deleteLabels(idsToDelete);
    addToast(idsToDelete.length > 1 ? `Deleted ${idsToDelete.length} labels` : 'Label deleted', 'info');
  }

  function handleWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Delete' && selIds.size > 0) {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        const id = Array.from(selIds)[0];
        performDelete(id);
      }
    }
  }

  function getLabelName(label: any, index: number): string {
    if (job && job.fields.length > 0) {
      for (const field of job.fields) {
        const val = label.field_values[field.label];
        if (val && val.trim()) return val.trim();
      }
    }
    return `Label ${index + 1}`;
  }

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
          continue;
        }
        parts.push(val.trim());
      }
    }
    return parts.join(' \u00B7 ');
  }

  function getShapeName(label: any): string {
    if (!label.shape_preset || !label.shape_segments?.length) return '';
    const key = 'shape.preset_' + label.shape_preset;
    const translated = $_(key);
    return translated !== key ? translated : label.shape_preset;
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<div class="label-list">
  <div class="list-header">
    <span class="list-title">{$_('lbl_list.title')}</span>
    <span class="list-count">{allLabels.length}</span>
  </div>

  <div class="list-actions">
    <Button size="sm" variant="primary" on:click={handleNew} disabled={!job}>
      <Icon name="plus" size={14} />
      {$_('lbl_list.new')}
    </Button>
    <Button size="sm" variant="secondary" on:click={handleDuplicate} disabled={selId === null}>
      <Icon name="copy" size={14} />
      {$_('lbl_list.dupe')}
    </Button>
  </div>

  <div class="list-scroll">
    {#if allLabels.length === 0}
      <div class="empty">
        {#if job}
          <p>{$_('lbl_list.empty')}</p>
          <p class="empty-hint">{$_('lbl_list.empty_hint')}</p>
        {:else}
          <p>{$_('lbl_list.no_job')}</p>
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
          class:selected={selIds.has(label.id)}
          on:click={(e) => handleSelectLabel(e, label.id, i)}
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
            <button
              class="delete-btn"
              on:click|stopPropagation={() => performDelete(label.id)}
              title={$_('common.delete')}
            >
              <Icon name="trash" size={13} />
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

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