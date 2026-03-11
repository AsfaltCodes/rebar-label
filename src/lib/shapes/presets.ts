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

/** CNC bend-before convention: each segment = (length, bend_angle_before_drawing).
 *  The angle on each segment is applied BEFORE drawing that segment (relative to previous segment).
 *  Positive angle = clockwise on screen. */
export function getPresetSegments(preset: PresetName): Segment[] {
  switch (preset) {
    case 'straight':
      return [{ length: 1000, angle: 0 }];
    case 'stirrup':
      return [
        { length: 75, angle: 0 },       // opening hook
        { length: 200, angle: 135 },    // side 1
        { length: 200, angle: 90 },     // side 2
        { length: 200, angle: 90 },     // side 3
        { length: 200, angle: 90 },     // side 4
        { length: 75, angle: 135 },     // closing hook
      ];
    case 'agrafa':
      return [
        { length: 150, angle: 0 },
        { length: 400, angle: 90 },
        { length: 50, angle: 135 },
      ];
    case 'bar_1':
      return [
        { length: 150, angle: 0 },
        { length: 400, angle: 90 },
      ];
    case 'bar_2':
      return [
        { length: 150, angle: 0 },
        { length: 400, angle: 90 },
        { length: 150, angle: 90 },
      ];
    case 'bar_3':
      return [
        { length: 150, angle: 0 },
        { length: 400, angle: 90 },
        { length: 150, angle: 90 },
        { length: 50, angle: 90 },
      ];
    case 'custom':
      return [];
  }
}
