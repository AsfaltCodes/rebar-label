<script lang="ts">
  import { onMount } from 'svelte';
  import type { Template } from '$lib/db/types';
  import TemplateEditor from './TemplateEditor.svelte';
  import Button from './ui/Button.svelte';
  import Icon from './ui/Icon.svelte';
  import ConfirmDialog from './ui/ConfirmDialog.svelte';
  import { addToast } from '$lib/stores/toastStore';

  let templates: Template[] = [];
  let editing: Template | null = null;
  let creating = false;
  let deleteConfirm = { open: false, id: 0, name: '' };

  onMount(loadTemplates);

  async function loadTemplates() {
    try {
      const { db } = await import('$lib/db/api');
      templates = await db.listTemplates();
    } catch (e) {
      console.error('Failed to load templates:', e);
      addToast('Failed to load templates', 'error');
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
        addToast('Template updated', 'success');
      } else {
        await db.createTemplate({
          name: data.name || 'Untitled',
          sizing_mode: data.sizing_mode || 'grid',
          columns: data.columns || 2,
          rows: data.rows || 5,
          label_width_mm: data.label_width_mm || 80,
          label_height_mm: data.label_height_mm || 50,
          logo_enabled: data.logo_enabled || false,
          phone_enabled: data.phone_enabled || false,
          fields: data.fields || [],
        });
        addToast('Template created', 'success');
      }
      editing = null;
      creating = false;
      await loadTemplates();
    } catch (e) {
      console.error('Failed to save template:', e);
      addToast('Failed to save template', 'error');
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
        sizing_mode: t.sizing_mode || 'grid',
        columns: t.columns || 2,
        rows: t.rows || 5,
        label_width_mm: t.label_width_mm,
        label_height_mm: t.label_height_mm,
        logo_enabled: t.logo_enabled,
        phone_enabled: t.phone_enabled || false,
        fields: t.fields,
      });
      await loadTemplates();
      addToast('Template duplicated', 'success');
    } catch (e) {
      console.error('Failed to duplicate template:', e);
      addToast('Failed to duplicate template', 'error');
    }
  }

  function promptDelete(t: Template) {
    deleteConfirm = { open: true, id: t.id, name: t.name };
  }

  async function confirmDelete() {
    try {
      const { db } = await import('$lib/db/api');
      await db.deleteTemplate(deleteConfirm.id);
      await loadTemplates();
      addToast('Template deleted', 'info');
    } catch (e) {
      console.error('Failed to delete template:', e);
      addToast('Failed to delete template', 'error');
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
      <Button variant="primary" on:click={startCreate}>
        <Icon name="plus" size={16} />
        New Template
      </Button>
    </div>

    {#if templates.length === 0}
      <div class="empty">
        <p class="empty-title">No templates yet</p>
        <p class="empty-desc">Create a template to define your label layout and fields.</p>
        <div class="empty-actions">
          <Button variant="primary" on:click={startCreate}>
            <Icon name="plus" size={16} />
            Create Your First Template
          </Button>
        </div>
      </div>
    {:else}
      <div class="grid">
        {#each templates as t}
          <div class="card">
            <div class="card-header">
              <h3>{t.name}</h3>
              <span class="dims">{t.label_width_mm} x {t.label_height_mm} mm</span>
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
              <Button size="sm" variant="secondary" on:click={() => startEdit(t)}>
                <Icon name="edit" size={13} /> Edit
              </Button>
              <Button size="sm" variant="ghost" on:click={() => handleDuplicate(t)}>
                <Icon name="copy" size={13} /> Dupe
              </Button>
              <Button size="sm" variant="danger" on:click={() => promptDelete(t)}>
                <Icon name="trash" size={13} />
              </Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<ConfirmDialog
  bind:open={deleteConfirm.open}
  title="Delete Template"
  message={`Delete "${deleteConfirm.name}"? This cannot be undone.`}
  confirmLabel="Delete"
  danger={true}
  onConfirm={confirmDelete}
/>

<style>
  .template-manager {
    padding: var(--space-5);
    max-width: 900px;
    margin: 0 auto;
    height: 100%;
    overflow-y: auto;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-5);
  }
  h2 {
    margin: 0;
    font-size: var(--text-2xl);
    color: var(--color-text);
  }
  .empty {
    text-align: center;
    padding: var(--space-7) var(--space-5);
    color: var(--color-text-faint);
  }
  .empty-title {
    font-size: var(--text-xl);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
  }
  .empty-desc {
    font-size: var(--text-md);
    margin-bottom: var(--space-5);
  }
  .empty-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-3);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-3);
  }
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
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
    font-size: var(--text-lg);
    color: var(--color-text);
  }
  .dims {
    font-size: var(--text-sm);
    color: var(--color-text-faint);
  }
  .card-body {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .field-count {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    flex: 1;
  }
  .badge {
    font-size: var(--text-xs);
    padding: 1px var(--space-2);
    background: var(--color-success-bg);
    color: var(--color-success);
    border-radius: var(--radius-sm);
    font-weight: 500;
  }
  .card-actions {
    display: flex;
    gap: var(--space-1);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
  }
</style>
