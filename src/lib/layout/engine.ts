export interface LabelPosition {
  x: number;       // mm from left edge of page
  y: number;       // mm from top edge of page
  page: number;    // 0-indexed page number
  labelIndex: number; // which label this is a copy of
  copyIndex: number;  // which copy of that label
}

export interface PageLayout {
  columns: number;
  rows: number;
  labelsPerPage: number;
  positions: LabelPosition[];
  totalPages: number;
}

export function calculateLayout(
  pageWidth: number,
  pageHeight: number,
  marginTop: number,
  marginBottom: number,
  marginLeft: number,
  marginRight: number,
  labelWidth: number,
  labelHeight: number,
  gap: number,
  labels: { copies: number }[]
): PageLayout {
  const usableWidth = pageWidth - marginLeft - marginRight;
  const usableHeight = pageHeight - marginTop - marginBottom;

  const columns = Math.max(1, Math.floor((usableWidth + gap) / (labelWidth + gap)));
  const rows = Math.max(1, Math.floor((usableHeight + gap) / (labelHeight + gap)));
  const labelsPerPage = columns * rows;

  const positions: LabelPosition[] = [];
  let slot = 0;

  for (let labelIndex = 0; labelIndex < labels.length; labelIndex++) {
    const label = labels[labelIndex];
    for (let copyIndex = 0; copyIndex < label.copies; copyIndex++) {
      const page = Math.floor(slot / labelsPerPage);
      const posOnPage = slot % labelsPerPage;
      const col = posOnPage % columns;
      const row = Math.floor(posOnPage / columns);

      positions.push({
        x: marginLeft + col * (labelWidth + gap),
        y: marginTop + row * (labelHeight + gap),
        page,
        labelIndex,
        copyIndex,
      });
      slot++;
    }
  }

  const totalPages = slot > 0 ? Math.floor((slot - 1) / labelsPerPage) + 1 : 1;

  return { columns, rows, labelsPerPage, positions, totalPages };
}
