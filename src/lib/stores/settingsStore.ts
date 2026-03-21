import { writable, get } from 'svelte/store';
import type { AppSettings } from '$lib/db/types';
import { DEFAULT_SETTINGS } from '$lib/db/types';

export const settings = writable<AppSettings>({ ...DEFAULT_SETTINGS });
export const settingsLoaded = writable(false);

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export async function loadSettings(): Promise<void> {
  try {
    const { db } = await import('$lib/db/api');
    const s = await db.getSettings();

    // One-time migration to CNC bend-after angles: clear custom presets created under broken system
    if (!(s as any).shape_bend_after_migrated) {
      if (s.custom_shape_presets?.length > 0) {
        s.custom_shape_presets = [];
      }
      (s as any).shape_bend_after_migrated = true;
      await db.updateSettings({ custom_shape_presets: s.custom_shape_presets ?? [], shape_bend_after_migrated: true } as any);
    }

    settings.set(s);
    settingsLoaded.set(true);
  } catch (e) {
    console.error('Failed to load settings:', e);
    settingsLoaded.set(true);
  }
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<void> {
  settings.update(s => ({ ...s, ...partial }));

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      const { db } = await import('$lib/db/api');
      await db.updateSettings(partial);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, 500);
}
