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

// All angles are CNC-style bend angles: deflection from current direction.
// Positive = counterclockwise (left turn), negative = clockwise (right turn).
// First segment angle sets initial direction (0 = rightward).
export function getPresetSegments(preset: PresetName): Segment[] {
  switch (preset) {
    case 'straight':
      return [{ length: 1000, angle: 0 }];
    case 'stirrup':
      return [
        { length: 70, angle: 135 },    // seismic hook (135° bend)
        { length: 200, angle: 90 },     // 90° bend
        { length: 200, angle: 90 },     // 90° bend
        { length: 200, angle: 90 },     // 90° bend
        { length: 70, angle: 135 },     // seismic hook (135° bend)
      ];
    case 'agrafa':
      return [
        { length: 150, angle: -90 },    // start downward (bend -90° from right)
        { length: 400, angle: 90 },     // bend 90° left → go right
        { length: 50, angle: 135 },     // hook (135° bend)
      ];
    case 'bar_1':
      return [
        { length: 150, angle: -90 },    // start downward
        { length: 400, angle: 90 },     // bend 90° → go right
      ];
    case 'bar_2':
      return [
        { length: 150, angle: -90 },    // start downward
        { length: 400, angle: 90 },     // bend 90° → go right
        { length: 150, angle: 90 },     // bend 90° → go up
      ];
    case 'bar_3':
      return [
        { length: 150, angle: -90 },    // start downward
        { length: 400, angle: 90 },     // bend 90° → go right
        { length: 150, angle: 90 },     // bend 90° → go up
        { length: 50, angle: 90 },      // bend 90° → go left (hook)
      ];
    case 'custom':
      return [];
  }
}
