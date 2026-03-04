<script lang="ts">
  import LabelEditor from './LabelEditor.svelte';
  import PagePreview from './PagePreview.svelte';
</script>

<div class="editor-screen">
  <div class="left-panel">
    <LabelEditor />
  </div>
  <div class="right-panel">
    <PagePreview />
  </div>
</div>

<style>
  .editor-screen {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .left-panel {
    width: 35%;
    min-width: 280px;
    max-width: 420px;
    overflow-y: auto;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .right-panel {
    flex: 1;
    overflow: auto;
    background: var(--color-bg);
  }
</style>
