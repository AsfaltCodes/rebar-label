<script lang="ts">
  import { currentScreen, showNewJobModal, showSettingsModal } from '$lib/stores/uiStore';
  import { currentJob, selectedLabelId, createNewLabel, duplicateLabel, deleteLabel } from '$lib/stores/jobStore';
  import { undo, redo, canUndo, canRedo } from '$lib/stores/historyStore';
  import { _ } from '$lib/stores/i18n';
  import Icon from './ui/Icon.svelte';
  import { onMount } from 'svelte';

  export let jobs: { id: number; name: string; created_at: string; labelCount: number }[] = [];
  export let onSelectJob: (id: number) => void = () => {};
  export let onPrint: () => void = () => {};
  export let onExportOffer: () => void = () => {};
  export let onDeleteJob: (id: number) => void = () => {};

  type MenuItem = {
    label: string;
    shortcut?: string;
    action?: () => void;
    disabled?: boolean;
    separator?: boolean;
    checked?: boolean;
    submenu?: MenuItem[];
  };

  let openMenuIndex: number | null = null;
  let isMaximized = false;

  // Window controls - dynamically imported for Tauri context
  let appWindow: any = null;

  onMount(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      appWindow = getCurrentWindow();
      isMaximized = await appWindow.isMaximized();

      // Listen for maximize/unmaximize to update the button icon
      await appWindow.onResized(async () => {
        if (appWindow) {
          isMaximized = await appWindow.isMaximized();
        }
      });
    } catch {
      // Not in Tauri context (dev mode) — window controls won't work
    }
  });

  async function minimizeWindow() {
    await appWindow?.minimize();
  }

  async function toggleMaximize() {
    await appWindow?.toggleMaximize();
  }

  async function closeWindow() {
    await appWindow?.close();
  }

  $: menus = buildMenus($currentJob, $selectedLabelId, $currentScreen, jobs, $_, $canUndo, $canRedo);

  function buildMenus(
    job: typeof $currentJob,
    selId: typeof $selectedLabelId,
    screen: typeof $currentScreen,
    allJobs: typeof jobs,
    t: typeof $_,
    undoEnabled: boolean,
    redoEnabled: boolean
  ) {
    return [
      {
        label: 'File',
        items: [
          { label: t('jobs.new_job'), shortcut: 'Ctrl+N', action: () => showNewJobModal.set(true) },
          { label: 'Open Job', submenu: allJobs.length > 0
            ? allJobs.map(j => ({
                label: j.name,
                action: () => onSelectJob(j.id),
                checked: job?.id === j.id,
              }))
            : [{ label: '(no jobs)', disabled: true }]
          },
          { separator: true } as MenuItem,
          { label: t('topbar.print'), shortcut: 'Ctrl+P', action: () => onPrint(), disabled: !job },
          { label: t('topbar.export_offer'), action: () => onExportOffer(), disabled: !job },
          { separator: true } as MenuItem,
          { label: t('nav.settings'), action: () => showSettingsModal.set(true) },
          { separator: true } as MenuItem,
          { label: 'Exit', action: () => closeWindow() },
        ] as MenuItem[],
      },
      {
        label: 'Edit',
        items: [
          { label: 'Undo', shortcut: 'Ctrl+Z', action: () => undo(), disabled: !undoEnabled },
          { label: 'Redo', shortcut: 'Ctrl+Y', action: () => redo(), disabled: !redoEnabled },
          { separator: true } as MenuItem,
          { label: 'New Label', shortcut: 'Ctrl+L', action: () => createNewLabel(), disabled: !job },
          { label: 'Duplicate Label', shortcut: 'Ctrl+D', action: () => { if (selId) duplicateLabel(selId); }, disabled: !selId },
          { label: 'Delete Label', shortcut: 'Del', action: () => { if (selId) deleteLabel(selId); }, disabled: !selId },
        ] as MenuItem[],
      },
      {
        label: 'View',
        items: [
          { label: 'Editor', action: () => currentScreen.set('editor'), checked: screen === 'editor' },
          { label: t('nav.jobs'), action: () => currentScreen.set('jobs'), checked: screen === 'jobs' },
          { label: t('nav.templates'), action: () => currentScreen.set('templates'), checked: screen === 'templates' },
        ] as MenuItem[],
      },
      {
        label: 'Help',
        items: [
          { label: 'About EisenLabel', action: () => alert('EisenLabel v0.1.0\nDesktop rebar label maker.') },
        ] as MenuItem[],
      },
    ];
  }

  function toggleMenu(index: number) {
    openMenuIndex = openMenuIndex === index ? null : index;
  }

  function hoverMenu(index: number) {
    if (openMenuIndex !== null) {
      openMenuIndex = index;
    }
  }

  function closeMenus() {
    openMenuIndex = null;
  }

  function handleItemClick(item: MenuItem) {
    if (item.disabled || item.submenu) return;
    item.action?.();
    closeMenus();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeMenus();
      return;
    }

    // Keyboard Shortcuts
    if (e.ctrlKey) {
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      } else if (key === 'n') {
        e.preventDefault();
        showNewJobModal.set(true);
      } else if (key === 'p') {
        e.preventDefault();
        if ($currentJob) onPrint();
      } else if (key === 'l') {
        e.preventDefault();
        if ($currentJob) createNewLabel();
      } else if (key === 'd') {
        e.preventDefault();
        if ($selectedLabelId) duplicateLabel($selectedLabelId);
      }
    }
  }

  // Hover state for submenus
  let hoverSubmenuIndex: number | null = null;
</script>

<svelte:window on:click={closeMenus} on:keydown={handleKeydown} />

<nav class="menubar" role="menubar">
  <!-- Menu items (left side) -->
  <div class="menubar-menus">
    {#each menus as menu, i}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="menubar-item" on:click|stopPropagation={() => toggleMenu(i)} on:mouseenter={() => hoverMenu(i)}>
        <button
          class="menubar-btn"
          class:open={openMenuIndex === i}
          role="menuitem"
          aria-haspopup="true"
          aria-expanded={openMenuIndex === i}
        >
          {menu.label}
        </button>

        {#if openMenuIndex === i}
          <div class="menu-dropdown" role="menu">
            {#each menu.items as item, j}
              {#if item.separator}
                <hr class="menu-separator" />
              {:else if item.submenu}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  class="menu-item has-submenu"
                  on:mouseenter={() => hoverSubmenuIndex = j}
                  on:mouseleave={() => hoverSubmenuIndex = null}
                >
                  <span class="menu-item-label">{item.label}</span>
                  <Icon name="chevron-right" size={12} />
                  {#if hoverSubmenuIndex === j}
                    <div class="submenu" role="menu">
                      {#each item.submenu as subItem}
                        <button
                          class="menu-item"
                          class:disabled={subItem.disabled}
                          role="menuitem"
                          disabled={subItem.disabled}
                          on:click|stopPropagation={() => handleItemClick(subItem)}
                        >
                          <span class="menu-check">{subItem.checked ? '\u2713' : ''}</span>
                          <span class="menu-item-label">{subItem.label}</span>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              {:else}
                <button
                  class="menu-item"
                  class:disabled={item.disabled}
                  role="menuitem"
                  disabled={item.disabled}
                  on:click|stopPropagation={() => handleItemClick(item)}
                >
                  <span class="menu-check">{item.checked ? '\u2713' : ''}</span>
                  <span class="menu-item-label">{item.label}</span>
                  {#if item.shortcut}
                    <span class="menu-shortcut">{item.shortcut}</span>
                  {/if}
                </button>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Draggable region (fills remaining space) -->
  <div class="drag-region" data-tauri-drag-region></div>

  <!-- Window controls (right side) -->
  <div class="window-controls">
    <button class="window-btn" on:click={minimizeWindow} aria-label="Minimize">
      <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
    </button>
    <button class="window-btn" on:click={toggleMaximize} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
      {#if isMaximized}
        <!-- Restore icon (two overlapping rectangles) -->
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
          <rect x="0" y="2" width="8" height="8" fill="var(--color-topbar)" stroke="currentColor" stroke-width="1"/>
        </svg>
      {:else}
        <!-- Maximize icon (single rectangle) -->
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="0" y="0" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/>
        </svg>
      {/if}
    </button>
    <button class="window-btn window-btn-close" on:click={closeWindow} aria-label="Close">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/>
        <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.2"/>
      </svg>
    </button>
  </div>
</nav>

<style>
  .menubar {
    display: flex;
    align-items: center;
    height: 30px;
    background: var(--color-topbar);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    flex-shrink: 0;
    z-index: calc(var(--z-topbar) + 1);
    user-select: none;
    font-size: var(--text-sm);
  }

  .menubar-menus {
    display: flex;
    align-items: center;
    padding: 0 var(--space-2);
    flex-shrink: 0;
  }

  .menubar-item {
    position: relative;
  }

  .menubar-btn {
    padding: 2px 10px;
    background: transparent;
    border: none;
    color: var(--color-topbar-text);
    font-size: var(--text-sm);
    cursor: pointer;
    height: 24px;
    line-height: 24px;
    border-radius: 4px;
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .menubar-btn:hover,
  .menubar-btn.open {
    background: var(--color-topbar-hover);
    color: var(--color-text-inverse);
  }

  /* Draggable titlebar region — fills all remaining horizontal space */
  .drag-region {
    flex: 1;
    height: 100%;
    -webkit-app-region: drag;
  }

  /* Window control buttons (minimize, maximize, close) */
  .window-controls {
    display: flex;
    align-items: center;
    height: 100%;
    flex-shrink: 0;
  }

  .window-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 100%;
    background: transparent;
    border: none;
    color: var(--color-topbar-text);
    cursor: pointer;
    transition: background 0.15s;
  }

  .window-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .window-btn-close:hover {
    background: #e81123;
    color: white;
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: var(--shadow-lg);
    min-width: 220px;
    padding: 4px 0;
    z-index: var(--z-dropdown);
  }

  .menu-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 4px 12px 4px 8px;
    border: none;
    background: none;
    color: var(--color-text);
    font-size: var(--text-sm);
    cursor: pointer;
    text-align: left;
    gap: 4px;
    position: relative;
    white-space: nowrap;
  }

  .menu-item:hover:not(.disabled) {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .menu-item.disabled {
    color: var(--color-text-faint);
    cursor: default;
  }

  .menu-check {
    width: 18px;
    text-align: center;
    flex-shrink: 0;
    font-size: 12px;
  }

  .menu-item-label {
    flex: 1;
  }

  .menu-shortcut {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    margin-left: 24px;
  }

  .menu-item:hover:not(.disabled) .menu-shortcut {
    color: var(--color-text-inverse);
  }

  .menu-separator {
    border: none;
    height: 1px;
    background: var(--color-border);
    margin: 4px 0;
  }

  .has-submenu {
    display: flex;
    align-items: center;
    padding: 4px 12px 4px 8px;
    cursor: default;
    position: relative;
    gap: 4px;
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .has-submenu:hover {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .has-submenu .menu-item-label {
    flex: 1;
    padding-left: 18px;
  }

  .submenu {
    position: absolute;
    left: 100%;
    top: -4px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    min-width: 180px;
    padding: 4px 0;
    z-index: var(--z-dropdown);
  }
</style>
