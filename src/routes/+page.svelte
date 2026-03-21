<script lang="ts">
  import { currentScreen } from '$lib/stores/uiStore';
  import EditorScreen from '$lib/components/EditorScreen.svelte';
  import TemplateManager from '$lib/components/TemplateManager.svelte';
  import JobManager from '$lib/components/JobManager.svelte';
</script>

{#if $currentScreen === 'editor'}
  <EditorScreen />
{:else if $currentScreen === 'templates'}
  <TemplateManager />
{:else if $currentScreen === 'jobs'}
  <JobManager />
{:else}
  <JobManager />
{/if}
