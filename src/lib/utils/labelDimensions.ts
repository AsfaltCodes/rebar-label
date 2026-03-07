/**
 * Calculate label dimensions from a grid layout (columns × rows).
 * Divides the usable page area evenly, accounting for margins and gaps.
 */
export function calculateLabelDimensions(
  pageW: number, pageH: number,
  marginT: number, marginB: number, marginL: number, marginR: number,
  gap: number, columns: number, rows: number
): { width: number; height: number } {
  const usableW = pageW - marginL - marginR;
  const usableH = pageH - marginT - marginB;
  return {
    width: (usableW - (columns - 1) * gap) / columns,
    height: (usableH - (rows - 1) * gap) / rows,
  };
}
