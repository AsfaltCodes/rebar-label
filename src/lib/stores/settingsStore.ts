import { writable, get } from 'svelte/store';
import type { AppSettings } from '$lib/db/types';
import { DEFAULT_SETTINGS } from '$lib/db/types';

export const settings = writable<AppSettings>({ ...DEFAULT_SETTINGS });
export const settingsLoaded = writable(false);

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/** One-time migration: convert custom preset angles from absolute back to CNC bend (relative) angles */
function migrateAbsoluteToRelative(presets: AppSettings['custom_shape_presets']): AppSettings['custom_shape_presets'] {
  return presets.map(p => {
    const newSegments = p.segments.map((seg, i) => {
      const prevAngle = i === 0 ? 0 : p.segments[i - 1].angle;
      return { ...seg, angle: seg.angle - prevAngle };
    });
    return { ...p, segments: newSegments };
  });
}

export async function loadSettings(): Promise<void> {
  try {
    const { db } = await import('$lib/db/api');
    const s = await db.getSettings();

    // Migrate custom preset angles from absolute to CNC bend (relative) angles
    if (s.custom_shape_presets?.length > 0 && (s as any).shape_angles_migrated && !(s as any).shape_angles_relative) {
      s.custom_shape_presets = migrateAbsoluteToRelative(s.custom_shape_presets);
      (s as any).shape_angles_relative = true;
      await db.updateSettings({ custom_shape_presets: s.custom_shape_presets, shape_angles_relative: true } as any);
    }

    // Migrate localStorage labels from absolute to relative angles (dev mode only)
    if (typeof localStorage !== 'undefined') {
      const migKey = 'eisenlabel_angles_migrated_to_relative';
      if (!localStorage.getItem(migKey)) {
        const raw = localStorage.getItem('eisenlabel_labels');
        if (raw) {
          try {
            const labels = JSON.parse(raw);
            for (const label of labels) {
              if (label.shape_segments?.length > 0) {
                let prevAngle = 0;
                label.shape_segments = label.shape_segments.map((seg: { length: number; angle: number }) => {
                  const rel = seg.angle - prevAngle;
                  prevAngle = seg.angle;
                  return { ...seg, angle: rel };
                });
              }
            }
            localStorage.setItem('eisenlabel_labels', JSON.stringify(labels));
          } catch {}
        }
        localStorage.setItem(migKey, '1');
      }
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
