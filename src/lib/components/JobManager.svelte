<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '$lib/db/api';
  import { currentScreen, showNewJobModal } from '$lib/stores/uiStore';
  import { loadJob } from '$lib/stores/jobStore';
  import { addToast } from '$lib/stores/toastStore';
  import Icon from './ui/Icon.svelte';
  import Button from './ui/Button.svelte';
  import ConfirmDialog from './ui/ConfirmDialog.svelte';

  interface JobRow {
    id: number;
    name: string;
    client_name: string;
    created_at: string;
    updated_at: string;
    labelCount: number;
  }

  let jobs: JobRow[] = [];
  let search = '';
  let sortBy: 'name' | 'client_name' | 'labelCount' | 'created_at' | 'updated_at' = 'updated_at';
  let sortDir: 'asc' | 'desc' = 'desc';
  let deleteConfirm = { open: false, id: 0, name: '' };

  onMount(loadJobs);

  async function loadJobs() {
    try {
      const allJobs = await db.listJobs();
      jobs = await Promise.all(
        allJobs.map(async (j) => {
          const labels = await db.listLabels(j.id);
          return {
            id: j.id,
            name: j.name,
            client_name: j.client_name || '',
            created_at: j.created_at,
            updated_at: j.updated_at,
            labelCount: labels.length,
          };
        })
      );
    } catch (e) {
      console.error('Failed to load jobs:', e);
      addToast('Failed to load jobs', 'error');
    }
  }

  $: filtered = jobs.filter(j => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return j.name.toLowerCase().includes(q) || j.client_name.toLowerCase().includes(q);
  });

  $: sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name' || sortBy === 'client_name') {
      cmp = a[sortBy].localeCompare(b[sortBy]);
    } else if (sortBy === 'labelCount') {
      cmp = a.labelCount - b.labelCount;
    } else {
      cmp = a[sortBy].localeCompare(b[sortBy]);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function handleSort(col: typeof sortBy) {
    if (sortBy === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = col;
      sortDir = col === 'name' || col === 'client_name' ? 'asc' : 'desc';
    }
  }

  async function openJob(id: number) {
    await loadJob(id);
    currentScreen.set('editor');
  }

  function promptDelete(id: number, name: string) {
    deleteConfirm = { open: true, id, name };
  }

  async function confirmDelete() {
    try {
      await db.deleteJob(deleteConfirm.id);
      await loadJobs();
      addToast('Job deleted', 'success');
    } catch (e) {
      console.error('Failed to delete job:', e);
      addToast('Failed to delete job', 'error');
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateVal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = today.getTime() - dateVal.getTime();
    const days = Math.floor(diff / 86400000);

    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 0) return `Today ${time}`;
    if (days === 1) return `Yesterday ${time}`;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()} ${time}`;
  }

  function sortIndicator(col: typeof sortBy): string {
    if (sortBy !== col) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  }
</script>

<div class="job-manager">
  <div class="jm-header">
    <h2 class="jm-title">Jobs</h2>
    <div class="jm-actions">
      <div class="search-box">
        <Icon name="search" size={14} />
        <input
          type="text"
          placeholder="Search jobs..."
          bind:value={search}
        />
      </div>
      <Button variant="primary" on:click={() => showNewJobModal.set(true)}>
        <Icon name="plus" size={14} />
        New Job
      </Button>
    </div>
  </div>

  {#if jobs.length === 0}
    <div class="empty-state">
      <Icon name="file-text" size={48} />
      <p>No jobs yet</p>
      <p class="empty-hint">Create your first job to get started</p>
      <Button variant="primary" on:click={() => showNewJobModal.set(true)}>
        <Icon name="plus" size={14} />
        New Job
      </Button>
    </div>
  {:else}
    <div class="table-wrap">
      <table class="job-table">
        <thead>
          <tr>
            <th class="sortable" on:click={() => handleSort('name')}>
              Name{sortIndicator('name')}
            </th>
            <th class="sortable" on:click={() => handleSort('client_name')}>
              Client{sortIndicator('client_name')}
            </th>
            <th class="sortable col-num" on:click={() => handleSort('labelCount')}>
              Labels{sortIndicator('labelCount')}
            </th>
            <th class="sortable col-date" on:click={() => handleSort('created_at')}>
              Created{sortIndicator('created_at')}
            </th>
            <th class="sortable col-date" on:click={() => handleSort('updated_at')}>
              Modified{sortIndicator('updated_at')}
            </th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          {#each sorted as job (job.id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <tr class="job-row" on:click={() => openJob(job.id)}>
              <td class="cell-name">{job.name}</td>
              <td class="cell-client">{job.client_name || '\u2014'}</td>
              <td class="cell-num">{job.labelCount}</td>
              <td class="cell-date">{formatDate(job.created_at)}</td>
              <td class="cell-date">{formatDate(job.updated_at)}</td>
              <td class="cell-actions">
                <button
                  class="row-delete"
                  on:click|stopPropagation={() => promptDelete(job.id, job.name)}
                  title="Delete job"
                >
                  <Icon name="trash" size={14} />
                </button>
              </td>
            </tr>
          {/each}
          {#if sorted.length === 0 && search.trim()}
            <tr>
              <td colspan="6" class="no-results">No jobs match "{search}"</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<ConfirmDialog
  bind:open={deleteConfirm.open}
  title="Delete Job"
  message={`Delete "${deleteConfirm.name}" and all its labels? This cannot be undone.`}
  confirmLabel="Delete"
  danger={true}
  onConfirm={confirmDelete}
/>

<style>
  .job-manager {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg);
    overflow: hidden;
  }

  .jm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0;
  }

  .jm-title {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .jm-actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-muted);
    min-width: 220px;
  }

  .search-box:focus-within {
    border-color: var(--color-input-focus);
    box-shadow: 0 0 0 2px var(--color-input-focus-ring);
  }

  .search-box input {
    border: none;
    background: none;
    outline: none;
    font-size: var(--text-base);
    color: var(--color-text);
    flex: 1;
    min-width: 0;
  }

  .search-box input::placeholder {
    color: var(--color-text-faint);
  }

  /* Table */
  .table-wrap {
    flex: 1;
    overflow: auto;
    padding: var(--space-3) var(--space-5);
  }

  .job-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-base);
  }

  .job-table thead {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .job-table th {
    text-align: left;
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: var(--color-bg);
    border-bottom: 2px solid var(--color-border);
    white-space: nowrap;
    user-select: none;
  }

  .sortable {
    cursor: pointer;
  }

  .sortable:hover {
    color: var(--color-text);
  }

  .col-num {
    text-align: center;
    width: 80px;
  }

  .col-date {
    width: 150px;
  }

  .col-actions {
    width: 44px;
  }

  .job-row {
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .job-row:hover {
    background: var(--color-surface-hover);
  }

  .job-row td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .cell-name {
    font-weight: 500;
    font-size: var(--text-lg);
  }

  .cell-client {
    color: var(--color-text-secondary);
  }

  .cell-num {
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .cell-date {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    white-space: nowrap;
  }

  .cell-actions {
    text-align: center;
  }

  .row-delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: none;
    color: var(--color-text-faint);
    cursor: pointer;
    border-radius: var(--radius-sm);
    opacity: 0;
    transition: opacity var(--transition-fast), color var(--transition-fast);
  }

  .job-row:hover .row-delete {
    opacity: 1;
  }

  .row-delete:hover {
    color: var(--color-danger);
    background: var(--color-surface-alt);
  }

  .no-results {
    text-align: center;
    padding: var(--space-6) var(--space-3);
    color: var(--color-text-faint);
    font-style: italic;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: var(--space-3);
    color: var(--color-text-faint);
    padding: var(--space-7);
  }

  .empty-state p {
    margin: 0;
    font-size: var(--text-lg);
  }

  .empty-hint {
    font-size: var(--text-base);
  }
</style>
