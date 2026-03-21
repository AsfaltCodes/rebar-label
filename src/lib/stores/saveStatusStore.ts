import { writable } from 'svelte/store';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export const saveStatus = writable<SaveStatus>('idle');

let resetTimeout: ReturnType<typeof setTimeout> | null = null;

/** Mark as saving — called when debounce fires */
export function markSaving() {
  saveStatus.set('saving');
  if (resetTimeout) clearTimeout(resetTimeout);
}

/** Mark as saved — called after successful persist */
export function markSaved() {
  saveStatus.set('saved');
  if (resetTimeout) clearTimeout(resetTimeout);
  resetTimeout = setTimeout(() => saveStatus.set('idle'), 2000);
}

/** Mark as error — called on failed persist */
export function markError() {
  saveStatus.set('error');
  if (resetTimeout) clearTimeout(resetTimeout);
  resetTimeout = setTimeout(() => saveStatus.set('idle'), 4000);
}
