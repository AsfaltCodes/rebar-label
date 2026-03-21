<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { settings, updateSettings } from '$lib/stores/settingsStore';
  import { showSettingsModal } from '$lib/stores/uiStore';
  import { addToast } from '$lib/stores/toastStore';
  import { theme, setTheme } from '$lib/stores/themeStore';
  import { themes, SYSTEM_THEME_ID } from '$lib/themes/themes';
  import { _ } from '$lib/stores/i18n';
  import Button from './ui/Button.svelte';
  import Icon from './ui/Icon.svelte';

  let s = { ...$settings };
  let selectedThemeId = $theme;
  let previousThemeId = $theme;
  let themePickerExpanded = false;

  // Re-sync local copy when the modal opens or settings change
  $: if ($showSettingsModal) {
    s = { ...$settings };
    selectedThemeId = $theme;
    previousThemeId = $theme;
  }

  function previewTheme(id: string) {
    selectedThemeId = id;
    setTheme(id);
  }

  function handleSave() {
    updateSettings(s);
    // Theme is already applied via previewTheme — just persist the choice
    previousThemeId = selectedThemeId;
    showSettingsModal.set(false);
    addToast('Settings saved', 'success');
  }

  function handleCancel() {
    // Revert theme if changed
    if (selectedThemeId !== previousThemeId) {
      setTheme(previousThemeId);
    }
    showSettingsModal.set(false);
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) handleCancel();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleCancel();
  }

  async function handleLogoUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      s.logo_image_path = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    s.logo_image_path = '';
  }
</script>

<svelte:window on:keydown={$showSettingsModal ? handleKeydown : undefined} />

{#if $showSettingsModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="backdrop" on:click={handleBackdropClick} transition:fade={{ duration: 150 }}>
    <div class="modal" transition:fly={{ y: 16, duration: 200 }}>
      <div class="modal-header">
        <h2>{$_('settings.title')}</h2>
        <button class="close-btn" on:click={handleCancel} aria-label="Close">
          <Icon name="x" size={18} />
        </button>
      </div>

      <div class="modal-body">
        <!-- Company -->
        <section class="section">
          <h3 class="section-title">{$_('settings.company')}</h3>
          <div class="form-group">
            <label>{$_('settings.company_name')}</label>
            <input type="text" bind:value={s.company_name} placeholder="Your company name" />
          </div>
          <div class="form-group">
            <label>{$_('settings.company_phone')}</label>
            <input type="text" bind:value={s.company_phone} placeholder="e.g. +40 123 456 789" />
          </div>
        </section>

        <!-- Branding -->
        <section class="section">
          <h3 class="section-title">{$_('settings.branding')}</h3>
          {#if s.logo_image_path}
            <div class="logo-preview">
              <img src={s.logo_image_path} alt="Logo preview" />
              <Button variant="danger" size="sm" on:click={clearLogo}>{$_('common.remove')}</Button>
            </div>
          {:else}
            <p class="hint">No logo uploaded</p>
          {/if}
          <input type="file" accept="image/*" on:change={handleLogoUpload} class="file-input" />
          <p class="hint">{$_('settings.branding_hint')}</p>
        </section>

        <!-- Preferences -->
        <section class="section">
          <h3 class="section-title">{$_('settings.prefs')}</h3>
          <div class="form-group">
            <label>{$_('settings.lang')}</label>
            <select bind:value={s.language}>
              <option value="en">English</option>
              <option value="ro">Română</option>
            </select>
          </div>
          <div class="form-group">
            <label>{$_('settings.offer_format')}</label>
            <select bind:value={s.offer_format}>
              <option value="pdf">{$_('settings.offer_pdf')}</option>
              <option value="xlsx">{$_('settings.offer_xlsx')}</option>
            </select>
          </div>
        </section>

        <!-- Theme -->
        <section class="section">
          <button
            class="section-header-toggle"
            on:click={() => (themePickerExpanded = !themePickerExpanded)}
          >
            <h3 class="section-title">{$_('settings.theme')}</h3>
            <Icon name={themePickerExpanded ? 'chevron-up' : 'chevron-down'} size={16} />
          </button>

          {#if themePickerExpanded}
            <div class="theme-grid">
              <!-- System option -->
              <button
                class="theme-card"
                class:active={selectedThemeId === SYSTEM_THEME_ID}
                on:click={() => previewTheme(SYSTEM_THEME_ID)}
              >
                <div class="theme-swatch theme-swatch-system">
                  <div class="swatch-half-light"></div>
                  <div class="swatch-half-dark"></div>
                </div>
                <span class="theme-name">System</span>
              </button>
              {#each themes as t}
                <button
                  class="theme-card"
                  class:active={selectedThemeId === t.id}
                  on:click={() => previewTheme(t.id)}
                >
                  <div
                    class="theme-swatch"
                    style="background:{t.colors['--color-bg']};border-color:{t.colors['--color-border']}"
                  >
                    <div class="swatch-bar" style="background:{t.colors['--color-primary']}"></div>
                    <div class="swatch-surface" style="background:{t.colors['--color-surface']}">
                      <div class="swatch-text" style="color:{t.colors['--color-text']}">Aa</div>
                    </div>
                  </div>
                  <span class="theme-name">{t.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        </section>
      </div>

      <div class="modal-footer">
        <Button variant="ghost" on:click={handleCancel}>{$_('common.cancel')}</Button>
        <Button variant="primary" on:click={handleSave}>{$_('settings.save')}</Button>
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
  .modal {
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: 520px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-5) var(--space-3);
    flex-shrink: 0;
  }
  .modal-header h2 {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }
  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: background var(--transition-fast), color var(--transition-fast);
  }
  .close-btn:hover {
    background: var(--color-surface-alt);
    color: var(--color-text);
  }
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 0 var(--space-5) var(--space-3);
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5) var(--space-5);
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  /* Sections */
  .section {
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--color-border);
  }
  .section:last-child {
    border-bottom: none;
  }
  .section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 var(--space-3);
  }
  .section-header-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: color var(--transition-fast);
  }
  .section-header-toggle:hover {
    color: var(--color-text-secondary);
  }
  .section-header-toggle .section-title {
    margin-bottom: 0;
  }
  .icon-toggle {
    transition: transform var(--transition-normal);
  }
  .icon-toggle.expanded {
    transform: rotate(180deg);
  }

  /* Form elements */
  .form-group {
    margin-bottom: var(--space-3);
  }
  .form-group:last-child {
    margin-bottom: 0;
  }
  .form-group label {
    display: block;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-1);
  }
  .form-group input,
  .form-group select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-md);
    font-size: var(--text-md);
    background: var(--color-surface);
    color: var(--color-text);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }
  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-input-focus);
    box-shadow: 0 0 0 2px var(--color-input-focus-ring);
  }
  .margin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  .margin-grid .form-group {
    margin-bottom: 0;
  }

  /* Logo */
  .logo-preview {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }
  .logo-preview img {
    max-width: 120px;
    max-height: 60px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--space-1);
    background: var(--color-surface-alt);
  }
  .file-input {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
  }
  .hint {
    font-size: var(--text-xs);
    color: var(--color-text-faint);
    margin: var(--space-1) 0 0;
    line-height: 1.4;
  }

  /* Theme picker */
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .theme-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 6px;
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    background: none;
    cursor: pointer;
    transition: border-color var(--transition-fast), background var(--transition-fast);
  }
  .theme-card:hover {
    background: var(--color-surface-hover);
  }
  .theme-card.active {
    border-color: var(--color-primary);
  }
  .theme-swatch {
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: var(--radius-sm);
    border: 1px solid;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 4px;
    gap: 3px;
  }
  .theme-swatch-system {
    flex-direction: row;
    padding: 0;
    gap: 0;
    border-color: var(--color-border);
  }
  .swatch-half-light {
    flex: 1;
    background: #f1f5f9;
  }
  .swatch-half-dark {
    flex: 1;
    background: #161413;
  }
  .swatch-bar {
    height: 4px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .swatch-surface {
    flex: 1;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .swatch-text {
    font-size: 11px;
    font-weight: 600;
  }
  .theme-name {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    text-align: center;
    line-height: 1.2;
  }
</style>
