<script lang="ts">
  import { currentScreen, showNewJobModal, showSettingsModal } from '$lib/stores/uiStore';
  import { currentJob, selectedLabelId, createNewLabel, duplicateLabel, deleteLabel } from '$lib/stores/jobStore';
  import { theme, setTheme } from '$lib/stores/themeStore';
  import { _ } from '$lib/stores/i18n';
  import Icon from './ui/Icon.svelte';

  export let jobs: { id: number; name: string; created_at: string; labelCount: number }[] = [];
  export let onSelectJob: (id: number) => void = () => {};
  export let onPrint: () => void = () => {};
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

  $: menus = buildMenus($currentJob, $selectedLabelId, $currentScreen, $theme, jobs, $_);

  function buildMenus(
    job: typeof $currentJob,
    selId: typeof $selectedLabelId,
    screen: typeof $currentScreen,
    currentTheme: typeof $theme,
    allJobs: typeof jobs,
    t: typeof $_
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
          { separator: true } as MenuItem,
          { label: t('nav.settings'), action: () => showSettingsModal.set(true) },
          { separator: true } as MenuItem,
          { label: 'Exit', action: () => window.close() },
        ] as MenuItem[],
      },
      {
        label: 'Edit',
        items: [
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
          { separator: true } as MenuItem,
          { label: 'Theme', submenu: [
            { label: 'System', action: () => setTheme('system'), checked: currentTheme === 'system' },
            { label: 'Light', action: () => setTheme('light'), checked: currentTheme === 'light' },
            { label: 'Dark', action: () => setTheme('dark'), checked: currentTheme === 'dark' },
          ]},
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
    }
  }

  // Hover state for submenus
  let hoverSubmenuIndex: number | null = null;
</script>

<svelte:window on:click={closeMenus} on:keydown={handleKeydown} />

<nav class="menubar" role="menubar">
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
</nav>

<style>
  .menubar {
    display: flex;
    align-items: center;
    height: 28px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: 0 var(--space-1);
    flex-shrink: 0;
    z-index: calc(var(--z-topbar) + 1);
    user-select: none;
    font-size: var(--text-sm);
  }

  .menubar-item {
    position: relative;
  }

  .menubar-btn {
    padding: 2px 8px;
    background: transparent;
    border: none;
    color: var(--color-text);
    font-size: var(--text-sm);
    cursor: pointer;
    height: 24px;
    line-height: 24px;
    border-radius: 2px;
  }

  .menubar-btn:hover,
  .menubar-btn.open {
    background: var(--color-surface-hover);
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
