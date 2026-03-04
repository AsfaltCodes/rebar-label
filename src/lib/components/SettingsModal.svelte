<script lang="ts">
  import { settings, updateSettings } from '$lib/stores/settingsStore';
  import { currentScreen } from '$lib/stores/uiStore';

  let s = { ...$settings };

  function handleSave() {
    updateSettings(s);
    currentScreen.set('editor');
  }

  function handleCancel() {
    currentScreen.set('editor');
  }

  async function handleLogoUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    // Convert to data URL for simplicity
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

<div class="settings-page">
  <div class="settings-card">
    <h2>Settings</h2>

    <div class="form-group">
      <label>Company Name</label>
      <input type="text" bind:value={s.company_name} placeholder="Your company name" />
    </div>

    <div class="form-group">
      <label>Default Page Size</label>
      <select bind:value={s.default_page_size}>
        <option value="A4">A4 (210 × 297 mm)</option>
        <option value="A3">A3 (297 × 420 mm)</option>
        <option value="Letter">Letter (215.9 × 279.4 mm)</option>
      </select>
    </div>

    <div class="form-section">
      <h3>Margins (mm)</h3>
      <div class="margin-grid">
        <div class="form-group">
          <label>Top</label>
          <input type="number" bind:value={s.margin_top_mm} min="0" max="100" step="1" />
        </div>
        <div class="form-group">
          <label>Bottom</label>
          <input type="number" bind:value={s.margin_bottom_mm} min="0" max="100" step="1" />
        </div>
        <div class="form-group">
          <label>Left</label>
          <input type="number" bind:value={s.margin_left_mm} min="0" max="100" step="1" />
        </div>
        <div class="form-group">
          <label>Right</label>
          <input type="number" bind:value={s.margin_right_mm} min="0" max="100" step="1" />
        </div>
      </div>
    </div>

    <div class="form-group">
      <label>Label Gap (mm)</label>
      <input type="number" bind:value={s.label_gap_mm} min="0" max="50" step="0.5" />
    </div>

    <div class="form-section">
      <h3>Logo</h3>
      {#if s.logo_image_path}
        <div class="logo-preview">
          <img src={s.logo_image_path} alt="Logo preview" />
          <button class="clear-logo" on:click={clearLogo}>Remove logo</button>
        </div>
      {:else}
        <p class="no-logo">No logo uploaded</p>
      {/if}
      <input type="file" accept="image/*" on:change={handleLogoUpload} />
    </div>

    <div class="form-actions">
      <button class="btn btn-save" on:click={handleSave}>Save Settings</button>
      <button class="btn btn-cancel" on:click={handleCancel}>Cancel</button>
    </div>
  </div>
</div>

<style>
  .settings-page {
    padding: 24px;
    max-width: 560px;
    margin: 0 auto;
    height: 100%;
    overflow-y: auto;
  }
  .settings-card {
    background: var(--color-surface);
    border-radius: 12px;
    padding: 24px;
    box-shadow: var(--shadow-card);
  }
  h2 {
    margin: 0 0 20px;
    font-size: 20px;
    color: var(--color-text);
  }
  h3 {
    margin: 0 0 8px;
    font-size: 14px;
    color: var(--color-text-secondary);
  }
  .form-group {
    margin-bottom: 12px;
  }
  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-muted);
    margin-bottom: 4px;
  }
  .form-group input,
  .form-group select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--color-input-border);
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .form-section {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
  }
  .margin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .logo-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .logo-preview img {
    max-width: 120px;
    max-height: 60px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 4px;
  }
  .clear-logo {
    padding: 4px 10px;
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border: 1px solid var(--color-danger-border);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }
  .no-logo {
    color: var(--color-text-faint);
    font-size: 13px;
    margin: 4px 0;
  }
  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 24px;
    justify-content: flex-end;
  }
  .btn {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  .btn-save {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }
  .btn-save:hover {
    background: var(--color-primary-hover);
  }
  .btn-cancel {
    background: var(--color-surface-alt);
    color: var(--color-text-secondary);
  }
  .btn-cancel:hover {
    background: var(--color-border);
  }
</style>
