<script lang="ts">
  import { currentJob, labels, selectedLabelId, deleteLabel } from '$lib/stores/jobStore';
  import { settings } from '$lib/stores/settingsStore';
  import { currentPage } from '$lib/stores/uiStore';
  import { calculateLayout } from '$lib/layout/engine';
  import { PAGE_SIZES } from '$lib/db/types';
  import LabelCard from './LabelCard.svelte';

  $: job = $currentJob;
  $: allLabels = $labels;
  $: s = $settings;
  $: page = $currentPage;

  // Calculate page dimensions
  $: pageW = job ? job.page_width_mm : 210;
  $: pageH = job ? job.page_height_mm : 297;
  $: labelW = job ? job.label_width_mm : 80;
  $: labelH = job ? job.label_height_mm : 50;

  $: layout = job
    ? calculateLayout(
        pageW, pageH,
        s.margin_top_mm, s.margin_bottom_mm,
        s.margin_left_mm, s.margin_right_mm,
        labelW, labelH,
        s.label_gap_mm,
        allLabels.map(l => ({ copies: l.copies }))
      )
    : null;

  // Scale page to fit container
  let containerEl: HTMLDivElement;
  let containerWidth = 600;
  let containerHeight = 500;

  $: scale = layout
    ? Math.min(
        (containerWidth - 40) / pageW,
        (containerHeight - 60) / pageH,
        4 // max scale
      )
    : 2;

  // Positions for current page
  $: pagePositions = layout
    ? layout.positions.filter(p => p.page === page)
    : [];

  function handleResize() {
    if (containerEl) {
      containerWidth = containerEl.clientWidth;
      containerHeight = containerEl.clientHeight;
    }
  }

  function selectLabel(labelIndex: number) {
    if (allLabels[labelIndex]) {
      selectedLabelId.set(allLabels[labelIndex].id);
    }
  }

  function handleContextMenu(e: MouseEvent, labelIndex: number) {
    e.preventDefault();
    if (allLabels[labelIndex] && confirm('Delete this label?')) {
      deleteLabel(allLabels[labelIndex].id);
    }
  }

  function prevPage() {
    if (page > 0) currentPage.set(page - 1);
  }

  function nextPage() {
    if (layout && page < layout.totalPages - 1) currentPage.set(page + 1);
  }

  // Get logo data url if available
  $: logoSrc = s.logo_image_path || null;
</script>

<svelte:window on:resize={handleResize} />

<div class="page-preview" bind:this={containerEl}>
  {#if job && layout}
    <div class="page-container">
      <div
        class="page"
        style="width:{pageW * scale}px;height:{pageH * scale}px"
      >
        {#each pagePositions as pos}
          {@const label = allLabels[pos.labelIndex]}
          {#if label}
            <div
              class="label-slot"
              style="left:{pos.x * scale}px;top:{pos.y * scale}px"
            >
              <LabelCard
                {label}
                fields={job.fields}
                widthMm={labelW}
                heightMm={labelH}
                {scale}
                selected={label.id === $selectedLabelId}
                {logoSrc}
                logoEnabled={job.logo_enabled}
                on:click={() => selectLabel(pos.labelIndex)}
                on:contextmenu={(e) => handleContextMenu(e, pos.labelIndex)}
              />
            </div>
          {/if}
        {/each}
      </div>
    </div>

    <div class="page-controls">
      <button class="page-btn" on:click={prevPage} disabled={page === 0}>&larr;</button>
      <span class="page-info">Page {page + 1} of {layout.totalPages}</span>
      <button class="page-btn" on:click={nextPage} disabled={page >= layout.totalPages - 1}>&rarr;</button>

      <div class="page-size-display">
        {job.page_size} &middot; {job.page_orientation}
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <p>No job open</p>
    </div>
  {/if}
</div>

<style>
  .page-preview {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-preview-bg);
    overflow: hidden;
  }
  .page-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    padding: 16px;
  }
  .page {
    position: relative;
    background: var(--color-page-bg);
    box-shadow: var(--shadow-lg);
    border-radius: 2px;
    flex-shrink: 0;
  }
  .label-slot {
    position: absolute;
  }
  .page-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 8px 16px;
    background: var(--color-surface);
    color: var(--color-text);
    border-top: 1px solid var(--color-input-border);
    flex-shrink: 0;
  }
  .page-btn {
    padding: 4px 10px;
    border: 1px solid var(--color-input-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    font-size: 14px;
  }
  .page-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .page-btn:hover:not(:disabled) {
    background: var(--color-surface-hover);
  }
  .page-info {
    font-size: 13px;
    color: var(--color-text-secondary);
    min-width: 100px;
    text-align: center;
  }
  .page-size-display {
    font-size: 12px;
    color: var(--color-text-faint);
    margin-left: auto;
  }
  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-faint);
    font-size: 14px;
  }
</style>
