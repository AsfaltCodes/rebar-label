export type PresetName = 'straight' | 'l-shape' | 'u-shape' | 'z-shape' | 'stirrup' | 'triangle' | 'hook' | 'custom';

export interface Segment {
  length: number;
  angle: number;
}

export const PRESET_LABELS: Record<PresetName, string> = {
  'straight': 'Straight',
  'l-shape': 'L-Shape',
  'u-shape': 'U-Shape',
  'z-shape': 'Z-Shape',
  'stirrup': 'Stirrup',
  'triangle': 'Triangle',
  'hook': 'Hook',
  'custom': 'Custom',
};

export function getPresetSegments(preset: PresetName): Segment[] {
  switch (preset) {
    case 'straight':
      return [{ length: 1000, angle: 0 }];
    case 'l-shape':
      return [
        { length: 500, angle: 0 },
        { length: 300, angle: 90 },
      ];
    case 'u-shape':
      return [
        { length: 200, angle: 0 },
        { length: 500, angle: 90 },
        { length: 200, angle: 90 },
      ];
    case 'z-shape':
      return [
        { length: 300, angle: 0 },
        { length: 400, angle: -60 },
        { length: 300, angle: 60 },
      ];
    case 'stirrup':
      return [
        { length: 350, angle: 0 },
        { length: 250, angle: 90 },
        { length: 350, angle: 90 },
        { length: 250, angle: 90 },
      ];
    case 'triangle':
      return [
        { length: 300, angle: 0 },
        { length: 300, angle: 120 },
        { length: 300, angle: 120 },
      ];
    case 'hook':
      return [
        { length: 500, angle: 0 },
        { length: 80, angle: 180 },
      ];
    case 'custom':
      return [];
  }
}
