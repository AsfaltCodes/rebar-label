<script lang="ts">
  import type { Segment } from '$lib/shapes/presets';
  import { type PresetName, PRESET_LABELS, getPresetSegments } from '$lib/shapes/presets';
  import ShapePreview from './ShapePreview.svelte';

  export let shapePreset: string | null = null;
  export let segments: Segment[] = [];
  export let onChange: (preset: string | null, segs: Segment[]) => void = () => {};

  const presetNames = Object.keys(PRESET_LABELS) as PresetName[];
  let noShape = shapePreset === null && segments.length === 0;

  function handlePresetChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as PresetName;
    shapePreset = val;
    segments = getPresetSegments(val);
    noShape = false;
    onChange(shapePreset, segments);
  }

  function handleSegmentChange(index: number, field: 'length' | 'angle', value: number) {
    segments = segments.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    onChange(shapePreset, segments);
  }

  function addSegment() {
    segments = [...segments, { length: 200, angle: 90 }];
    onChange(shapePreset, segments);
  }

  function removeSegment(index: number) {
    segments = segments.filter((_, i) => i !== index);
    onChange(shapePreset, segments);
  }

  function toggleNoShape() {
    noShape = !noShape;
    if (noShape) {
      shapePreset = null;
      segments = [];
      onChange(null, []);
    }
  }
</script>

<div class="shape-editor">
  <div class="section-header">Shape</div>

  <label class="no-shape-toggle">
    <input type="checkbox" checked={noShape} on:change={toggleNoShape} />
    No shape
  </label>

  {#if !noShape}
    <div class="preset-row">
      <label>
        Preset:
        <select value={shapePreset || 'custom'} on:change={handlePresetChange}>
          {#each presetNames as p}
            <option value={p}>{PRESET_LABELS[p]}</option>
          {/each}
        </select>
      </label>
    </div>

    <ShapePreview {segments} width={220} height={130} />

    <div class="segments-list">
      <div class="seg-header">Segments:</div>
      {#each segments as seg, i}
        <div class="seg-row">
          <span class="seg-num">{i + 1}:</span>
          <input
            type="number"
            class="seg-input"
            value={seg.length}
            on:input={(e) => handleSegmentChange(i, 'length', parseFloat(e.currentTarget.value) || 0)}
            min="0"
            step="10"
          />
          <span class="seg-unit">mm</span>
          <span class="seg-sep">/</span>
          <input
            type="number"
            class="seg-input seg-angle"
            value={seg.angle}
            on:input={(e) => handleSegmentChange(i, 'angle', parseFloat(e.currentTarget.value) || 0)}
            step="5"
          />
          <span class="seg-unit">deg</span>
          {#if segments.length > 1}
            <button class="seg-remove" on:click={() => removeSegment(i)} title="Remove segment">&times;</button>
          {/if}
        </div>
      {/each}
      <button class="add-seg" on:click={addSegment}>+ Add Segment</button>
    </div>
  {/if}
</div>

<style>
  .shape-editor {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-header {
    font-weight: 600;
    font-size: 13px;
    color: var(--color-text);
    padding-bottom: 4px;
    border-bottom: 1px solid var(--color-border);
  }
  .no-shape-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--color-text-muted);
    cursor: pointer;
  }
  .preset-row select {
    width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--color-input-border);
    border-radius: 4px;
    font-size: 13px;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .preset-row label {
    font-size: 12px;
    color: var(--color-text-secondary);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .segments-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .seg-header {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }
  .seg-row {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  }
  .seg-num {
    width: 20px;
    color: var(--color-text-faint);
    font-weight: 500;
  }
  .seg-input {
    width: 60px;
    padding: 3px 5px;
    border: 1px solid var(--color-input-border);
    border-radius: 3px;
    font-size: 12px;
    text-align: right;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .seg-angle {
    width: 50px;
  }
  .seg-unit {
    color: var(--color-text-faint);
    font-size: 11px;
    min-width: 22px;
  }
  .seg-sep {
    color: var(--color-border);
  }
  .seg-remove {
    background: none;
    border: none;
    color: var(--color-danger);
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
    line-height: 1;
  }
  .seg-remove:hover {
    color: var(--color-danger);
  }
  .add-seg {
    background: none;
    border: 1px dashed var(--color-border);
    color: var(--color-text-muted);
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    margin-top: 2px;
  }
  .add-seg:hover {
    border-color: var(--color-text-faint);
    color: var(--color-text);
  }
</style>
