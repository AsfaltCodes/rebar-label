<script lang="ts">
  /** Toast notification container. Renders all active toasts from the toast store.
   *  Place once in the app layout — it handles positioning and stacking. */

  import { fly } from 'svelte/transition';
  import { toasts, removeToast } from '$lib/stores/toastStore';
  import Icon from './Icon.svelte';
</script>

{#if $toasts.length > 0}
  <div class="toast-container">
    {#each $toasts as toast (toast.id)}
      <div
        class="toast toast-{toast.type}"
        transition:fly={{ x: 300, duration: 200 }}
      >
        <span class="toast-icon">
          {#if toast.type === 'success'}
            <Icon name="check" size={16} />
          {:else if toast.type === 'error'}
            <Icon name="alert-triangle" size={16} />
          {:else}
            <Icon name="file-text" size={16} />
          {/if}
        </span>
        <span class="toast-message">{toast.message}</span>
        <button class="toast-close" on:click={() => removeToast(toast.id)} aria-label="Dismiss">
          <Icon name="x" size={14} />
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: var(--space-4);
    right: var(--space-4);
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-2);
    z-index: var(--z-toast);
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-lg);
    font-size: var(--text-sm);
    color: var(--color-text);
    pointer-events: auto;
    max-width: 360px;
  }
  .toast-success { border-left: 3px solid var(--color-success); }
  .toast-error { border-left: 3px solid var(--color-danger); }
  .toast-info { border-left: 3px solid var(--color-primary); }

  .toast-icon {
    display: flex;
    flex-shrink: 0;
  }
  .toast-success .toast-icon { color: var(--color-success); }
  .toast-error .toast-icon { color: var(--color-danger); }
  .toast-info .toast-icon { color: var(--color-primary); }

  .toast-message {
    flex: 1;
    line-height: 1.4;
  }
  .toast-close {
    display: flex;
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);
  }
  .toast-close:hover {
    color: var(--color-text);
  }
</style>
