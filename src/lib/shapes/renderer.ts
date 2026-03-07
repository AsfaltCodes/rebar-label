import type { Segment } from './presets';

export interface Point {
  x: number;
  y: number;
}

export interface ShapeRenderData {
  pathD: string;           // SVG path d attribute
  points: Point[];         // All vertices
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  segmentMidpoints: { x: number; y: number; length: number; angle: number }[]; // For dimension labels
  isClosed: boolean;
}

export function renderSegments(segments: Segment[]): ShapeRenderData {
  if (segments.length === 0) {
    return {
      pathD: '',
      points: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      segmentMidpoints: [],
      isClosed: false,
    };
  }

  const points: Point[] = [{ x: 0, y: 0 }];
  const segmentMidpoints: ShapeRenderData['segmentMidpoints'] = [];
  let currentAngle = 0; // degrees, 0 = pointing right
  let x = 0;
  let y = 0;

  for (const seg of segments) {
    currentAngle += seg.angle;
    const rad = (currentAngle * Math.PI) / 180;
    const dx = Math.cos(rad) * seg.length;
    const dy = Math.sin(rad) * seg.length;

    const midX = x + dx / 2;
    const midY = y + dy / 2;
    segmentMidpoints.push({ x: midX, y: midY, length: seg.length, angle: currentAngle });

    x += dx;
    y += dy;
    points.push({ x, y });
  }

  // Check if closed
  const first = points[0];
  const last = points[points.length - 1];
  const dist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
  const maxLen = Math.max(...segments.map(s => s.length), 1);
  const isClosed = dist < maxLen * 0.05; // Within 5% of max segment length

  // Build SVG path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }
  if (isClosed) {
    pathD += ' Z';
  }

  // Calculate bounds with padding (proportional to shape span, not segment length)
  const allX = points.map(p => p.x);
  const allY = points.map(p => p.y);
  const boundsW = Math.max(...allX) - Math.min(...allX);
  const boundsH = Math.max(...allY) - Math.min(...allY);
  const padding = Math.max(boundsW, boundsH, 1) * 0.12;
  const bounds = {
    minX: Math.min(...allX) - padding,
    minY: Math.min(...allY) - padding,
    maxX: Math.max(...allX) + padding,
    maxY: Math.max(...allY) + padding,
  };

  return { pathD, points, bounds, segmentMidpoints, isClosed };
}

/** Generate a viewBox string from bounds */
export function boundsToViewBox(bounds: ShapeRenderData['bounds']): string {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return `${bounds.minX} ${bounds.minY} ${width} ${height}`;
}
