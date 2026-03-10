export type PresetName = 'straight' | 'stirrup' | 'agrafa' | 'bar_1' | 'bar_2' | 'bar_3' | 'custom';

export interface Segment {
  length: number;
  angle: number;
}

export const PRESET_LABELS: Record<PresetName, string> = {
  'straight': 'Straight Bar',
  'stirrup': 'Stirrup',
  'agrafa': 'Hook (Agrafa)',
  'bar_1': 'Bar 1',
  'bar_2': 'Bar 2',
  'bar_3': 'Bar 3',
  'custom': 'Custom',
};

export function getPresetSegments(preset: PresetName): Segment[] {
  switch (preset) {
    case 'straight':
      return [{ length: 1000, angle: 0 }];
    case 'stirrup':
      return [
        { length: 50, angle: 130 },     // opening beak
        { length: 200, angle: -130 },    // straighten to horizontal (right)
        { length: 200, angle: -90 },     // 90° corner (down)
        { length: 200, angle: -90 },     // 90° corner (left)
        { length: 200, angle: -90 },     // 90° corner (up)
        { length: 50, angle: -130 },     // closing beak
      ];
    case 'agrafa':
      return [
        { length: 150, angle: -90 },
        { length: 400, angle: 90 },
        { length: 50, angle: 135 },
      ];
    case 'bar_1':
      return [
        { length: 150, angle: -90 },
        { length: 400, angle: 90 },
      ];
    case 'bar_2':
      return [
        { length: 150, angle: -90 },
        { length: 400, angle: 90 },
        { length: 150, angle: 90 },
      ];
    case 'bar_3':
      return [
        { length: 150, angle: -90 },
        { length: 400, angle: 90 },
        { length: 150, angle: 90 },
        { length: 50, angle: 90 },
      ];
    case 'custom':
      return [];
  }
}
