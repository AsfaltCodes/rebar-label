<script lang="ts">
  /** Custom confirmation dialog replacing browser confirm().
   *  Renders as a modal overlay with backdrop. Supports danger styling for destructive actions. */

  import { fly, fade } from 'svelte/transition';
  import Button from './Button.svelte';

  export let open: boolean = false;
  export let title: string = 'Confirm';
  export let message: string = 'Are you sure?';
  export let confirmLabel: string = 'Confirm';
  export let cancelLabel: string = 'Cancel';
  export let danger: boolean = false;
  export let onConfirm: () => void = () => {};
  export let onCancel: () => void = () => {};

  function handleConfirm() {
    open = false;
    onConfirm();
  }

  function handleCancel() {
    open = false;
    onCancel();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) handleCancel();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleCancel();
  }
</script>

<svelte:window on:keydown={open ? handleKeydown : undefined} />

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="backdrop" on:click={handleBackdropClick} transition:fade={{ duration: 150 }}>
    <div class="dialog" transition:fly={{ y: 16, duration: 200 }}>
      <h3 class="dialog-title">{title}</h3>
      <p class="dialog-message">{message}</p>
      <div class="dialog-actions">
        <Button variant="ghost" on:click={handleCancel}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} on:click={handleConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--color-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
  }
  .dialog {
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    max-width: 400px;
    width: 90%;
    box-shadow: var(--shadow-lg);
  }
  .dialog-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }
  .dialog-message {
    font-size: var(--text-md);
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin-bottom: var(--space-5);
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
