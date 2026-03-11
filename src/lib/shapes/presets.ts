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
// Positive angle = counterclockwise (left turn), negative = clockwise (right turn).
// The angle on the last segment is the final physical bend (no visual effect on shape).
export function getPresetSegments(preset: PresetName): Segment[] {
  switch (preset) {
    case 'straight':
      return [{ length: 1000, angle: 0 }];
    case 'stirrup':
      return [
        { length: 70, angle: 135 },    // feed 70mm right, bend 135° (seismic hook)
        { length: 200, angle: 90 },     // feed 200mm at 135°, bend 90°
        { length: 200, angle: 90 },     // feed 200mm at 225°, bend 90°
        { length: 200, angle: 90 },     // feed 200mm at 315°, bend 90°
        { length: 200, angle: 135 },    // feed 200mm at 45°, bend 135° (closing hook)
        { length: 70, angle: 0 },       // feed 70mm at 180°, final bend 0°
      ];
    case 'agrafa':
      return [
        { length: 150, angle: 90 },    // feed 150mm right, bend 90°
        { length: 400, angle: 135 },    // feed 400mm down, bend 135° (hook transition)
        { length: 50, angle: 0 },       // feed 50mm at 45° (visible hook)
      ];
    case 'bar_1':
      return [
        { length: 150, angle: 90 },    // feed 150mm right, bend 90°
        { length: 400, angle: 0 },      // feed 400mm down
      ];
    case 'bar_2':
      return [
        { length: 150, angle: 90 },    // feed 150mm right, bend 90°
        { length: 400, angle: 90 },    // feed 400mm down, bend 90°
        { length: 150, angle: 0 },      // feed 150mm left
      ];
    case 'bar_3':
      return [
        { length: 150, angle: 90 },    // feed 150mm right, bend 90°
        { length: 400, angle: 90 },    // feed 400mm down, bend 90°
        { length: 150, angle: 90 },    // feed 150mm left, bend 90°
        { length: 50, angle: 0 },       // feed 50mm up
      ];
    case 'custom':
      return [];
  }
}
