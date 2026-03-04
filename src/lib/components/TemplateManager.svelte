<script lang="ts">
  import { onMount } from 'svelte';
  import type { Template } from '$lib/db/types';
  import TemplateEditor from './TemplateEditor.svelte';

  let templates: Template[] = [];
  let editing: Template | null = null;
  let creating = false;

  onMount(loadTemplates);

  async function loadTemplates() {
    try {
      const { db } = await import('$lib/db/api');
      templates = await db.listTemplates();
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  }

  function startCreate() {
    creating = true;
    editing = null;
  }

  function startEdit(t: Template) {
    editing = t;
    creating = false;
  }

  async function handleSave(data: Partial<Template>) {
    try {
      const { db } = await import('$lib/db/api');
      if (editing) {
        await db.updateTemplate(editing.id, data);
      } else {
        await db.createTemplate({
          name: data.name || 'Untitled',
          label_width_mm: data.label_width_mm || 80,
          label_height_mm: data.label_height_mm || 50,
          logo_enabled: data.logo_enabled || false,
          fields: data.fields || [],
        });
      }
      editing = null;
      creating = false;
      await loadTemplates();
    } catch (e) {
      console.error('Failed to save template:', e);
    }
  }

  function handleCancel() {
    editing = null;
    creating = false;
  }

  async function handleDuplicate(t: Template) {
    try {
      const { db } = await import('$lib/db/api');
      await db.createTemplate({
        name: `${t.name} (copy)`,
        label_width_mm: t.label_width_mm,
        label_height_mm: t.label_height_mm,
        logo_enabled: t.logo_enabled,
        fields: t.fields,
      });
      await loadTemplates();
    } catch (e) {
      console.error('Failed to duplicate template:', e);
    }
  }

  async function handleDelete(t: Template) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      const { db } = await import('$lib/db/api');
      await db.deleteTemplate(t.id);
      await loadTemplates();
    } catch (e) {
      console.error('Failed to delete template:', e);
    }
  }
</script>

<div class="template-manager">
  {#if editing || creating}
    <TemplateEditor
      template={editing || { name: '', label_width_mm: 80, label_height_mm: 50, logo_enabled: false, fields: [] }}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  {:else}
    <div class="header">
      <h2>Templates</h2>
      <button class="new-btn" on:click={startCreate}>+ New Template</button>
    </div>

    {#if templates.length === 0}
      <div class="empty">
        <p>No templates yet.</p>
        <p>Create a template to define your label layout.</p>
      </div>
    {:else}
      <div class="grid">
        {#each templates as t}
          <div class="card">
            <div class="card-header">
              <h3>{t.name}</h3>
              <span class="dims">{t.label_width_mm} &times; {t.label_height_mm} mm</span>
            </div>
            <div class="card-body">
              <span class="field-count">
                {t.fields.length} field{t.fields.length === 1 ? '' : 's'}:
                {t.fields.map(f => f.label).join(', ') || 'none'}
              </span>
              {#if t.logo_enabled}
                <span class="badge">Logo</span>
              {/if}
            </div>
            <div class="card-actions">
              <button class="action-btn" on:click={() => startEdit(t)}>Edit</button>
              <button class="action-btn" on:click={() => handleDuplicate(t)}>Duplicate</button>
              <button class="action-btn danger" on:click={() => handleDelete(t)}>Delete</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .template-manager {
    padding: 24px;
    max-width: 900px;
    margin: 0 auto;
    height: 100%;
    overflow-y: auto;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  h2 {
    margin: 0;
    font-size: 22px;
    color: var(--color-text);
  }
  .new-btn {
    padding: 8px 18px;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  .new-btn:hover {
    background: var(--color-primary-hover);
  }
  .empty {
    text-align: center;
    padding: 48px;
    color: var(--color-text-faint);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .card:hover {
    border-color: var(--color-input-border);
    box-shadow: var(--shadow);
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .card-header h3 {
    margin: 0;
    font-size: 15px;
    color: var(--color-text);
  }
  .dims {
    font-size: 12px;
    color: var(--color-text-faint);
  }
  .card-body {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .field-count {
    font-size: 12px;
    color: var(--color-text-muted);
    flex: 1;
  }
  .badge {
    font-size: 10px;
    padding: 2px 6px;
    background: var(--color-success-bg);
    color: var(--color-success);
    border-radius: 4px;
    font-weight: 500;
  }
  .card-actions {
    display: flex;
    gap: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--color-surface-alt);
  }
  .action-btn {
    padding: 4px 10px;
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    color: var(--color-text-secondary);
  }
  .action-btn:hover {
    background: var(--color-surface-alt);
  }
  .action-btn.danger {
    color: var(--color-danger);
  }
  .action-btn.danger:hover {
    background: var(--color-danger-bg);
  }
</style>
