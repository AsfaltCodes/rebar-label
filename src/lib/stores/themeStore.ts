import { writable, derived, get } from 'svelte/store';
import { themes, SYSTEM_THEME_ID, getThemeById, type ThemePalette } from '$lib/themes/themes';

const STORAGE_KEY = 'theme';

// Migration map: old values → new theme IDs
const MIGRATION: Record<string, string> = {
  light: 'eisenlabel-light',
  dark: 'eisenlabel-dark',
  system: SYSTEM_THEME_ID,
};

/** The selected theme ID (e.g. 'dracula', 'nord', 'system') */
export const theme = writable<string>(SYSTEM_THEME_ID);

/** The resolved theme type actually applied (always 'light' or 'dark') */
export const resolvedTheme = writable<'light' | 'dark'>('light');

/** The resolved palette currently applied */
export const resolvedPalette = derived(
  resolvedTheme,
  ($resolved) => {
    const current = get(theme);
    if (current === SYSTEM_THEME_ID) {
      return $resolved === 'dark'
        ? getThemeById('eisenlabel-dark')!
        : getThemeById('eisenlabel-light')!;
    }
    return getThemeById(current) ?? getThemeById('eisenlabel-light')!;
  }
);

function getSystemPalette(): ThemePalette {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark
    ? getThemeById('eisenlabel-dark')!
    : getThemeById('eisenlabel-light')!;
}

function applyPalette(palette: ThemePalette): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(palette.colors)) {
    root.style.setProperty(key, value);
  }
  resolvedTheme.set(palette.type);
}

function applyThemeId(id: string): void {
  if (id === SYSTEM_THEME_ID) {
    applyPalette(getSystemPalette());
  } else {
    const palette = getThemeById(id);
    if (palette) {
      applyPalette(palette);
    } else {
      // Fallback to system
      applyPalette(getSystemPalette());
    }
  }
}

/** Set theme preference, persist to localStorage, and apply */
export function setTheme(id: string): void {
  theme.set(id);
  localStorage.setItem(STORAGE_KEY, id);
  applyThemeId(id);
}

/** Call once on app startup (in onMount) */
export function initTheme(): void {
  let stored = localStorage.getItem(STORAGE_KEY);

  // Migrate old values
  if (stored && stored in MIGRATION) {
    stored = MIGRATION[stored];
    localStorage.setItem(STORAGE_KEY, stored);
  }

  // Validate stored ID exists
  const id = stored && (stored === SYSTEM_THEME_ID || getThemeById(stored))
    ? stored
    : SYSTEM_THEME_ID;

  theme.set(id);
  applyThemeId(id);

  // Listen for OS theme changes when in 'system' mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (get(theme) === SYSTEM_THEME_ID) {
      applyThemeId(SYSTEM_THEME_ID);
    }
  });
}
