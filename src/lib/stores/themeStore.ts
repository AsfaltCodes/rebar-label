import { writable, get } from 'svelte/store';

export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';

export const theme = writable<Theme>('system');

/** The resolved theme actually applied (always 'light' or 'dark') */
export const resolvedTheme = writable<'light' | 'dark'>('light');

function resolve(t: Theme): 'light' | 'dark' {
  if (t === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return t;
}

function apply(t: Theme): void {
  const resolved = resolve(t);
  document.documentElement.setAttribute('data-theme', resolved);
  resolvedTheme.set(resolved);
}

/** Set theme preference, persist to localStorage, and apply */
export function setTheme(t: Theme): void {
  theme.set(t);
  localStorage.setItem(STORAGE_KEY, t);
  apply(t);
}

/** Cycle: system → dark → light → system */
export function cycleTheme(): void {
  const current = get(theme);
  const next: Theme = current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system';
  setTheme(next);
}

/** Call once on app startup (in onMount) */
export function initTheme(): void {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  const initial: Theme = stored && ['system', 'light', 'dark'].includes(stored) ? stored : 'system';

  theme.set(initial);
  apply(initial);

  // Listen for OS theme changes when in 'system' mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (get(theme) === 'system') {
      apply('system');
    }
  });
}
