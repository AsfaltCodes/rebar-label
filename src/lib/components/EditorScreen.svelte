<script lang="ts">
  import LabelList from './LabelList.svelte';
  import LabelEditor from './LabelEditor.svelte';
  import PagePreview from './PagePreview.svelte';
</script>

<div class="editor-screen">
  <div class="list-panel">
    <LabelList />
  </div>
  <div class="editor-panel">
    <LabelEditor />
  </div>
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
  .list-panel {
    width: 220px;
    flex-shrink: 0;
    border-right: 1px solid var(--color-border);
    overflow: hidden;
  }
  .editor-panel {
    width: 420px;
    flex-shrink: 0;
    overflow-y: auto;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .preview-panel {
    flex: 1;
    overflow: auto;
    background: var(--color-bg);
    min-width: 300px;
  }
</style>
