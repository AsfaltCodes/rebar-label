<script lang="ts">
  import { onDestroy } from 'svelte';
  import LabelList from './LabelList.svelte';
  import LabelEditor from './LabelEditor.svelte';
  import PagePreview from './PagePreview.svelte';

  // Panel widths (px) — session-only, not persisted
  let listWidth = 220;
  let editorWidth = 420;

  // Constraints
  const LIST_MIN = 140;
  const LIST_MAX = 400;
  const EDITOR_MIN = 280;
  const EDITOR_MAX = 700;

  // Drag state
  let dragging: 'list' | 'editor' | null = null;
  let dragStartX = 0;
  let dragStartWidth = 0;

  function onDividerDown(e: MouseEvent, which: 'list' | 'editor') {
    e.preventDefault();
    dragging = which;
    dragStartX = e.clientX;
    dragStartWidth = which === 'list' ? listWidth : editorWidth;
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', onDragEnd);
  }

  function onDrag(e: MouseEvent) {
    if (!dragging) return;
    const delta = e.clientX - dragStartX;
    if (dragging === 'list') {
      listWidth = Math.max(LIST_MIN, Math.min(LIST_MAX, dragStartWidth + delta));
    } else {
      editorWidth = Math.max(EDITOR_MIN, Math.min(EDITOR_MAX, dragStartWidth + delta));
    }
  }

  function onDragEnd() {
    dragging = null;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', onDragEnd);
  }

  onDestroy(() => {
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', onDragEnd);
  });
</script>

<div class="editor-screen" class:dragging={dragging !== null}>
  <div class="list-panel" style="width:{listWidth}px">
    <LabelList />
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="divider" on:mousedown={(e) => onDividerDown(e, 'list')}></div>
  <div class="editor-panel" style="width:{editorWidth}px">
    <LabelEditor />
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="divider" on:mousedown={(e) => onDividerDown(e, 'editor')}></div>
  <div class="preview-panel">
    <PagePreview />
  </div>
</div>

<style>
  .editor-screen {
    display: flex;
    flex: 1;
    overflow: hidden;
    height: 100%;
  }
  .editor-screen.dragging {
    cursor: col-resize;
    user-select: none;
  }
  .list-panel {
    flex-shrink: 0;
    overflow: hidden;
  }
  .editor-panel {
    flex-shrink: 0;
    overflow-y: auto;
    background: var(--color-surface);
  }
  .preview-panel {
    flex: 1;
    overflow: auto;
    background: var(--color-bg);
    min-width: 300px;
  }
  .divider {
    width: 4px;
    flex-shrink: 0;
    background: var(--color-border);
    cursor: col-resize;
    transition: background var(--transition-fast);
  }
  .divider:hover,
  .editor-screen.dragging .divider {
    background: var(--color-primary);
  }
</style>
