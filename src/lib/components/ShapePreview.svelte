<script lang="ts">
  import type { Segment } from '$lib/shapes/presets';
  import { renderSegments, boundsToViewBox } from '$lib/shapes/renderer';

  export let segments: Segment[] = [];
  export let width: number = 200;
  export let height: number = 120;

  $: renderData = renderSegments(segments);
  $: viewBox = boundsToViewBox(renderData.bounds);
</script>

{#if segments.length > 0}
  <svg {width} {height} viewBox={viewBox} class="shape-preview">
    <path
      d={renderData.pathD}
      fill="none"
      style="stroke: var(--color-shape-stroke)"
      stroke-width={Math.max(renderData.bounds.maxX - renderData.bounds.minX, renderData.bounds.maxY - renderData.bounds.minY) * 0.02}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    {#each renderData.segmentMidpoints as mp}
      <text
        x={mp.x}
        y={mp.y - (renderData.bounds.maxY - renderData.bounds.minY) * 0.05}
        text-anchor="middle"
        font-size={Math.max(renderData.bounds.maxX - renderData.bounds.minX, renderData.bounds.maxY - renderData.bounds.minY) * 0.07}
        style="fill: var(--color-shape-label)"
        font-family="Inter, sans-serif"
      >{mp.length}</text>
    {/each}
  </svg>
{:else}
  <div class="no-shape" style="width:{width}px;height:{height}px">
    No shape
  </div>
{/if}

<style>
  .shape-preview {
    display: block;
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }
  .no-shape {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-faint);
    font-size: 12px;
  }
</style>
