<script lang="ts">
  import { currentScreen, showNewJobModal } from '$lib/stores/uiStore';
  import { currentJob } from '$lib/stores/jobStore';
  import { theme, cycleTheme, resolvedTheme } from '$lib/stores/themeStore';

  export let jobs: { id: number; name: string; updated_at: string }[] = [];
  export let onSelectJob: (id: number) => void = () => {};
  export let onPrint: () => void = () => {};

  let jobDropdownOpen = false;

  function toggleJobDropdown() {
    jobDropdownOpen = !jobDropdownOpen;
  }

  function closeJobDropdown() {
    jobDropdownOpen = false;
  }

  function selectJob(id: number) {
    onSelectJob(id);
    closeJobDropdown();
  }

  function openNewJob() {
    showNewJobModal.set(true);
    closeJobDropdown();
  }

  function goToTemplates() {
    currentScreen.set('templates');
  }

  function goToSettings() {
    currentScreen.set('settings');
  }

  function goToEditor() {
    currentScreen.set('editor');
  }
</script>

<svelte:window on:click={closeJobDropdown} />

<header class="topbar">
  <div class="brand" role="button" tabindex="0" on:click={goToEditor} on:keydown={goToEditor}>
    <span class="brand-icon">▮</span>
    <span class="brand-name">RebarLabel</span>
  </div>

  <nav class="nav">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="nav-item dropdown" on:click|stopPropagation={toggleJobDropdown}>
      <button class="nav-btn" class:active={$currentScreen === 'editor'}>
        {$currentJob ? $currentJob.name : 'Jobs'}
        <span class="caret">▾</span>
      </button>
      {#if jobDropdownOpen}
        <div class="dropdown-menu">
          <button class="dropdown-item new-job" on:click={openNewJob}>
            + New Job
          </button>
          {#if jobs.length > 0}
            <div class="dropdown-divider"></div>
            {#each jobs as job}
              <button
                class="dropdown-item"
                class:active={$currentJob?.id === job.id}
                on:click={() => selectJob(job.id)}
              >
                {job.name}
                <span class="job-date">{new Date(job.updated_at).toLocaleDateString()}</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <button
      class="nav-btn"
      class:active={$currentScreen === 'templates'}
      on:click={goToTemplates}
    >
      Templates
    </button>

    <button
      class="nav-btn"
      class:active={$currentScreen === 'settings'}
      on:click={goToSettings}
    >
      Settings
    </button>
  </nav>

  <div class="actions">
    <button
      class="theme-btn"
      on:click={cycleTheme}
      title={$theme === 'system' ? 'Theme: System' : $theme === 'dark' ? 'Theme: Dark' : 'Theme: Light'}
    >
      {#if $resolvedTheme === 'dark'}☀️{:else}🌙{/if}
    </button>
    <button class="print-btn" on:click={onPrint} disabled={!$currentJob}>
      🖨 Print PDF
    </button>
  </div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    padding: 0 16px;
    height: 48px;
    background: var(--color-topbar);
    color: var(--color-text-inverse);
    gap: 16px;
    flex-shrink: 0;
    z-index: 100;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }
  .brand-icon {
    font-size: 20px;
    color: var(--color-topbar-icon);
  }
  .brand-name {
    font-weight: 700;
    font-size: 16px;
    letter-spacing: -0.3px;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
  }
  .nav-btn {
    padding: 6px 14px;
    background: transparent;
    border: none;
    color: var(--color-topbar-text);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.15s, color 0.15s;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .nav-btn:hover {
    background: var(--color-topbar-hover);
    color: var(--color-text-inverse);
  }
  .nav-btn.active {
    background: var(--color-topbar-active);
    color: var(--color-text-inverse);
  }
  .caret {
    font-size: 10px;
    margin-left: 2px;
  }
  .dropdown {
    position: relative;
  }
  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: var(--color-surface);
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    min-width: 220px;
    padding: 4px;
    z-index: 200;
  }
  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    color: var(--color-text);
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
    text-align: left;
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
  .dropdown-divider {
    height: 1px;
    background: var(--color-border);
    margin: 4px 8px;
  }
  .job-date {
    font-size: 11px;
    color: var(--color-text-faint);
  }
  .actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .theme-btn {
    padding: 4px 8px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    transition: background 0.15s;
  }
  .theme-btn:hover {
    background: var(--color-topbar-hover);
  }
  .print-btn {
    padding: 6px 16px;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  .print-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .print-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
