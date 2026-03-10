<script lang="ts">
  import type { Template, FieldDef, Label } from '$lib/db/types';
  import { PAGE_SIZES } from '$lib/db/types';
  import { settings, updateSettings } from '$lib/stores/settingsStore';
  import { calculateLabelDimensions } from '$lib/utils/labelDimensions';
  import { _ } from '$lib/stores/i18n';
  import { dndzone } from 'svelte-dnd-action';
  import LabelCard from './LabelCard.svelte';
  import Icon from './ui/Icon.svelte';

  export let template: Partial<Template> = {
    name: '',
    sizing_mode: 'grid',
    columns: 2,
    rows: 5,
    label_width_mm: 80,
    label_height_mm: 50,
    logo_enabled: false,
    phone_enabled: false,
    page_size: 'A4',
    page_width_mm: 210,
    page_height_mm: 297,
    page_orientation: 'portrait',
    fields: [],
  };
  export let onSave: (data: Partial<Template>) => void = () => {};
  export let onCancel: () => void = () => {};

  let name = template.name || '';
  let sizingMode: 'grid' | 'fixed' = template.sizing_mode || 'grid';
  let columns = template.columns || 2;
  let rows = template.rows || 5;
  let width = template.label_width_mm || 80;
  let height = template.label_height_mm || 50;
  let logoEnabled = template.logo_enabled || false;
  let phoneEnabled = template.phone_enabled || false;
  let pageSize = template.page_size || 'A4';
  let pageOrientation = template.page_orientation || 'portrait';
  let pageWidth = template.page_width_mm || 210;
  let pageHeight = template.page_height_mm || 297;
  let marginTop = template.margin_top_mm || 0;
  let marginBottom = template.margin_bottom_mm || 0;
  let marginLeft = template.margin_left_mm || 0;
  let marginRight = template.margin_right_mm || 0;
  let labelGap = template.label_gap_mm || 0;
  let showPrintLayout = (marginTop || marginBottom || marginLeft || marginRight || labelGap) ? true : false;

  // DnD field items wrapper
  type FieldItem = { id: number; field: FieldDef; expanded: boolean };
  type FieldRowDnD = { id: number; fields: FieldItem[] };
  let nextId = 1;
  let nextRowId = 1;

  function buildRowsFromFields(defs: FieldDef[]): FieldRowDnD[] {
    const items: FieldItem[] = defs.map(f => ({ id: nextId++, field: { ...f }, expanded: false }));
    const rows: FieldRowDnD[] = [];
    let i = 0;
    while (i < items.length) {
      if (items[i].field.layout === 'half' && i + 1 < items.length && items[i + 1].field.layout === 'half') {
        rows.push({ id: nextRowId++, fields: [items[i], items[i + 1]] });
        i += 2;
      } else {
        rows.push({ id: nextRowId++, fields: [items[i]] });
        i++;
      }
    }
    return rows;
  }

  function flattenRows(rows: FieldRowDnD[]): FieldDef[] {
    const result: FieldDef[] = [];
    for (const row of rows) {
      for (const item of row.fields) {
        result.push({ ...item.field, layout: row.fields.length === 2 ? 'half' : 'full' });
      }
    }
    return result;
  }

  let fieldRows: FieldRowDnD[] = buildRowsFromFields(template.fields || []);

  const flipDurationMs = 200;

  $: fields = flattenRows(fieldRows);
  $: hasFields = fieldRows.some(r => r.fields.length > 0);

  $: logoSrc = $settings.logo_image_path || null;
  $: s = $settings;

  // Reactively calculate effective page dimensions
  $: {
    if (pageSize !== 'Custom') {
      const standard = PAGE_SIZES[pageSize];
      if (standard) {
        pageWidth = standard.width;
        pageHeight = standard.height;
      }
    }
  }

  $: effectivePageW = pageOrientation === 'landscape' ? Math.max(pageWidth, pageHeight) : Math.min(pageWidth, pageHeight);
  $: effectivePageH = pageOrientation === 'landscape' ? Math.min(pageWidth, pageHeight) : Math.max(pageWidth, pageHeight);

  // Preview label dimensions — compute from grid or use fixed
  $: previewDims = sizingMode === 'grid' && columns > 0 && rows > 0
    ? calculateLabelDimensions(
        effectivePageW || 210,
        effectivePageH || 297,
        marginTop, marginBottom,
        marginLeft, marginRight,
        labelGap, columns, rows
      )
    : { width: Math.max(width, 1), height: Math.max(height, 1) };

  $: previewW = Math.max(previewDims.width, 1);
  $: previewH = Math.max(previewDims.height, 1);

  // Scale to fit ~360px wide preview area
  $: previewScale = Math.min(360 / previewW, 450 / previewH, 4);

  // Build a sample label for preview
  $: sampleLabel = ({
    id: 0,
    job_id: 0,
    field_values: Object.fromEntries(
      fields
        .filter(f => f.source !== 'total_length' && f.source !== 'client_name')
        .map(f => [f.label, f.default_value || f.label || 'Sample'])
    ),
    shape_preset: 'u-shape',
    shape_segments: [
      { length: 200, angle: 0 },
      { length: 500, angle: 90 },
      { length: 200, angle: 90 },
    ],
    copies: 1,
    sort_order: 0,
  }) as Label;

  function cleanupRows() {
    let cleaned = fieldRows.filter(r => r.fields.length > 0);
    // Safety: split any row with >2 fields
    const result: FieldRowDnD[] = [];
    for (const row of cleaned) {
      if (row.fields.length <= 2) {
        result.push(row);
      } else {
        result.push({ id: row.id, fields: row.fields.slice(0, 2) });
        result.push({ id: nextRowId++, fields: row.fields.slice(2) });
      }
    }
    fieldRows = result;
  }

  function addField() {
    const newItem: FieldItem = {
      id: nextId++,
      field: { label: '', field_type: 'text', default_value: '', font_size: 2, bold: false, layout: 'full', scope: 'label', source: 'manual' },
      expanded: true,
    };
    fieldRows = [...fieldRows, { id: nextRowId++, fields: [newItem] }];
  }

  function removeField(itemId: number) {
    fieldRows = fieldRows
      .map(r => ({ ...r, fields: r.fields.filter(f => f.id !== itemId) }))
      .filter(r => r.fields.length > 0);
  }

  function toggleExpand(itemId: number) {
    fieldRows = fieldRows.map(r => ({
      ...r,
      fields: r.fields.map(f =>
        f.id === itemId ? { ...f, expanded: !f.expanded } : f
      ),
    }));
  }

  // Outer DnD — row reordering
  function handleRowConsider(e: CustomEvent) {
    fieldRows = e.detail.items;
  }

  function handleRowFinalize(e: CustomEvent) {
    fieldRows = [...e.detail.items];
    cleanupRows();
  }

  // Inner DnD — field movement between rows
  function handleFieldConsider(rowId: number, e: CustomEvent) {
    fieldRows = fieldRows.map(r =>
      r.id === rowId ? { ...r, fields: e.detail.items } : r
    );
  }

  function handleFieldFinalize(rowId: number, e: CustomEvent) {
    fieldRows = fieldRows.map(r =>
      r.id === rowId ? { ...r, fields: [...e.detail.items] } : r
    );
    cleanupRows();
  }

  function splitToOwnRow(itemId: number) {
    const newRows: FieldRowDnD[] = [];
    for (const row of fieldRows) {
      const idx = row.fields.findIndex(f => f.id === itemId);
      if (idx !== -1 && row.fields.length === 2) {
        const removed = row.fields[idx];
        const remaining = row.fields[1 - idx];
        newRows.push({ id: row.id, fields: [remaining] });
        newRows.push({ id: nextRowId++, fields: [removed] });
      } else {
        newRows.push(row);
      }
    }
    fieldRows = newRows;
  }

  function setFieldLayout(item: FieldItem, layout: 'full' | 'half') {
    item.field.layout = layout;
    if (layout === 'half') {
      // Already in a pair row? Nothing to do. In a solo row? Mark as waiting for pair.
      fieldRows = fieldRows;
    } else {
      // If in a pair, split to own row
      for (const row of fieldRows) {
        if (row.fields.length === 2 && row.fields.some(f => f.id === item.id)) {
          splitToOwnRow(item.id);
          return;
        }
      }
      fieldRows = fieldRows;
    }
  }

  function handleSourceChange(item: FieldItem) {
    if (item.field.source === 'total_length') {
      item.field.scope = 'label';
      item.field.field_type = 'number';
    }
    if (item.field.source === 'client_name') {
      item.field.scope = 'job';
    }
    fieldRows = fieldRows;
  }

  function triggerReactivity() {
    fieldRows = fieldRows;
  }

  // Empty drop zone for un-pairing (creating new rows by dragging fields out)
  let emptyDropItems: FieldItem[] = [];

  function handleEmptyConsider(e: CustomEvent) {
    emptyDropItems = e.detail.items;
  }

  function handleEmptyFinalize(e: CustomEvent) {
    if (e.detail.items.length > 0) {
      fieldRows = [...fieldRows, { id: nextRowId++, fields: [...e.detail.items] }];
      emptyDropItems = [];
      cleanupRows();
    }
  }

  async function handleLogoUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      updateSettings({ logo_image_path: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    updateSettings({ logo_image_path: '' });
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      sizing_mode: sizingMode,
      columns,
      rows,
      label_width_mm: width,
      label_height_mm: height,
      logo_enabled: logoEnabled,
      phone_enabled: phoneEnabled,
      page_size: pageSize,
      page_width_mm: effectivePageW,
      page_height_mm: effectivePageH,
      page_orientation: pageOrientation,
      margin_top_mm: marginTop,
      margin_bottom_mm: marginBottom,
      margin_left_mm: marginLeft,
      margin_right_mm: marginRight,
      label_gap_mm: labelGap,
      fields,
    });
  }
</script>

<div class="template-editor">
  <div class="editor-form">
    <h3>{template.id ? $_('tpl_edit.edit_title') : $_('tpl_edit.new_title')}</h3>

    <div class="form-group">
      <label>{$_('tpl_edit.name_label')}</label>
      <input type="text" bind:value={name} placeholder={$_('tpl_edit.name_placeholder')} />
    </div>

    <!-- Page Setup -->
    <div class="section">
      <h4>{$_('tpl_edit.page_setup')}</h4>
      <div class="form-row">
        <div class="form-group">
          <label>{$_('tpl_edit.page_size')}</label>
          <select bind:value={pageSize}>
            {#each Object.keys(PAGE_SIZES) as size}
              <option value={size}>{size}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label>{$_('tpl_edit.orientation')}</label>
          <select bind:value={pageOrientation}>
            <option value="portrait">{$_('tpl_edit.portrait')}</option>
            <option value="landscape">{$_('tpl_edit.landscape')}</option>
          </select>
        </div>
      </div>

      {#if pageSize === 'Custom'}
        <div class="form-row">
          <div class="form-group">
            <label>{$_('tpl_edit.page_w')}</label>
            <input type="number" bind:value={pageWidth} min="50" max="1000" step="1" />
          </div>
          <div class="form-group">
            <label>{$_('tpl_edit.page_h')}</label>
            <input type="number" bind:value={pageHeight} min="50" max="1000" step="1" />
          </div>
        </div>
      {/if}
    </div>

    <!-- Print Layout -->
    <div class="section">
      <h4>{$_('tpl_edit.print_layout_heading')}</h4>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={showPrintLayout} />
          {$_('tpl_edit.print_layout')}
        </label>
      </div>

      {#if showPrintLayout}
        <div class="form-row">
          <div class="form-group">
            <label>{$_('tpl_edit.margin_top')}</label>
            <input type="number" bind:value={marginTop} min="0" max="100" step="1" />
          </div>
          <div class="form-group">
            <label>{$_('tpl_edit.margin_bottom')}</label>
            <input type="number" bind:value={marginBottom} min="0" max="100" step="1" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{$_('tpl_edit.margin_left')}</label>
            <input type="number" bind:value={marginLeft} min="0" max="100" step="1" />
          </div>
          <div class="form-group">
            <label>{$_('tpl_edit.margin_right')}</label>
            <input type="number" bind:value={marginRight} min="0" max="100" step="1" />
          </div>
        </div>
        <div class="form-group">
          <label>{$_('tpl_edit.label_gap')}</label>
          <input type="number" bind:value={labelGap} min="0" max="50" step="0.5" />
        </div>
      {/if}
    </div>

    <!-- Label Sizing -->
    <div class="section">
      <h4>{$_('tpl_edit.label_size')}</h4>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" checked={sizingMode === 'fixed'} on:change={() => sizingMode = sizingMode === 'grid' ? 'fixed' : 'grid'} />
          {$_('tpl_edit.custom_dims')}
        </label>
      </div>

      {#if sizingMode === 'grid'}
        <div class="form-row">
          <div class="form-group">
            <label>{$_('tpl_edit.columns')}</label>
            <input type="number" bind:value={columns} min="1" max="20" step="1" />
          </div>
          <div class="form-group">
            <label>{$_('tpl_edit.rows')}</label>
            <input type="number" bind:value={rows} min="1" max="20" step="1" />
          </div>
        </div>
        <p class="hint">{$_('tpl_edit.auto_size_hint', { cols: columns, rows: rows })}</p>
      {:else}
        <div class="form-row">
          <div class="form-group">
            <label>{$_('tpl_edit.width')}</label>
            <input type="number" bind:value={width} min="20" max="500" step="5" />
          </div>
          <div class="form-group">
            <label>{$_('tpl_edit.height')}</label>
            <input type="number" bind:value={height} min="20" max="500" step="5" />
          </div>
        </div>
      {/if}
    </div>

    <!-- Branding -->
    <div class="section">
      <h4>{$_('tpl_edit.branding')}</h4>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={logoEnabled} />
          {$_('tpl_edit.show_logo')}
        </label>
      </div>

      {#if logoEnabled}
        <div class="logo-area">
          {#if logoSrc}
            <div class="logo-preview">
              <img src={logoSrc} alt="Logo" />
              <button class="logo-remove" on:click={clearLogo} title={$_('common.remove')}>
                <Icon name="trash" size={13} />
              </button>
            </div>
          {:else}
            <p class="hint">{$_('tpl_edit.no_logo_hint')}</p>
          {/if}
          <input type="file" accept="image/*" on:change={handleLogoUpload} class="file-input" />
        </div>
      {/if}

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={phoneEnabled} />
          {$_('tpl_edit.show_phone')}
        </label>
        {#if phoneEnabled}
          <p class="hint">{$_('tpl_edit.phone_hint')}</p>
        {/if}
      </div>
    </div>

    <!-- Fields -->
    <div class="fields-section">
      <div class="fields-header">
        <h4>{$_('tpl_edit.fields')}</h4>
        <button class="add-field-btn" on:click={addField}>{$_('tpl_edit.add_field')}</button>
      </div>

      {#if !hasFields}
        <p class="empty-fields">{$_('tpl_edit.empty_fields')}</p>
      {/if}

      <div
        class="field-rows-container"
        use:dndzone={{ items: fieldRows, flipDurationMs, type: 'row', dragHandleSelector: '[data-row-handle]' }}
        on:consider={handleRowConsider}
        on:finalize={handleRowFinalize}
      >
        {#each fieldRows as row (row.id)}
          <div class="field-row-wrapper">
            <div class="row-drag-handle" data-row-handle title={$_('tpl_edit.drag_hint')}>
              <Icon name="grip" size={14} />
            </div>
            <div
              class="field-row-inner"
              use:dndzone={{ items: row.fields, flipDurationMs, type: 'field', dropFromOthersDisabled: false, dragHandleSelector: '[data-field-handle]' }}
              on:consider={e => handleFieldConsider(row.id, e)}
              on:finalize={e => handleFieldFinalize(row.id, e)}
            >
              {#each row.fields as item (item.id)}
                <div class="field-card" class:half={row.fields.length === 2} class:expanded={item.expanded}>
                  <!-- Collapsed header -->
                  <div class="field-card-header" on:click={() => toggleExpand(item.id)}>
                    <div class="field-drag-handle" data-field-handle on:click|stopPropagation title={$_('tpl_edit.drag_hint')}>
                      <Icon name="grip" size={14} />
                    </div>
                    <span class="field-name-text">
                      {item.field.label || $_('tpl_edit.field_unnamed')}
                    </span>
                    <span class="type-badge">
                      {item.field.field_type === 'number' ? $_('tpl_edit.type_number') : $_('tpl_edit.type_text')}
                    </span>
                    {#if row.fields.length === 2 && !item.expanded}
                      <span class="layout-badge">½</span>
                    {/if}
                    <div class="header-spacer"></div>
                    {#if row.fields.length === 2 && !item.expanded}
                      <button class="split-icon-btn" on:click|stopPropagation={() => splitToOwnRow(item.id)} title={$_('tpl_edit.split_row')}>
                        <Icon name="columns" size={14} />
                      </button>
                    {/if}
                    <span class="chevron" class:rotated={item.expanded}>
                      <Icon name="chevron-right" size={14} />
                    </span>
                    <button class="delete-btn" on:click|stopPropagation={() => removeField(item.id)} title={$_('common.delete')}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>

                  <!-- Expanded body -->
                  {#if item.expanded}
                    <div class="field-card-body">
                      <div class="body-row full">
                        <label>{$_('tpl_edit.field_name_label')}</label>
                        <input type="text" bind:value={item.field.label} placeholder={$_('tpl_edit.field_name_ph')} />
                      </div>
                      <div class="body-row">
                        <label>{$_('tpl_edit.field_type_label')}</label>
                        <select bind:value={item.field.field_type}>
                          <option value="text">{$_('tpl_edit.type_text')}</option>
                          <option value="number">{$_('tpl_edit.type_number')}</option>
                        </select>
                      </div>
                      <div class="body-row">
                        <label>{$_('tpl_edit.default_label')}</label>
                        <input type="text" bind:value={item.field.default_value} placeholder={$_('tpl_edit.field_default_ph')} />
                      </div>
                      <div class="body-row">
                        <label>{$_('tpl_edit.font_size_label')}</label>
                        <div class="segmented-control">
                          <button class:active={item.field.font_size === 1} on:click={() => { item.field.font_size = 1; triggerReactivity(); }}>
                            {$_('tpl_edit.font_small')}
                          </button>
                          <button class:active={item.field.font_size === 2} on:click={() => { item.field.font_size = 2; triggerReactivity(); }}>
                            {$_('tpl_edit.font_medium')}
                          </button>
                          <button class:active={item.field.font_size === 3} on:click={() => { item.field.font_size = 3; triggerReactivity(); }}>
                            {$_('tpl_edit.font_large')}
                          </button>
                        </div>
                      </div>
                      <div class="body-row">
                        <label>{$_('tpl_edit.bold_label')}</label>
                        <label class="bold-toggle">
                          <input type="checkbox" bind:checked={item.field.bold} />
                          <strong>B</strong>
                        </label>
                      </div>
                      <div class="body-row">
                        <label>{$_('tpl_edit.layout_label')}</label>
                        {#if row.fields.length === 2}
                          <button class="split-btn" on:click={() => splitToOwnRow(item.id)}>
                            {$_('tpl_edit.split_row')}
                          </button>
                        {:else}
                          <div class="segmented-control">
                            <button class:active={item.field.layout !== 'half'} on:click={() => setFieldLayout(item, 'full')}>
                              {$_('tpl_edit.layout_full')}
                            </button>
                            <button class:active={item.field.layout === 'half'} on:click={() => setFieldLayout(item, 'half')}>
                              {$_('tpl_edit.layout_half')}
                            </button>
                          </div>
                        {/if}
                      </div>
                      <div class="body-row">
                        <label>{$_('tpl_edit.scope_label')}</label>
                        <select bind:value={item.field.scope} disabled={item.field.source === 'total_length' || item.field.source === 'client_name'}>
                          <option value="label">{$_('tpl_edit.scope_per_label')}</option>
                          <option value="job">{$_('tpl_edit.scope_shared')}</option>
                        </select>
                      </div>
                      <div class="body-row">
                        <label>{$_('tpl_edit.source_label')}</label>
                        <select bind:value={item.field.source} on:change={() => handleSourceChange(item)}>
                          <option value="manual">{$_('tpl_edit.source_manual')}</option>
                          <option value="total_length">{$_('tpl_edit.source_total_length')}</option>
                          <option value="client_name">{$_('tpl_edit.source_client_name')}</option>
                        </select>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
              {#if row.fields.length === 1 && row.fields[0].field.layout === 'half'}
                <div class="pair-placeholder">
                  {$_('tpl_edit.pair_placeholder')}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      {#if hasFields}
        <div
          class="empty-drop-zone"
          use:dndzone={{ items: emptyDropItems, flipDurationMs, type: 'field', dropFromOthersDisabled: false }}
          on:consider={handleEmptyConsider}
          on:finalize={handleEmptyFinalize}
        >
          {#each emptyDropItems as item (item.id)}
            <div class="field-card">
              <div class="field-card-header">
                <span class="field-name-text">{item.field.label || $_('tpl_edit.field_unnamed')}</span>
              </div>
            </div>
          {/each}
          {#if emptyDropItems.length === 0}
            <span class="drop-hint">{$_('tpl_edit.drop_new_row')}</span>
          {/if}
        </div>
      {/if}
    </div>

    <div class="form-actions">
      <button class="btn btn-save" on:click={handleSave} disabled={!name.trim()}>{$_('common.save')}</button>
      <button class="btn btn-cancel" on:click={onCancel}>{$_('common.cancel')}</button>
    </div>
  </div>

  <!-- Live preview sidebar -->
  <div class="preview-sidebar">
    <h4>{$_('tpl_edit.preview_title')}</h4>
    <div class="preview-card-wrapper" style="aspect-ratio: {Math.max(effectivePageW, 1)} / {Math.max(effectivePageH, 1)}">
      <LabelCard
        label={sampleLabel}
        {fields}
        widthMm={previewW}
        heightMm={previewH}
        scale={previewScale}
        logoSrc={logoEnabled ? logoSrc : null}
        {logoEnabled}
        {phoneEnabled}
        companyPhone={s.company_phone}
        clientName="Sample Client"
      />
    </div>
    <p class="preview-dims">
      {Math.round(previewW)} &times; {Math.round(previewH)} mm
    </p>
  </div>
</div>

<style>
  .template-editor {
    padding: var(--space-5);
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    gap: var(--space-6);
  }
  .editor-form {
    flex: 1;
    max-width: 800px;
    min-width: 0;
  }
  .preview-sidebar {
    width: 400px;
    flex-shrink: 0;
    position: sticky;
    top: var(--space-5);
    align-self: flex-start;
  }
  .preview-sidebar h4 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .preview-card-wrapper {
    background: var(--color-page-bg, #fff);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .preview-dims {
    text-align: center;
    font-size: var(--text-xs);
    color: var(--color-text-faint);
    margin-top: var(--space-1);
  }

  h3 {
    margin: 0 0 var(--space-4);
    font-size: var(--text-2xl);
    color: var(--color-text);
  }
  h4 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xl);
    color: var(--color-text-secondary);
  }
  .section {
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }
  .form-group {
    margin-bottom: var(--space-3);
  }
  .form-group label {
    display: block;
    font-size: var(--text-base);
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-1);
  }
  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group select {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-md);
    font-size: var(--text-lg);
    box-sizing: border-box;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .form-row {
    display: flex;
    gap: var(--space-3);
  }
  .form-row .form-group {
    flex: 1;
  }
  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    font-size: var(--text-base) !important;
  }
  .hint {
    font-size: var(--text-sm);
    color: var(--color-text-faint);
    margin: var(--space-1) 0 0;
    line-height: 1.4;
  }

  /* Logo area */
  .logo-area {
    margin: var(--space-2) 0 var(--space-3);
    padding-left: var(--space-5);
  }
  .logo-preview {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  .logo-preview img {
    max-width: 100px;
    max-height: 48px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--space-1);
    background: var(--color-surface-alt);
  }
  .logo-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-danger);
    cursor: pointer;
  }
  .file-input {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  /* Fields */
  .fields-section {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
  }
  .fields-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }
  .add-field-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-primary-light);
    color: var(--color-primary);
    border: 1px solid var(--color-primary-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
    font-weight: 500;
    cursor: pointer;
  }
  .add-field-btn:hover {
    background: var(--color-primary-light);
  }
  .empty-fields {
    color: var(--color-text-faint);
    font-size: var(--text-base);
    text-align: center;
    padding: var(--space-4);
  }

  /* Field rows container */
  .field-rows-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-height: 48px;
  }

  /* Row wrapper */
  .field-row-wrapper {
    display: flex;
    align-items: stretch;
    gap: var(--space-1);
  }
  .row-drag-handle {
    display: flex;
    align-items: center;
    padding: var(--space-1);
    cursor: grab;
    color: var(--color-text-faint);
    flex-shrink: 0;
    opacity: 0.5;
  }
  .row-drag-handle:hover {
    opacity: 1;
  }
  .row-drag-handle:active {
    cursor: grabbing;
  }

  /* Inner row — holds 1-2 field cards */
  .field-row-inner {
    flex: 1;
    display: flex;
    gap: var(--space-2);
    min-height: 40px;
  }

  /* Field card */
  .field-card {
    flex: 1;
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    min-width: 0;
  }

  /* Pair placeholder */
  .pair-placeholder {
    flex: 1;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-faint);
    font-size: var(--text-sm);
    min-height: 40px;
  }

  /* Empty drop zone for un-pairing */
  .empty-drop-zone {
    min-height: 36px;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: var(--space-1);
    padding: var(--space-1);
  }
  .drop-hint {
    color: var(--color-text-faint);
    font-size: var(--text-sm);
  }

  /* Split icon button on collapsed paired cards */
  .split-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    flex-shrink: 0;
  }
  .split-icon-btn:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  /* Card header */
  .field-card-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    user-select: none;
  }
  .field-card-header:hover {
    background: var(--color-surface-alt);
  }
  .field-drag-handle {
    cursor: grab;
    color: var(--color-text-faint);
    display: flex;
    align-items: center;
    padding: var(--space-1);
  }
  .field-drag-handle:active {
    cursor: grabbing;
  }
  .field-name-text {
    font-size: var(--text-base);
    font-weight: 500;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .type-badge {
    font-size: var(--text-xs);
    padding: 1px 6px;
    border-radius: 9999px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .layout-badge {
    font-size: var(--text-xs);
    padding: 1px 5px;
    border-radius: 9999px;
    background: var(--color-primary-light);
    color: var(--color-primary);
    border: 1px solid var(--color-primary-border);
    font-weight: 600;
    flex-shrink: 0;
  }
  .header-spacer {
    flex: 1;
  }
  .chevron {
    display: flex;
    align-items: center;
    color: var(--color-text-faint);
    transition: transform var(--transition-fast);
    flex-shrink: 0;
  }
  .chevron.rotated {
    transform: rotate(90deg);
  }
  .delete-btn {
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
  }
  .delete-btn:hover {
    color: var(--color-danger);
    background: var(--color-danger-bg);
  }

  /* Card body */
  .field-card-body {
    padding: var(--space-3);
    padding-top: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    border-top: 1px solid var(--color-border);
  }
  .body-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .body-row.full {
    grid-column: 1 / -1;
  }
  .body-row label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-muted);
  }
  .body-row input[type="text"],
  .body-row select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
    background: var(--color-surface);
    color: var(--color-text);
    box-sizing: border-box;
  }
  .body-row select:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Segmented control */
  .segmented-control {
    display: flex;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .segmented-control button {
    flex: 1;
    padding: var(--space-1) var(--space-3);
    border: none;
    border-right: 1px solid var(--color-input-border);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
  }
  .segmented-control button:last-child {
    border-right: none;
  }
  .segmented-control button.active {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  /* Bold toggle */
  .bold-toggle {
    display: flex;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    width: fit-content;
  }
  .bold-toggle input {
    display: none;
  }
  .bold-toggle strong {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-faint);
    font-size: var(--text-sm);
  }
  .bold-toggle input:checked + strong {
    background: var(--color-text);
    color: var(--color-text-inverse);
    border-color: var(--color-text);
  }

  /* Split button */
  .split-btn {
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    cursor: pointer;
    width: fit-content;
  }
  .split-btn:hover {
    background: var(--color-surface-alt);
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-6);
    justify-content: flex-end;
  }
  .btn {
    padding: var(--space-3) var(--space-6);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-lg);
    font-weight: 500;
    cursor: pointer;
  }
  .btn-save {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }
  .btn-save:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .btn-cancel {
    background: var(--color-surface-alt);
    color: var(--color-text-secondary);
  }
  .btn-cancel:hover {
    background: var(--color-border);
  }

  @media (max-width: 900px) {
    .template-editor {
      flex-direction: column;
    }
    .preview-sidebar {
      width: 100%;
      position: static;
    }
    .field-row-inner {
      flex-direction: column;
    }
  }
</style>
