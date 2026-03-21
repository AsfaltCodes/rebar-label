<script lang="ts">
  import type { FieldDef } from '$lib/db/types';
  import { REBAR_DIAMETERS } from '$lib/db/types';
  import { createNewLabel } from '$lib/stores/jobStore';

  export let field: FieldDef;
  export let value: string = '';
  export let onChange: (val: string) => void = () => {};
  export let readonly: boolean = false;

  $: isDiameter = field.source === 'diameter';
  $: isStandardDiam = isDiameter && REBAR_DIAMETERS.includes(Number(value) as any);
  $: dropdownValue = isStandardDiam ? value : '';

  function handleInput(e: Event) {
    if (readonly) return;
    const v = (e.target as HTMLInputElement).value;
    value = v;
    onChange(v);
  }

  function handleDiamSelect(e: Event) {
    if (readonly) return;
    const v = (e.target as HTMLSelectElement).value;
    if (v) {
      value = v;
      onChange(v);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (readonly) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = Array.from(document.querySelectorAll('input.field-value:not([readonly]):not([disabled])')) as HTMLElement[];
      const currentIndex = inputs.indexOf(e.target as HTMLElement);

      if (currentIndex !== -1) {
        if (currentIndex < inputs.length - 1) {
          inputs[currentIndex + 1].focus();
        } else {
          createNewLabel().then(() => {
            setTimeout(() => {
              const newInputs = Array.from(document.querySelectorAll('.field-value:not([readonly]):not([disabled])')) as HTMLElement[];
              if (newInputs.length > 0) {
                newInputs[0].focus();
              }
            }, 50);
          });
        }
      }
    }
  }
</script>

<div class="field-input" class:bold={field.bold}>
  <label class="field-label" title={field.label}>{field.label}:</label>
  {#if isDiameter && !readonly}
    <div class="diam-group">
      <input
        type="number"
        class="field-value"
        {value}
        placeholder="mm"
        on:input={handleInput}
        on:keydown={handleKeydown}
      />
      <select
        class="field-value diam-select"
        value={dropdownValue}
        on:change={handleDiamSelect}
      >
        <option value="" disabled>▾</option>
        {#each REBAR_DIAMETERS as d}
          <option value={String(d)}>Ø{d}</option>
        {/each}
      </select>
    </div>
  {:else}
    <input
      type={(field.field_type === 'number' && !readonly) ? 'number' : 'text'}
      class="field-value"
      class:readonly={readonly}
      {value}
      placeholder={field.default_value || ''}
      on:input={handleInput}
      on:keydown={handleKeydown}
      readonly={readonly}
      disabled={readonly}
    />
  {/if}
</div>

<style>
  .field-input {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .field-label {
    flex-shrink: 0;
    width: 80px;
    font-size: 12px;
    color: var(--color-text-secondary);
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bold .field-label {
    font-weight: 600;
  }
  .field-value {
    flex: 1;
    padding: 4px 8px;
    border: 1px solid var(--color-input-border);
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
    min-width: 0;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .field-value:focus {
    outline: none;
    border-color: var(--color-input-focus);
    box-shadow: 0 0 0 2px var(--color-input-focus-ring);
  }
  .field-value.readonly, .field-value:disabled {
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
    border-style: dashed;
    cursor: not-allowed;
  }
  .diam-group {
    display: flex;
    flex: 1;
    gap: 4px;
    min-width: 0;
  }
  .diam-select {
    flex: 0 0 50px;
    padding: 4px 2px;
    cursor: pointer;
  }
</style>
