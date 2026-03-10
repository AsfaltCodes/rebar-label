<script lang="ts">
  import type { Segment } from '$lib/shapes/presets';
  import { type PresetName, PRESET_LABELS, getPresetSegments } from '$lib/shapes/presets';
  import ShapePreview from './ShapePreview.svelte';
  import { _ } from '$lib/stores/i18n';
  import { settings, updateSettings } from '$lib/stores/settingsStore';

  export let shapePreset: string | null = null;
  export let segments: Segment[] = [];
  export let onChange: (preset: string | null, segs: Segment[]) => void = () => {};

  const presetNames = Object.keys(PRESET_LABELS) as PresetName[];
  $: noShape = shapePreset === null && segments.length === 0;
  $: customPresets = $settings.custom_shape_presets || [];
  $: isCustomPreset = shapePreset?.startsWith('custom:') || false;
  $: isEditableCustom = shapePreset === 'custom' || isCustomPreset;

  // Save preset popup state
  let showSavePopup = false;
  let savePresetName = '';

  function handlePresetChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    if (val.startsWith('custom:')) {
      const name = val.slice(7);
      const cp = customPresets.find(p => p.name === name);
      if (cp) {
        shapePreset = val;
        segments = cp.segments.map(s => ({ ...s }));
        noShape = false;
        onChange(shapePreset, segments);
        return;
      }
    }
    shapePreset = val as PresetName;
    segments = getPresetSegments(val as PresetName);
    noShape = false;
    onChange(shapePreset, segments);
  }

  function handleSegmentChange(index: number, field: 'length' | 'angle', value: number) {
    segments = segments.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    // Detach from saved custom preset when editing
    if (isCustomPreset) {
      shapePreset = 'custom';
    }
    onChange(shapePreset, segments);
  }

  function addSegment() {
    segments = [...segments, { length: 200, angle: 90 }];
    if (isCustomPreset) {
      shapePreset = 'custom';
    }
    onChange(shapePreset, segments);
  }

  function removeSegment(index: number) {
    segments = segments.filter((_, i) => i !== index);
    if (isCustomPreset) {
      shapePreset = 'custom';
    }
    onChange(shapePreset, segments);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = Array.from(document.querySelectorAll('.seg-input')) as HTMLElement[];
      const currentIndex = inputs.indexOf(e.target as HTMLElement);
      if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus();
      }
    }
  }

  function toggleNoShape() {
    if (!noShape) {
      shapePreset = null;
      segments = [];
      onChange(null, []);
    } else {
      segments = [{ length: 200, angle: 0 }];
      shapePreset = null;
      onChange(null, segments);
    }
  }

  function openSavePopup() {
    savePresetName = '';
    showSavePopup = true;
  }

  function cancelSavePopup() {
    showSavePopup = false;
    savePresetName = '';
  }

  function saveCustomPreset() {
    const name = savePresetName.trim();
    if (!name || segments.length === 0) return;
    const existing = customPresets.filter(p => p.name !== name);
    const newPreset = { name, segments: segments.map(s => ({ ...s })) };
    updateSettings({ custom_shape_presets: [...existing, newPreset] });
    shapePreset = `custom:${name}`;
    onChange(shapePreset, segments);
    showSavePopup = false;
    savePresetName = '';
  }

  function deleteCustomPreset() {
    if (!isCustomPreset || !shapePreset) return;
    const name = shapePreset.slice(7);
    const updated = customPresets.filter(p => p.name !== name);
    updateSettings({ custom_shape_presets: updated });
    shapePreset = 'custom';
    onChange(shapePreset, segments);
  }
</script>

<div class="shape-editor">
  <div class="section-header">{$_('lbl_edit.shape_title')}</div>

  <label class="no-shape-toggle">
    <input type="checkbox" checked={noShape} on:change={toggleNoShape} />
    {$_('shape.no_shape')}
  </label>

  {#if !noShape}
    <div class="preset-row">
      <label>
        {$_('shape.preset')}
        <select value={shapePreset || 'custom'} on:change={handlePresetChange}>
          {#each presetNames as p}
            <option value={p}>{$_('shape.preset_' + p)}</option>
          {/each}
          {#if customPresets.length > 0}
            <option disabled>───────────</option>
            {#each customPresets as cp}
              <option value="custom:{cp.name}">{cp.name}</option>
            {/each}
          {/if}
        </select>
      </label>
    </div>

    <ShapePreview {segments} width={300} height={180} />

    <div class="segments-list">
      <div class="seg-header">{$_('shape.segments')}</div>
      {#each segments as seg, i}
        <div class="seg-row">
          <span class="seg-num">{i + 1}:</span>
          <input
            type="number"
            class="seg-input"
            value={seg.length}
            on:input={(e) => handleSegmentChange(i, 'length', parseFloat(e.currentTarget.value) || 0)}
            on:keydown={handleKeydown}
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
            on:keydown={handleKeydown}
            step="5"
          />
          <span class="seg-unit">deg</span>
          {#if segments.length > 1}
            <button class="seg-remove" on:click={() => removeSegment(i)} title={$_('common.remove')}>&times;</button>
          {/if}
        </div>
      {/each}
      <button class="add-seg" on:click={addSegment}>{$_('shape.add_segment')}</button>
    </div>

    <!-- Save as preset (only for custom shapes) -->
    {#if shapePreset === 'custom' && segments.length > 0}
      {#if showSavePopup}
        <div class="save-popup">
          <input
            type="text"
            class="save-name-input"
            bind:value={savePresetName}
            placeholder={$_('shape.preset_name_ph')}
            on:keydown={(e) => { if (e.key === 'Enter') saveCustomPreset(); if (e.key === 'Escape') cancelSavePopup(); }}
          />
          <div class="save-popup-actions">
            <button class="save-popup-btn save" on:click={saveCustomPreset} disabled={!savePresetName.trim()}>
              {$_('common.save')}
            </button>
            <button class="save-popup-btn cancel" on:click={cancelSavePopup}>
              {$_('common.cancel')}
            </button>
          </div>
        </div>
      {:else}
        <button class="save-preset-btn" on:click={openSavePopup}>
          {$_('shape.save_preset')}
        </button>
      {/if}
    {/if}

    <!-- Delete custom preset -->
    {#if isCustomPreset}
      <button class="delete-preset-btn" on:click={deleteCustomPreset}>
        {$_('shape.delete_preset')}
      </button>
    {/if}
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

  /* Save preset */
  .save-preset-btn {
    background: none;
    border: 1px solid var(--color-primary-border);
    color: var(--color-primary);
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }
  .save-preset-btn:hover {
    background: var(--color-primary-light);
  }
  .save-popup {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
  }
  .save-name-input {
    width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--color-input-border);
    border-radius: 3px;
    font-size: 12px;
    background: var(--color-surface);
    color: var(--color-text);
    box-sizing: border-box;
  }
  .save-popup-actions {
    display: flex;
    gap: 6px;
  }
  .save-popup-btn {
    padding: 4px 10px;
    border: none;
    border-radius: 3px;
    font-size: 12px;
    cursor: pointer;
  }
  .save-popup-btn.save {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }
  .save-popup-btn.save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .save-popup-btn.cancel {
    background: var(--color-surface-alt);
    color: var(--color-text-secondary);
  }
  .delete-preset-btn {
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-danger);
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  .delete-preset-btn:hover {
    background: var(--color-danger-bg);
  }
</style>
