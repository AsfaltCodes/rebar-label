export interface LabelPosition {
  x: number;       // mm from left edge of page
  y: number;       // mm from top edge of page
  page: number;    // 0-indexed page number
  labelIndex: number; // which label this is a copy of
  copyIndex: number;  // which copy of that label
  globalIndex: number; // 0-based sequential counter across all copies in the job
}

export interface PageLayout {
  columns: number;
  rows: number;
  labelsPerPage: number;
  positions: LabelPosition[];
  totalPages: number;
}

function fitCount(available: number, size: number, gap: number): number {
  const raw = (available + gap) / (size + gap);
  const rounded = Math.round(raw);
  const remainder = (rounded * (size + gap) - gap) - available;
  if (rounded > 0 && remainder <= 0.1) return rounded;
  return Math.max(1, Math.floor(raw));
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

  const columns = fitCount(usableWidth, labelWidth, gap);
  const rows = fitCount(usableHeight, labelHeight, gap);
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
        globalIndex: slot,
      });
      slot++;
    }
  }

  const totalPages = slot > 0 ? Math.floor((slot - 1) / labelsPerPage) + 1 : 1;

  return { columns, rows, labelsPerPage, positions, totalPages };
}
