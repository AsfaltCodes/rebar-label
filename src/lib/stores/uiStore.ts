import { writable } from 'svelte/store';

export type Screen = 'editor' | 'templates' | 'settings';

export const currentScreen = writable<Screen>('editor');
export const currentPage = writable(0);
export const showNewJobModal = writable(false);
export const showTemplateEditor = writable(false);
export const editingTemplateId = writable<number | null>(null);
