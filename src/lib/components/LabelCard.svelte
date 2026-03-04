<script lang="ts">
  import type { Label, FieldDef } from '$lib/db/types';
  import type { Segment } from '$lib/shapes/presets';
  import { renderSegments, boundsToViewBox } from '$lib/shapes/renderer';

  export let label: Label;
  export let fields: FieldDef[];
  export let widthMm: number;
  export let heightMm: number;
  export let selected: boolean = false;
  export let logoSrc: string | null = null;
  export let logoEnabled: boolean = false;
  export let scale: number = 1; // mm to px

  $: pxW = widthMm * scale;
  $: pxH = heightMm * scale;
  $: hasShape = label.shape_segments && label.shape_segments.length > 0;
  $: shapeData = hasShape ? renderSegments(label.shape_segments) : null;
  $: shapeViewBox = shapeData ? boundsToViewBox(shapeData.bounds) : '';
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="label-card"
  class:selected
  style="width:{pxW}px;height:{pxH}px"
  on:click
  on:contextmenu
>
  {#if logoEnabled && logoSrc}
    <div class="logo-zone">
      <img src={logoSrc} alt="Logo" class="logo-img" />
    </div>
  {/if}

  <div class="fields-zone">
    <table class="fields-table">
      {#each fields as field}
        <tr>
          <td class="field-label">{field.label}:</td>
          <td class="field-value" class:bold={field.bold}>
            {label.field_values[field.label] || ''}
          </td>
        </tr>
      {/each}
    </table>
  </div>

  {#if hasShape && shapeData}
    <div class="shape-zone">
      <svg width="100%" height="100%" viewBox={shapeViewBox} preserveAspectRatio="xMidYMid meet">
        <path
          d={shapeData.pathD}
          fill="none"
          style="stroke: var(--color-shape-stroke)"
          stroke-width={Math.max(shapeData.bounds.maxX - shapeData.bounds.minX, shapeData.bounds.maxY - shapeData.bounds.minY) * 0.025}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        {#each shapeData.segmentMidpoints as mp}
          <text
            x={mp.x}
            y={mp.y - (shapeData.bounds.maxY - shapeData.bounds.minY) * 0.06}
            text-anchor="middle"
            font-size={Math.max(shapeData.bounds.maxX - shapeData.bounds.minX, shapeData.bounds.maxY - shapeData.bounds.minY) * 0.08}
            style="fill: var(--color-shape-label)"
            font-family="Inter, sans-serif"
          >{mp.length}</text>
        {/each}
      </svg>
    </div>
  {/if}
</div>

<style>
  .label-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.15s, border-color 0.15s;
    font-family: 'Inter', sans-serif;
  }
  .label-card:hover {
    border-color: var(--color-text-faint);
  }
  .label-card.selected {
    border-color: var(--color-selected-border);
    box-shadow: 0 0 0 2px var(--color-selected-glow);
  }
  .logo-zone {
    padding: 2px;
    text-align: center;
    border-bottom: 1px solid var(--color-border-light);
    flex-shrink: 0;
    max-height: 20%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo-img {
    max-height: 100%;
    max-width: 80%;
    object-fit: contain;
  }
  .fields-zone {
    flex: 1;
    padding: 2px 3px;
    overflow: hidden;
    min-height: 0;
  }
  .fields-table {
    width: 100%;
    border-collapse: collapse;
    font-size: clamp(5px, 1.2vw, 10px);
    line-height: 1.3;
  }
  .field-label {
    color: var(--color-text-muted);
    white-space: nowrap;
    padding-right: 3px;
    vertical-align: top;
    width: 40%;
  }
  .field-value {
    color: var(--color-text);
    word-break: break-word;
  }
  .field-value.bold {
    font-weight: 600;
  }
  .shape-zone {
    flex-shrink: 0;
    height: 35%;
    border-top: 1px solid var(--color-border-light);
    padding: 2px;
  }
</style>
