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

// CNC "bend after draw" convention:
// Each row = (feed length, then bend this angle). Bar starts at 0° (horizontal/rightward).
// Positive angle = counterclockwise (left turn).
// The angle on the last segment is the final physical bend (no visual effect on shape).
export function getPresetSegments(preset: PresetName): Segment[] {
  switch (preset) {
    case 'straight':
      return [{ length: 1000, angle: 0 }];
    case 'stirrup':
      return [
        { length: 70, angle: 135 },
        { length: 200, angle: 90 },
        { length: 200, angle: 90 },
        { length: 200, angle: 90 },
        { length: 200, angle: 135 },
        { length: 70, angle: 0 },
      ];
    case 'agrafa':
      return [
        { length: 150, angle: 90 },
        { length: 400, angle: 135 },
        { length: 50, angle: 0 },
      ];
    case 'bar_1':
      return [
        { length: 150, angle: 90 },
        { length: 400, angle: 0 },
      ];
    case 'bar_2':
      return [
        { length: 150, angle: 90 },
        { length: 400, angle: 90 },
        { length: 150, angle: 0 },
      ];
    case 'bar_3':
      return [
        { length: 150, angle: 90 },
        { length: 400, angle: 90 },
        { length: 150, angle: 90 },
        { length: 50, angle: 0 },
      ];
    case 'custom':
      return [];
  }
}
