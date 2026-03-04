<script lang="ts">
  import { currentScreen } from '$lib/stores/uiStore';
  import EditorScreen from '$lib/components/EditorScreen.svelte';
  import TemplateManager from '$lib/components/TemplateManager.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
</script>

{#if $currentScreen === 'editor'}
  <EditorScreen />
{:else if $currentScreen === 'templates'}
  <TemplateManager />
{:else if $currentScreen === 'settings'}
  <SettingsModal />
{/if}
