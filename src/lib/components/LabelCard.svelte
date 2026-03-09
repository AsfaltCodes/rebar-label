<script lang="ts">
  import type { Label, FieldDef } from '$lib/db/types';
  import type { Segment } from '$lib/shapes/presets';
  import { renderSegments, boundsToViewBox } from '$lib/shapes/renderer';

  export let label: Label;
  export let fields: FieldDef[];
  export let jobFieldValues: Record<string, string> = {};
  export let widthMm: number;
  export let heightMm: number;
  export let selected: boolean = false;
  export let logoSrc: string | null = null;
  export let logoEnabled: boolean = false;
  export let phoneEnabled: boolean = false;
  export let companyPhone: string = '';
  export let scale: number = 1; // mm to px
  export let labelNumber: number | null = null;
  export let clientName: string = '';

  $: pxW = widthMm * scale;
  $: pxH = heightMm * scale;
  $: hasShape = label.shape_segments && label.shape_segments.length > 0;
  $: shapeData = hasShape ? renderSegments(label.shape_segments) : null;
  $: shapeViewBox = shapeData ? boundsToViewBox(shapeData.bounds) : '';

  // Scale-based font size instead of viewport-based
  $: baseFontPx = Math.max(5, Math.min(12, heightMm * scale * 0.04));

  // Adaptive zone flex values based on active zones
  $: showLogo = logoEnabled && logoSrc;
  $: showPhone = phoneEnabled && companyPhone;
  $: logoFlex = showLogo ? (hasShape ? 22 : 28) + (showPhone ? 12 : 0) : (showPhone ? 18 : 0);
  $: shapeFlex = hasShape ? (showLogo ? 35 : 40) : 0;
  $: fieldsFlex = 100 - logoFlex - shapeFlex;

  // Total length from shape segments
  $: totalLength = hasShape
    ? label.shape_segments.reduce((sum: number, s: Segment) => sum + (s.length || 0), 0)
    : 0;

  // Build rows: pair consecutive half-width fields together
  type FieldRow = { type: 'full'; field: FieldDef } | { type: 'pair'; left: FieldDef; right: FieldDef } | { type: 'half-single'; field: FieldDef };

  $: fieldRows = buildFieldRows(fields);

  function buildFieldRows(fields: FieldDef[]): FieldRow[] {
    const rows: FieldRow[] = [];
    let i = 0;
    while (i < fields.length) {
      const f = fields[i];
      if (f.layout === 'half') {
        // Look for a partner
        if (i + 1 < fields.length && fields[i + 1].layout === 'half') {
          rows.push({ type: 'pair', left: f, right: fields[i + 1] });
          i += 2;
        } else {
          rows.push({ type: 'half-single', field: f });
          i++;
        }
      } else {
        rows.push({ type: 'full', field: f });
        i++;
      }
    }
    return rows;
  }

  // Merge job-scoped, label-scoped, and computed values — Svelte tracks all dependencies
  $: computedValues = buildComputedValues(fields, totalLength, clientName);
  $: values = { ...(jobFieldValues || {}), ...(label.field_values || {}), ...computedValues };

  function buildComputedValues(fields: FieldDef[], totalLen: number, client: string): Record<string, string> {
    const computed: Record<string, string> = {};
    for (const f of fields) {
      if (f.source === 'total_length' && totalLen > 0) {
        computed[f.label] = `${totalLen} mm`;
      }
      if (f.source === 'client_name' && client) {
        computed[f.label] = client;
      }
    }
    return computed;
  }
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
  {#if showLogo || showPhone}
    <div class="logo-zone" style="flex:{logoFlex}">
      {#if showLogo}
        <img src={logoSrc} alt="Logo" class="logo-img" />
      {/if}
      {#if showPhone}
        <span class="phone-text" style="font-size:{Math.max(6, baseFontPx * 1.1)}px">{companyPhone}</span>
      {/if}
    </div>
  {/if}

  <div class="fields-zone" style="flex:{fieldsFlex}; font-size:{baseFontPx}px">
    {#each fieldRows as row}
      {#if row.type === 'full' || row.type === 'half-single'}
        {@const field = row.field}
        <div class="field-row">
          <span class="field-name">{field.label}</span>
          <span class="field-fill" class:bold={field.bold}>{values[field.label] || ''}<span class="field-line"></span></span>
        </div>
      {:else}
        <div class="field-row pair">
          <span class="field-half">
            <span class="field-name">{row.left.label}</span>
            <span class="field-fill" class:bold={row.left.bold}>{values[row.left.label] || ''}<span class="field-line"></span></span>
          </span>
          <span class="field-half">
            <span class="field-name">{row.right.label}</span>
            <span class="field-fill" class:bold={row.right.bold}>{values[row.right.label] || ''}<span class="field-line"></span></span>
          </span>
        </div>
      {/if}
    {/each}
  </div>

  {#if hasShape && shapeData}
    {@const boundsSpan = Math.max(shapeData.bounds.maxX - shapeData.bounds.minX, shapeData.bounds.maxY - shapeData.bounds.minY)}
    <div class="shape-zone" style="flex:{shapeFlex}">
      <svg width="100%" height="100%" viewBox={shapeViewBox} preserveAspectRatio="xMidYMid meet">
        <path
          d={shapeData.pathD}
          fill="none"
          style="stroke: var(--color-shape-stroke)"
          stroke-width={Math.max(3, boundsSpan * 0.025)}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        {#each shapeData.segmentMidpoints as mp}
          {@const perpRad = (mp.labelOffsetAngle * Math.PI) / 180}
          {@const offsetDist = boundsSpan * 0.08}
          <text
            x={mp.x + Math.cos(perpRad) * offsetDist}
            y={mp.y + Math.sin(perpRad) * offsetDist}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size={Math.max(8, boundsSpan * 0.08)}
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
    position: relative;
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
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    overflow: hidden;
    min-height: 0;
  }
  .logo-img {
    flex: 1;
    max-height: 70%;
    max-width: 85%;
    object-fit: contain;
  }
  .phone-text {
    color: var(--color-text);
    font-weight: 700;
    text-align: center;
    line-height: 1;
    white-space: nowrap;
  }
  .fields-zone {
    flex: 1;
    padding: 2px 3px;
    overflow: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1px;
  }
  .field-row {
    display: flex;
    align-items: baseline;
    line-height: 1.4;
  }
  .field-row.pair {
    gap: 4px;
  }
  .field-half {
    flex: 1;
    display: flex;
    align-items: baseline;
    min-width: 0;
  }
  .field-name {
    font-weight: 700;
    color: var(--color-text);
    white-space: nowrap;
    margin-right: 2px;
  }
  .field-fill {
    flex: 1;
    position: relative;
    color: var(--color-text);
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .field-fill.bold {
    font-weight: 600;
  }
  .field-line {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    border-bottom: 1px solid var(--color-text);
  }
  .shape-zone {
    border-top: 1px solid var(--color-border-light);
    padding: 2px;
    overflow: hidden;
    min-height: 0;
  }
</style>
