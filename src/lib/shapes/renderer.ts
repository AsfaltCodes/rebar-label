import type { Segment } from './presets';

export interface Point {
  x: number;
  y: number;
}

export interface ShapeRenderData {
  pathD: string;           // SVG path d attribute
  points: Point[];         // All vertices
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  segmentMidpoints: { x: number; y: number; length: number; angle: number; labelX: number; labelY: number }[];
  isClosed: boolean;
  shapeDim: number; // max(width, height) of shape geometry without padding
}

// Helper: compute Y displacement with engineering convention (positive angle = counterclockwise = UP on screen)
function sinY(rad: number): number {
  return -Math.sin(rad);
}

/** Check if an angle is approximately aligned to 0°/90°/180°/270° */
function isOrthogonal(angle: number): boolean {
  const n = ((angle % 360) + 360) % 360;
  return (n % 90) < 2 || (n % 90) > 88;
}

export function renderSegments(segments: Segment[]): ShapeRenderData {
  if (segments.length === 0) {
    return {
      pathD: '',
      points: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      segmentMidpoints: [],
      isClosed: false,
      shapeDim: 0,
    };
  }

  // Normalize extreme proportions: when longest/shortest > 5, clamp short segments
  // so they remain visible, but keep original lengths for dimension labels
  const originalLengths = segments.map(s => s.length);
  const posLengths = segments.map(s => s.length).filter(l => l > 0);
  let geoSegments = segments;
  if (posLengths.length >= 2) {
    const maxL = Math.max(...posLengths);
    const minL = Math.min(...posLengths);
    if (maxL / minL > 5) {
      geoSegments = segments.map(s => ({
        ...s,
        length: s.length > 0 ? Math.max(s.length, maxL * 0.2) : 0,
      }));
    }
  }

  const points: Point[] = [{ x: 0, y: 0 }];
  const segmentMidpoints: ShapeRenderData['segmentMidpoints'] = [];
  let currentAngle = 0; // degrees, 0 = rightward (CNC feed direction). Positive = CCW.
  let x = 0;
  let y = 0;

  for (let i = 0; i < geoSegments.length; i++) {
    const seg = geoSegments[i];
    // CNC convention: draw segment at current direction, THEN apply bend
    const rad = (currentAngle * Math.PI) / 180;
    const dx = Math.cos(rad) * seg.length;
    const dy = sinY(rad) * seg.length;

    const midX = x + dx / 2;
    const midY = y + dy / 2;
    segmentMidpoints.push({
      x: midX,
      y: midY,
      length: originalLengths[i],
      angle: currentAngle,
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

  // Auto-rotate so the longest segment is horizontal
  let longestIdx = 0;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].length > segments[longestIdx].length) longestIdx = i;
  }
  const rotateAngle = -segmentMidpoints[longestIdx].angle;

  if (rotateAngle !== 0) {
    const rotRad = (rotateAngle * Math.PI) / 180;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);
    for (const p of points) {
      const rx = p.x * cosR - p.y * sinR;
      const ry = p.x * sinR + p.y * cosR;
      p.x = rx;
      p.y = ry;
    }
    for (const mp of segmentMidpoints) {
      const rx = mp.x * cosR - mp.y * sinR;
      const ry = mp.x * sinR + mp.y * cosR;
      mp.x = rx;
      mp.y = ry;
      mp.angle -= rotateAngle;
    }
  }

  // For open shapes: flip 180° if upside-down (endpoints below interior)
  if (!isClosed && points.length > 2) {
    const endAvgY = (points[0].y + points[points.length - 1].y) / 2;
    const interior = points.slice(1, -1);
    const intAvgY = interior.reduce((s, p) => s + p.y, 0) / interior.length;
    if (endAvgY > intAvgY + 1) {
      for (const p of points) { p.x = -p.x; p.y = -p.y; }
      for (const mp of segmentMidpoints) {
        mp.x = -mp.x; mp.y = -mp.y;
        mp.angle += 180;
      }
    }
  }

  // Build SVG path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }
  if (isClosed) {
    pathD += ' Z';
  }

  // Calculate bounds
  const allX = points.map(p => p.x);
  const allY = points.map(p => p.y);
  const boundsW = Math.max(...allX) - Math.min(...allX);
  const boundsH = Math.max(...allY) - Math.min(...allY);
  const padding = Math.max(boundsW, boundsH, 1) * 0.45;
  const bounds = {
    minX: Math.min(...allX) - padding,
    minY: Math.min(...allY) - padding,
    maxX: Math.max(...allX) + padding,
    maxY: Math.max(...allY) + padding,
  };

  // --- Label placement ---
  const maxDim = Math.max(boundsW, boundsH, 1);
  const offsetD = maxDim * 0.22;

  // For closed shapes: skip duplicate hook label (last seg same length as first)
  const lastIdx = segmentMidpoints.length - 1;
  const skipLast = isClosed && lastIdx > 0
    && segments[lastIdx].length === segments[0].length
    && segments[lastIdx].length < maxDim * 0.5;

  if (isClosed) {
    // Signed area (shoelace) to determine polygon winding
    let signedArea2 = 0;
    for (let i = 0; i < points.length - 1; i++) {
      signedArea2 += points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
    }
    // Screen coords (Y-down): negative = CW winding → outward = right of travel (angle - 90°)
    //                          positive = CCW winding → outward = left of travel (angle + 90°)
    const outwardAngleOffset = signedArea2 < 0 ? -90 : 90;

    for (let i = 0; i < segmentMidpoints.length; i++) {
      const mp = segmentMidpoints[i];
      if (i === lastIdx && skipLast) {
        mp.labelX = mp.x; mp.labelY = mp.y; mp.length = 0; continue;
      }

      // Non-orthogonal segments: label at endpoint, parallel to line
      if (!isOrthogonal(mp.angle)) {
        const segRad = mp.angle * Math.PI / 180;
        const endX = mp.x + Math.cos(segRad) * (mp.length / 2);
        const endY = mp.y + sinY(segRad) * (mp.length / 2);
        mp.labelX = endX + Math.cos(segRad) * offsetD;
        mp.labelY = endY + sinY(segRad) * offsetD;
        continue;
      }

      const outRad = (mp.angle + outwardAngleOffset) * Math.PI / 180;
      const outX = Math.cos(outRad);
      const outY = sinY(outRad);

      let anchorX = mp.x, anchorY = mp.y;
      if (mp.length < maxDim * 0.5 && segmentMidpoints.length > 1) {
        const segDir = mp.angle * Math.PI / 180;
        const shift = mp.length * 0.3;
        if (i === 0) { anchorX -= Math.cos(segDir) * shift; anchorY -= sinY(segDir) * shift; }
        else if (i === segmentMidpoints.length - 1) { anchorX += Math.cos(segDir) * shift; anchorY += sinY(segDir) * shift; }
      }
      mp.labelX = anchorX + outX * offsetD;
      mp.labelY = anchorY + outY * offsetD;
    }
  } else {
    // Open shapes: centroid-perpendicular (no hook bias issue)
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

    for (let i = 0; i < segmentMidpoints.length; i++) {
      const mp = segmentMidpoints[i];

      // Non-orthogonal segments: label at endpoint, parallel to line
      if (!isOrthogonal(mp.angle)) {
        const segRad = mp.angle * Math.PI / 180;
        const endX = mp.x + Math.cos(segRad) * (mp.length / 2);
        const endY = mp.y + sinY(segRad) * (mp.length / 2);
        mp.labelX = endX + Math.cos(segRad) * offsetD;
        mp.labelY = endY + sinY(segRad) * offsetD;
        continue;
      }

      const candA_rad = (mp.angle + 90) * Math.PI / 180;
      const candB_rad = (mp.angle - 90) * Math.PI / 180;
      const aX = Math.cos(candA_rad), aY = sinY(candA_rad);
      const bX = Math.cos(candB_rad), bY = sinY(candB_rad);
      const distA = (mp.x + aX - cx) ** 2 + (mp.y + aY - cy) ** 2;
      const distB = (mp.x + bX - cx) ** 2 + (mp.y + bY - cy) ** 2;
      const [outX, outY] = distA > distB ? [aX, aY] : [bX, bY];

      let anchorX = mp.x, anchorY = mp.y;
      if (mp.length < maxDim * 0.5 && segmentMidpoints.length > 1) {
        const segDir = mp.angle * Math.PI / 180;
        const shift = mp.length * 0.3;
        if (i === 0) { anchorX -= Math.cos(segDir) * shift; anchorY -= sinY(segDir) * shift; }
        else if (i === segmentMidpoints.length - 1) { anchorX += Math.cos(segDir) * shift; anchorY += sinY(segDir) * shift; }
      }
      mp.labelX = anchorX + outX * offsetD;
      mp.labelY = anchorY + outY * offsetD;
    }
  }

  return { pathD, points, bounds, segmentMidpoints, isClosed, shapeDim: maxDim };
}

/** Generate a viewBox string from bounds */
export function boundsToViewBox(bounds: ShapeRenderData['bounds']): string {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return `${bounds.minX} ${bounds.minY} ${width} ${height}`;
}
