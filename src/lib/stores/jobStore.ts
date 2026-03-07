import { writable, derived, get } from 'svelte/store';
import type { Job, Label, FieldDef } from '$lib/db/types';
import { markSaving, markSaved, markError } from './saveStatusStore';

export const currentJob = writable<Job | null>(null);
export const labels = writable<Label[]>([]);
export const selectedLabelId = writable<number | null>(null);

export const selectedLabel = derived(
  [labels, selectedLabelId],
  ([$labels, $selectedLabelId]) => {
    if ($selectedLabelId === null) return null;
    return $labels.find(l => l.id === $selectedLabelId) ?? null;
  }
);

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(fn: () => Promise<void>, delay = 500): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(fn, delay);
}

export async function loadJob(jobId: number): Promise<void> {
  try {
    const { db } = await import('$lib/db/api');
    const job = await db.getJob(jobId);
    if (!job) return;
    currentJob.set(job);
    const jobLabels = await db.listLabels(jobId);
    labels.set(jobLabels);
    if (jobLabels.length > 0) {
      selectedLabelId.set(jobLabels[0].id);
    } else {
      selectedLabelId.set(null);
    }
  } catch (e) {
    console.error('Failed to load job:', e);
  }
}

export async function createNewLabel(): Promise<void> {
  const job = get(currentJob);
  if (!job) return;

  try {
    const { db } = await import('$lib/db/api');
    const currentLabels = get(labels);
    const maxOrder = currentLabels.length > 0 ? Math.max(...currentLabels.map(l => l.sort_order)) : -1;

    // Pre-fill field_values with defaults from job's field definitions
    const fieldValues: Record<string, string> = {};
    for (const field of job.fields) {
      fieldValues[field.label] = field.default_value || '';
    }

    const newLabel = await db.createLabel({
      job_id: job.id,
      field_values: fieldValues,
      shape_preset: 'straight',
      shape_segments: [{ length: 200, angle: 0 }],
      copies: 1,
      sort_order: maxOrder + 1,
    });

    labels.update(ls => [...ls, newLabel]);
    selectedLabelId.set(newLabel.id);
  } catch (e) {
    console.error('Failed to create label:', e);
  }
}

export async function deleteLabel(id: number): Promise<void> {
  try {
    const { db } = await import('$lib/db/api');
    await db.deleteLabel(id);

    labels.update(ls => {
      const filtered = ls.filter(l => l.id !== id);
      // If deleting the selected label, select another one
      const sel = get(selectedLabelId);
      if (sel === id) {
        if (filtered.length > 0) {
          selectedLabelId.set(filtered[0].id);
        } else {
          selectedLabelId.set(null);
        }
      }
      return filtered;
    });
  } catch (e) {
    console.error('Failed to delete label:', e);
  }
}

export async function duplicateLabel(sourceId: number): Promise<void> {
  const job = get(currentJob);
  if (!job) return;

  try {
    const { db } = await import('$lib/db/api');
    const currentLabels = get(labels);
    const source = currentLabels.find(l => l.id === sourceId);
    if (!source) return;

    const maxOrder = Math.max(...currentLabels.map(l => l.sort_order));

    // Auto-increment: find trailing number in first field value and bump it
    const newFieldValues = { ...source.field_values };
    if (job.fields.length > 0) {
      const firstKey = job.fields[0].label;
      const firstVal = newFieldValues[firstKey] || '';
      const match = firstVal.match(/^(.*?)(\d+)$/);
      if (match) {
        newFieldValues[firstKey] = match[1] + String(parseInt(match[2]) + 1);
      }
    }

    const newLabel = await db.createLabel({
      job_id: job.id,
      field_values: newFieldValues,
      shape_preset: source.shape_preset,
      shape_segments: [...source.shape_segments],
      copies: source.copies,
      sort_order: maxOrder + 1,
    });

    labels.update(ls => [...ls, newLabel]);
    selectedLabelId.set(newLabel.id);
  } catch (e) {
    console.error('Failed to duplicate label:', e);
  }
}

export function updateSelectedLabel(changes: Partial<Label>): void {
  const selId = get(selectedLabelId);
  if (selId === null) return;

  labels.update(ls =>
    ls.map(l => (l.id === selId ? { ...l, ...changes } : l))
  );

  // Debounced persist with save status feedback
  markSaving();
  debouncedSave(async () => {
    try {
      const { db } = await import('$lib/db/api');
      await db.updateLabel(selId, changes);
      markSaved();
    } catch (e) {
      console.error('Failed to save label:', e);
      markError();
    }
  });
}

export function updateLabelById(id: number, changes: Partial<Label>): void {
  labels.update(ls =>
    ls.map(l => (l.id === id ? { ...l, ...changes } : l))
  );

  markSaving();
  debouncedSave(async () => {
    try {
      const { db } = await import('$lib/db/api');
      await db.updateLabel(id, changes);
      markSaved();
    } catch (e) {
      console.error('Failed to save label:', e);
      markError();
    }
  });
}

export async function updateJob(changes: Partial<Job>): Promise<void> {
  const job = get(currentJob);
  if (!job) return;

  currentJob.update(j => (j ? { ...j, ...changes } : j));

  debouncedSave(async () => {
    try {
      const { db } = await import('$lib/db/api');
      await db.updateJob(job.id, changes);
    } catch (e) {
      console.error('Failed to save job:', e);
    }
  });
}
