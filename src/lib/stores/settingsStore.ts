import { writable, get } from 'svelte/store';
import type { AppSettings } from '$lib/db/types';
import { DEFAULT_SETTINGS } from '$lib/db/types';

export const settings = writable<AppSettings>({ ...DEFAULT_SETTINGS });
export const settingsLoaded = writable(false);

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/** One-time migration: convert custom preset angles from relative (delta) to absolute */
function migratePresetsToAbsolute(presets: AppSettings['custom_shape_presets']): AppSettings['custom_shape_presets'] {
  return presets.map(p => {
    let cumulative = 0;
    const newSegments = p.segments.map(seg => {
      cumulative += seg.angle;
      return { ...seg, angle: cumulative };
    });
    return { ...p, segments: newSegments };
  });
}

export async function loadSettings(): Promise<void> {
  try {
    const { db } = await import('$lib/db/api');
    const s = await db.getSettings();

    // Migrate custom preset angles from relative to absolute (one-time)
    if (s.custom_shape_presets?.length > 0 && !(s as any).shape_angles_migrated) {
      s.custom_shape_presets = migratePresetsToAbsolute(s.custom_shape_presets);
      (s as any).shape_angles_migrated = true;
      await db.updateSettings({ custom_shape_presets: s.custom_shape_presets, shape_angles_migrated: true } as any);
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
