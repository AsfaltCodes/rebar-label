<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import MenuBar from '$lib/components/MenuBar.svelte';
  import TopBar from '$lib/components/TopBar.svelte';
  import StatusBar from '$lib/components/StatusBar.svelte';
  import NewJobModal from '$lib/components/NewJobModal.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import Toast from '$lib/components/ui/Toast.svelte';
  import { addToast } from '$lib/stores/toastStore';
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

  let jobs: { id: number; name: string; client_name: string; created_at: string; updated_at: string; labelCount: number }[] = $state([]);
  let deleteJobConfirm = $state({ open: false, id: 0, name: '' });

  /** Refresh the jobs list from DB (called on mount + after new job created) */
  async function refreshJobs() {
    const allJobs = await db.listJobs();
    const jobsWithCounts = await Promise.all(
      allJobs.map(async (j) => {
        const jobLabels = await db.listLabels(j.id);
        return {
          id: j.id,
          name: j.name,
          client_name: j.client_name || '',
          created_at: j.created_at,
          updated_at: j.updated_at,
          labelCount: jobLabels.length,
        };
      })
    );
    jobs = jobsWithCounts;
  }

  async function handleSelectJob(id: number) {
    await loadJob(id);
    currentScreen.set('editor');
  }

  function handleDeleteJob(id: number) {
    const job = jobs.find(j => j.id === id);
    deleteJobConfirm = { open: true, id, name: job?.name || 'this job' };
  }

  async function confirmDeleteJob() {
    try {
      await db.deleteJob(deleteJobConfirm.id);
      const wasActive = get(currentJob)?.id === deleteJobConfirm.id;
      await refreshJobs();
      if (wasActive) {
        if (jobs.length > 0) {
          await loadJob(jobs[0].id);
        } else {
          currentJob.set(null);
          labels.set([]);
        }
      }
      addToast('Job deleted', 'success');
    } catch (e) {
      console.error('Failed to delete job:', e);
      addToast('Failed to delete job', 'error');
    }
  }

  async function handlePrint() {
    const job = get(currentJob);
    if (!job) return;
    const allLabels = get(labels);
    const s = get(settings);
    await exportPdf(job, allLabels, s, s.logo_image_path || null);
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
  <MenuBar {jobs} onSelectJob={handleSelectJob} onPrint={handlePrint} onDeleteJob={handleDeleteJob} />
  <TopBar onPrint={handlePrint} />
  <main class="app-main">
    {@render children()}
  </main>
  <StatusBar />
</div>

<!-- Modal overlays — render above everything -->
<NewJobModal onCreated={handleJobCreated} />
<SettingsModal />
<ConfirmDialog
  bind:open={deleteJobConfirm.open}
  title="Delete Job"
  message={`Delete "${deleteJobConfirm.name}" and all its labels? This cannot be undone.`}
  confirmLabel="Delete"
  danger={true}
  onConfirm={confirmDeleteJob}
/>
<ConfirmDialog
  bind:open={deleteJobConfirm.open}
  title="Delete Job"
  message={`Delete "${deleteJobConfirm.name}" and all its labels? This cannot be undone.`}
  confirmLabel="Delete"
  danger={true}
  onConfirm={confirmDeleteJob}
/>

<!-- Toast notifications -->
<Toast />

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
