<script lang="ts">
  import { currentScreen, showSettingsModal } from '$lib/stores/uiStore';
  import { currentJob } from '$lib/stores/jobStore';
  import { _ } from '$lib/stores/i18n';
  import Icon from './ui/Icon.svelte';
  import logo from '$lib/assets/logo.svg';

  export let onPrint: () => void = () => {};
  export let onExportOffer: () => void = () => {};

  function goToJobs() {
    currentScreen.set('jobs');
  }

  function goToTemplates() {
    currentScreen.set('templates');
  }

  function goToEditor() {
    currentScreen.set('editor');
  }

  function openSettings() {
    showSettingsModal.set(true);
  }
</script>

<header class="topbar">
  <div class="brand" role="button" tabindex="0" on:click={goToEditor} on:keydown={goToEditor}>
    <span class="brand-icon">
      <img src={logo} alt="EisenLabel Logo" width="24" height="24" />
    </span>
    <span class="brand-name">EisenLabel</span>
  </div>

  <nav class="nav">
    {#if $currentJob}
      <button class="nav-btn" class:active={$currentScreen === 'editor'} on:click={goToEditor}>
        {$currentJob.name}
      </button>
    {/if}

    <button
      class="nav-btn"
      class:active={$currentScreen === 'jobs'}
      on:click={goToJobs}
    >
      {$_('nav.jobs')}
    </button>

    <button
      class="nav-btn"
      class:active={$currentScreen === 'templates'}
      on:click={goToTemplates}
    >
      {$_('nav.templates')}
    </button>
  </nav>

  <div class="actions">
    {#if $currentScreen === 'editor' && $currentJob}
      <button class="offer-btn" on:click={onExportOffer}>
        <Icon name="file-text" size={16} />
        {$_('topbar.export_offer')}
      </button>
      <button class="print-btn" on:click={onPrint}>
        <Icon name="printer" size={16} />
        {$_('topbar.print')}
      </button>
    {/if}
    <button class="icon-btn" on:click={openSettings} title={$_('nav.settings')}>
      <Icon name="settings" size={18} />
    </button>
  </div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    padding: 0 var(--space-4);
    height: 48px;
    background: var(--color-topbar);
    color: #ffffff;
    gap: var(--space-4);
    flex-shrink: 0;
    z-index: var(--z-topbar);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    user-select: none;
  }
  .brand-icon {
    color: var(--color-topbar-icon);
    display: flex;
  }
  .brand-name {
    font-weight: 700;
    font-size: var(--text-lg);
    letter-spacing: -0.3px;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex: 1;
  }
  .nav-btn {
    padding: var(--space-1) var(--space-3);
    background: transparent;
    border: none;
    color: var(--color-topbar-text);
    font-size: var(--text-base);
    font-weight: 500;
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: background var(--transition-normal), color var(--transition-normal);
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 32px;
  }
  .nav-btn:hover {
    background: var(--color-topbar-hover);
    color: #ffffff;
  }
  .nav-btn.active {
    background: var(--color-topbar-active);
    color: #ffffff;
  }
  .dropdown {
    position: relative;
  }
  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: var(--space-1);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    min-width: 240px;
    padding: var(--space-1);
    z-index: var(--z-dropdown);
  }
  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: none;
    background: none;
    color: var(--color-text);
    font-size: var(--text-base);
    cursor: pointer;
    border-radius: var(--radius-sm);
    text-align: left;
    gap: var(--space-2);
    transition: background var(--transition-fast);
  }
  .dropdown-item:hover {
    background: var(--color-surface-alt);
  }
  .dropdown-item.active {
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-weight: 500;
  }
  .dropdown-item.new-job {
    color: var(--color-primary);
    font-weight: 500;
  }
  .session-browser {
    max-height: 400px;
    overflow-y: auto;
    min-width: 280px;
  }
  .day-group {
    margin-top: var(--space-1);
  }
  .day-group:first-of-type {
    margin-top: 0;
  }
  .day-header {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-text-faint);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: var(--space-2) var(--space-3) var(--space-1);
  }
  .dropdown-row {
    display: flex;
    align-items: center;
    border-radius: var(--radius-sm);
  }
  .dropdown-row .dropdown-item {
    flex: 1;
    min-width: 0;
  }
  .dropdown-row.active {
    background: var(--color-primary-light);
  }
  .job-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .job-meta {
    font-size: var(--text-xs);
    color: var(--color-text-faint);
    flex-shrink: 0;
  }
  .delete-job-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: none;
    color: var(--color-text-faint);
    cursor: pointer;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    opacity: 0;
    transition: opacity var(--transition-fast), color var(--transition-fast);
  }
  .dropdown-row:hover .delete-job-btn {
    opacity: 1;
  }
  .delete-job-btn:hover {
    color: var(--color-danger);
  }
  .dropdown-divider {
    height: 1px;
    background: var(--color-border);
    margin: var(--space-1) var(--space-2);
  }
  .job-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .job-date {
    font-size: var(--text-xs);
    color: var(--color-text-faint);
    flex-shrink: 0;
  }
  .actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }
  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    color: var(--color-topbar-text);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: background var(--transition-fast), color var(--transition-fast);
  }
  .icon-btn:hover {
    background: var(--color-topbar-hover);
    color: var(--color-text-inverse);
  }
  .offer-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-4);
    background: var(--color-info, #3b82f6);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition-fast);
    min-height: 32px;
  }
  .offer-btn:hover {
    background: var(--color-info-hover, #2563eb);
  }
  .print-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-4);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition-fast);
    min-height: 32px;
  }
  .print-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .print-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
