<script lang="ts">
  import type { FieldDef } from '$lib/db/types';

  export let field: FieldDef;
  export let value: string = '';
  export let onChange: (val: string) => void = () => {};

  function handleInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    value = v;
    onChange(v);
  }
</script>

<div class="field-input" class:bold={field.bold}>
  <label class="field-label" title={field.label}>{field.label}:</label>
  <input
    type={field.field_type === 'number' ? 'number' : 'text'}
    class="field-value"
    {value}
    placeholder={field.default_value || ''}
    on:input={handleInput}
  />
</div>

<style>
  .field-input {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .field-label {
    flex-shrink: 0;
    width: 90px;
    font-size: 12px;
    color: var(--color-text-secondary);
    text-align: right;
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
</style>
