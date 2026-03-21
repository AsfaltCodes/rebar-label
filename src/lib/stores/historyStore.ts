import { writable, get } from 'svelte/store';
import type { Job, Label } from '$lib/db/types';
import {
  currentJob,
  labels,
  selectedLabelId,
  selectedLabelIds,
  cancelDebouncedSave,
} from './jobStore';
import { markSaved } from './saveStatusStore';

interface HistoryEntry {
  job: Job;
  labels: Label[];
  selectedLabelId: number | null;
}

const MAX_HISTORY = 50;

let undoStack: HistoryEntry[] = [];
let redoStack: HistoryEntry[] = [];
let isRestoring = false;

// Coalescing: skip pushState if same description within 300ms
let lastPushTime = 0;
let lastPushDescription = '';

export const canUndo = writable(false);
export const canRedo = writable(false);

function captureState(): HistoryEntry {
  return {
    job: structuredClone(get(currentJob)!),
    labels: structuredClone(get(labels)),
    selectedLabelId: get(selectedLabelId),
  };
}

function updateFlags(): void {
  canUndo.set(undoStack.length > 0);
  canRedo.set(redoStack.length > 0);
}

/**
 * Capture current state before a mutation.
 * Coalesces rapid calls with the same description (e.g. typing).
 */
export function pushState(description: string): void {
  if (isRestoring) return;
  if (!get(currentJob)) return;

  const now = Date.now();
  if (now - lastPushTime < 300 && description === lastPushDescription) {
    return; // coalesce — the existing snapshot is the "before" for this burst
  }

  const entry = captureState();
  undoStack.push(entry);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];

  lastPushTime = now;
  lastPushDescription = description;
  updateFlags();
}

export async function undo(): Promise<void> {
  if (isRestoring || undoStack.length === 0) return;
  isRestoring = true;
  try {
    const entry = undoStack.pop()!;
    redoStack.push(captureState());
    await restoreState(entry);
    updateFlags();
  } finally {
    isRestoring = false;
  }
}

export async function redo(): Promise<void> {
  if (isRestoring || redoStack.length === 0) return;
  isRestoring = true;
  try {
    const entry = redoStack.pop()!;
    undoStack.push(captureState());
    await restoreState(entry);
    updateFlags();
  } finally {
    isRestoring = false;
  }
}

export function clearHistory(): void {
  undoStack = [];
  redoStack = [];
  lastPushTime = 0;
  lastPushDescription = '';
  updateFlags();
}

async function restoreState(entry: HistoryEntry): Promise<void> {
  // 1. Cancel pending debounced save
  cancelDebouncedSave();

  // 2. Restore stores immediately (optimistic UI)
  currentJob.set(entry.job);
  labels.set(entry.labels);
  selectedLabelId.set(entry.selectedLabelId);
  selectedLabelIds.set(
    new Set(entry.selectedLabelId !== null ? [entry.selectedLabelId] : [])
  );

  // 3. Persist to DB
  try {
    const { db } = await import('$lib/db/api');

    // Save job
    await db.updateJob(entry.job.id, entry.job);

    // Diff labels: current DB vs snapshot
    const dbLabels = await db.listLabels(entry.job.id);
    const snapshotIds = new Set(entry.labels.map(l => l.id));
    const dbIds = new Set(dbLabels.map(l => l.id));

    // Delete labels in DB but not in snapshot
    for (const dbLabel of dbLabels) {
      if (!snapshotIds.has(dbLabel.id)) {
        await db.deleteLabel(dbLabel.id);
      }
    }

    // Update or create labels from snapshot
    let needsReload = false;
    for (const label of entry.labels) {
      if (dbIds.has(label.id)) {
        await db.updateLabel(label.id, label);
      } else {
        // Label was deleted — recreate (gets new ID)
        await db.createLabel({
          job_id: label.job_id,
          field_values: label.field_values,
          shape_preset: label.shape_preset,
          shape_segments: label.shape_segments,
          copies: label.copies,
          sort_order: label.sort_order,
        });
        needsReload = true;
      }
    }

    // If we recreated labels with new IDs, reload to sync
    if (needsReload) {
      const fresh = await db.listLabels(entry.job.id);
      labels.set(fresh);
      // Remap selection by sort_order
      if (entry.selectedLabelId !== null) {
        const origLabel = entry.labels.find(l => l.id === entry.selectedLabelId);
        if (origLabel) {
          const match = fresh.find(l => l.sort_order === origLabel.sort_order);
          if (match) {
            selectedLabelId.set(match.id);
            selectedLabelIds.set(new Set([match.id]));
          }
        }
      }
    }

    markSaved();
  } catch (e) {
    console.error('Failed to restore state:', e);
  }
}
