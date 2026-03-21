<script lang="ts">
  /** Shared button component with consistent styling across the app.
   *  Variants: primary (filled accent), secondary (outlined), danger (red), ghost (text-only). */

  export let variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'secondary';
  export let size: 'sm' | 'md' = 'md';
  export let type: 'button' | 'submit' = 'button';
  export let disabled: boolean = false;
  export let title: string = '';
</script>

<button
  {type}
  {disabled}
  {title}
  class="btn btn-{variant} btn-{size}"
  class:disabled
  on:click
>
  <slot />
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: inherit;
    font-weight: 500;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
    white-space: nowrap;
    line-height: 1;
  }

  .btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* ── Sizes ── */
  .btn-sm {
    font-size: var(--text-sm);
    padding: var(--space-1) var(--space-2);
    min-height: 28px;
  }
  .btn-md {
    font-size: var(--text-base);
    padding: var(--space-2) var(--space-4);
    min-height: 36px;
  }

  /* ── Variants ── */
  .btn-primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border-color: var(--color-primary);
  }
  .btn-primary:hover:not(.disabled) {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
  }

  .btn-secondary {
    background: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-border);
  }
  .btn-secondary:hover:not(.disabled) {
    background: var(--color-surface-hover);
    border-color: var(--color-text-muted);
  }

  .btn-danger {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border-color: var(--color-danger-border);
  }
  .btn-danger:hover:not(.disabled) {
    background: var(--color-danger);
    color: var(--color-text-inverse);
    border-color: var(--color-danger);
  }

  .btn-ghost {
    background: transparent;
    color: var(--color-text-secondary);
    border-color: transparent;
  }
  .btn-ghost:hover:not(.disabled) {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  /* ── Disabled ── */
  .disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
