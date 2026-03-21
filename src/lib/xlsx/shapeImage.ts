import type { Segment } from '$lib/shapes/presets';
import { renderSegments, boundsToViewBox } from '$lib/shapes/renderer';

/**
 * Renders a rebar shape as a PNG base64 string for embedding in XLSX.
 * Uses offscreen SVG → Canvas → PNG pipeline.
 */
export async function renderShapeToPng(
  segments: Segment[],
  width: number = 200,
  height: number = 150
): Promise<string | null> {
  if (!segments || segments.length === 0) return null;

  const renderData = renderSegments(segments);
  if (!renderData.pathD) return null;

  const boundsW = renderData.bounds.maxX - renderData.bounds.minX;
  const boundsH = renderData.bounds.maxY - renderData.bounds.minY;
  if (boundsW <= 0 || boundsH <= 0) return null;

  // Add 10% padding so dimension labels near edges aren't clipped
  const padX = boundsW * 0.1;
  const padY = boundsH * 0.1;
  const paddedBounds = {
    minX: renderData.bounds.minX - padX,
    minY: renderData.bounds.minY - padY,
    maxX: renderData.bounds.maxX + padX,
    maxY: renderData.bounds.maxY + padY,
  };
  const viewBox = boundsToViewBox(paddedBounds);

  const strokeW = Math.max(2, Math.max(boundsW, boundsH) * 0.025);
  const fontSize = renderData.shapeDim * 0.22;

  // Build dimension labels
  const labelsMarkup = renderData.segmentMidpoints
    .filter(mp => mp.length > 0)
    .map(mp =>
      `<text x="${mp.labelX}" y="${mp.labelY}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="#111" font-weight="700" font-family="Arial, sans-serif">${mp.length}</text>`
    )
    .join('\n    ');

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">
    <path d="${renderData.pathD}" fill="none" stroke="#333" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round"/>
    ${labelsMarkup}
  </svg>`;

  return new Promise<string | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/png');
      // Strip prefix for ExcelJS
      resolve(dataUrl.replace(/^data:image\/png;base64,/, ''));
    };
    img.onerror = () => resolve(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  });
}
