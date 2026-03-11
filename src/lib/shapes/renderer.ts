import type { Segment } from './presets';

export interface Point {
  x: number;
  y: number;
}

export interface ShapeRenderData {
  pathD: string;           // SVG path d attribute
  points: Point[];         // All vertices
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  segmentMidpoints: { x: number; y: number; length: number; angle: number; labelOffsetAngle: number; labelX: number; labelY: number }[];
  isClosed: boolean;
}

// Helper: compute Y displacement with engineering convention (positive angle = counterclockwise = UP on screen)
function sinY(rad: number): number {
  return -Math.sin(rad);
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
  let currentAngle = 0; // degrees, 0 = rightward (CNC feed direction). Positive = CCW, negative = CW.
  let x = 0;
  let y = 0;

  // If shape generally turns left (totalBend > 0), the outside is on the right (-90).
  const totalBend = segments.reduce((sum, s) => sum + s.angle, 0);
  const defaultOffsetSign = totalBend >= 0 ? -90 : 90;

  for (const seg of segments) {
    // CNC convention: draw segment at current direction, THEN apply bend
    const rad = (currentAngle * Math.PI) / 180;
    const dx = Math.cos(rad) * seg.length;
    const dy = sinY(rad) * seg.length;

    const midX = x + dx / 2;
    const midY = y + dy / 2;
    segmentMidpoints.push({
      x: midX,
      y: midY,
      length: seg.length,
      angle: currentAngle,
      labelOffsetAngle: currentAngle + defaultOffsetSign,
      labelX: 0,
      labelY: 0
    });

    x += dx;
    y += dy;
    points.push({ x, y });
    currentAngle += seg.angle; // Bend AFTER draw
  }

  // Check if closed
  const first = points[0];
  const last = points[points.length - 1];
  const dist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
  const maxLen = Math.max(...segments.map(s => s.length), 1);
  const isClosed = dist < maxLen * 0.05;

  // Build SVG path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }
  if (isClosed) {
    pathD += ' Z';
  }

  // Calculate bounds with padding
  const allX = points.map(p => p.x);
  const allY = points.map(p => p.y);
  const boundsW = Math.max(...allX) - Math.min(...allX);
  const boundsH = Math.max(...allY) - Math.min(...allY);
  const padding = Math.max(boundsW, boundsH, 1) * 0.25;
  const bounds = {
    minX: Math.min(...allX) - padding,
    minY: Math.min(...allY) - padding,
    maxX: Math.max(...allX) + padding,
    maxY: Math.max(...allY) + padding,
  };

  // Calculate final label positions
  const maxDim = Math.max(boundsW, boundsH, 1);
  const baseOffsetD = maxDim * 0.12;

  for (let i = 0; i < segmentMidpoints.length; i++) {
    const mp = segmentMidpoints[i];
    const isFirst = i === 0;
    const isLast = i === segmentMidpoints.length - 1;
    const isShort = mp.length <= maxDim * 0.3;

    let offsetD = Math.min(baseOffsetD, mp.length * 0.5);
    const labelAngleRad = (mp.labelOffsetAngle * Math.PI) / 180;

    let anchorX = mp.x;
    let anchorY = mp.y;

    if (isShort && segments.length > 1) {
      if (isFirst) {
        if (Math.abs(segments[0].angle) >= 90) {
           anchorX += Math.cos((mp.angle + 180) * Math.PI / 180) * mp.length * 0.5;
           anchorY += sinY((mp.angle + 180) * Math.PI / 180) * mp.length * 0.5;
        }
      } else if (isLast && i > 0) {
        if (Math.abs(segments[i - 1].angle) >= 90) {
           anchorX += Math.cos(mp.angle * Math.PI / 180) * mp.length * 0.5;
           anchorY += sinY(mp.angle * Math.PI / 180) * mp.length * 0.5;
        }
      }
    }

    mp.labelX = anchorX + Math.cos(labelAngleRad) * offsetD;
    mp.labelY = anchorY + sinY(labelAngleRad) * offsetD;
  }

  return { pathD, points, bounds, segmentMidpoints, isClosed };
}

/** Generate a viewBox string from bounds */
export function boundsToViewBox(bounds: ShapeRenderData['bounds']): string {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return `${bounds.minX} ${bounds.minY} ${width} ${height}`;
}
