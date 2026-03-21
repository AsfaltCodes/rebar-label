import { writable } from 'svelte/store';

export type Screen = 'editor' | 'templates' | 'jobs';

export const currentScreen = writable<Screen>('editor');
export const currentPage = writable(0);
export const showNewJobModal = writable(false);
export const showSettingsModal = writable(false);
