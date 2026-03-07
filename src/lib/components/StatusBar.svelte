<script lang="ts">
  import { currentJob, labels } from '$lib/stores/jobStore';
  import { saveStatus } from '$lib/stores/saveStatusStore';
</script>

<footer class="statusbar">
  <span class="statusbar-section">
    {#if $currentJob}
      {$currentJob.name}
    {:else}
      No job open
    {/if}
  </span>
  <span class="statusbar-divider"></span>
  <span class="statusbar-section">
    Labels: {$labels.length}
  </span>
  <span class="statusbar-divider"></span>
  <span class="statusbar-section status-indicator">
    {#if $saveStatus === 'saving'}
      Saving...
    {:else if $saveStatus === 'saved'}
      Saved
    {:else if $saveStatus === 'error'}
      Save error
    {:else}
      Ready
    {/if}
  </span>
  <span class="statusbar-spacer"></span>
</footer>

<style>
  .statusbar {
    display: flex;
    align-items: center;
    height: 22px;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    padding: 0 8px;
    flex-shrink: 0;
    font-size: 11px;
    color: var(--color-text-muted);
    user-select: none;
    gap: 0;
  }

  .statusbar-section {
    padding: 0 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .statusbar-divider {
    width: 1px;
    height: 14px;
    background: var(--color-border);
    flex-shrink: 0;
  }

  .statusbar-spacer {
    flex: 1;
  }

  .status-indicator {
    font-style: italic;
  }
</style>
