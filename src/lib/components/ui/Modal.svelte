<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Icon from './Icon.svelte';

  export let open = false;
  export let title = '';
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  const dispatch = createEventDispatcher();

  function close() {
    open = false;
    dispatch('close');
  }

  const sizes = {
    sm: 'max-width: 400px',
    md: 'max-width: 600px',
    lg: 'max-width: 800px',
    xl: 'max-width: 1100px'
  };
</script>

{#if open}
  <div class="modal-backdrop" on:click={close} transition:fade={{ duration: 150 }}>
    <div 
      class="modal-content" 
      style={sizes[size]} 
      on:click|stopPropagation
      transition:fly={{ y: 20, duration: 250 }}
    >
      <div class="modal-header">
        <h3>{title}</h3>
        <button class="close-btn" on:click={close}>
          <Icon name="x" size={20} />
        </button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    padding: var(--space-4);
  }
  .modal-content {
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    width: 100%;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow: hidden;
  }
  .modal-header {
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border-light);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }
  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-faint);
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
  }
  .close-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }
  .modal-body {
    padding: var(--space-6);
    overflow-y: auto;
  }
</style>
