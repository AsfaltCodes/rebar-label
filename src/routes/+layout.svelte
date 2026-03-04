<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import TopBar from '$lib/components/TopBar.svelte';
  import NewJobModal from '$lib/components/NewJobModal.svelte';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { loadSettings, settings } from '$lib/stores/settingsStore';
  import { currentJob, labels, loadJob } from '$lib/stores/jobStore';
  import { currentScreen, showNewJobModal } from '$lib/stores/uiStore';
  import { exportPdf } from '$lib/pdf/generator';
  import { initTheme } from '$lib/stores/themeStore';
  import { db } from '$lib/db/api';
  import type { Job } from '$lib/db/types';

  let { children } = $props();

  let jobs: { id: number; name: string; updated_at: string }[] = $state([]);

  /** Refresh the jobs list from DB (called on mount + after new job created) */
  async function refreshJobs() {
    const allJobs = await db.listJobs();
    jobs = allJobs.map(j => ({ id: j.id, name: j.name, updated_at: j.updated_at }));
  }

  async function handleSelectJob(id: number) {
    await loadJob(id);
    currentScreen.set('editor');
  }

  async function handlePrint() {
    const job = get(currentJob);
    if (!job) return;
    const allLabels = get(labels);
    const s = get(settings);
    await exportPdf(job, allLabels, s, null);
  }

  /** Called by NewJobModal after a job is successfully created */
  async function handleJobCreated(job: Job) {
    await loadJob(job.id);
    await refreshJobs();
    currentScreen.set('editor');
  }

  onMount(async () => {
    initTheme();
    await loadSettings();
    await refreshJobs();

    // If jobs exist, load the most recent one; otherwise prompt to create
    if (jobs.length > 0) {
      await loadJob(jobs[0].id);
    } else {
      showNewJobModal.set(true);
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
  <TopBar {jobs} onSelectJob={handleSelectJob} onPrint={handlePrint} />
  <main class="app-main">
    {@render children()}
  </main>
</div>

<!-- Modal overlay — renders above everything when triggered from TopBar -->
<NewJobModal onCreated={handleJobCreated} />

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  .app-main {
    flex: 1;
    overflow: hidden;
  }
</style>
