import ExcelJS from 'exceljs';
import type { Job, Label, FieldDef, AppSettings } from '$lib/db/types';
import { renderShapeToPng } from './shapeImage';

const SHAPE_IMG_W = 400;
const SHAPE_IMG_H = 150;
const SHAPE_ROW_HEIGHT = 85;

/**
 * Merge field values for a label: job-scoped → label-scoped → computed.
 */
function mergeFieldValues(
  job: Job,
  label: Label,
  fields: FieldDef[]
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const f of fields) {
    if (f.scope === 'job') {
      merged[f.label] = job.job_field_values?.[f.label] || f.default_value || '';
    } else {
      merged[f.label] = label.field_values?.[f.label] || f.default_value || '';
    }
    if (f.source === 'total_length' && label.shape_segments?.length) {
      const total = label.shape_segments.reduce((s, seg) => s + seg.length, 0);
      merged[f.label] = String(total);
    } else if (f.source === 'client_name') {
      merged[f.label] = job.client_name || '';
    } else if (f.source === 'buc' && !label.field_values?.[f.label]) {
      merged[f.label] = String(label.copies || 1);
    }
  }
  return merged;
}

type ColDef = { header: string; key: string; width: number; fieldLabel?: string };

export async function exportOffer(
  job: Job,
  labels: Label[],
  settings: AppSettings,
  logoDataUrl: string | null
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Oferta');

  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    horizontalCentered: true,
  };

  const allFields = job.fields || [];
  const diamField = allFields.find(f => f.source === 'diameter');
  const lengthField = allFields.find(f => f.source === 'total_length');
  const bucField = allFields.find(f => f.source === 'buc');

  // Manual fields = no special source (manual or undefined)
  const manualFields = allFields.filter(f =>
    !f.source || f.source === 'manual'
  );

  // ── Build dynamic columns ──
  // Nr.Crt. | Forma | [manual fields...] | Ø | L | Buc. | Kg
  const cols: ColDef[] = [
    { header: 'Nr.Crt.', key: 'nr', width: 7 },
    { header: 'Forma', key: 'shape', width: 32 },
  ];

  // Insert manual fields
  for (const f of manualFields) {
    cols.push({
      header: f.label,
      key: `manual_${f.label}`,
      width: Math.max(8, f.label.length + 2),
      fieldLabel: f.label,
    });
  }

  // Special source columns
  const colDiam = cols.length + 1; // 1-indexed
  cols.push({ header: diamField?.label || 'Ø', key: 'diam', width: 8 });
  const colLength = cols.length + 1;
  cols.push({ header: lengthField?.label || 'L', key: 'length', width: 12 });
  const colBuc = cols.length + 1;
  cols.push({ header: bucField?.label || 'Buc.', key: 'buc', width: 8 });
  const colKg = cols.length + 1;
  cols.push({ header: 'Kg', key: 'kg', width: 10 });

  const totalCols = cols.length;
  const colShape = 2; // always column 2

  // Apply column widths
  for (let i = 0; i < cols.length; i++) {
    ws.getColumn(i + 1).width = cols[i].width;
  }

  const lastCol = colLetter(totalCols);

  // ── Row 1: Header (logo + phone) ──
  ws.mergeCells(`A1:${lastCol}1`);
  ws.getRow(1).height = 50;
  const headerCell = ws.getCell('A1');
  headerCell.alignment = { vertical: 'middle', horizontal: 'right' };

  if (logoDataUrl && logoDataUrl.startsWith('data:image')) {
    try {
      const logoId = workbook.addImage({
        base64: logoDataUrl.replace(/^data:image\/\w+;base64,/, ''),
        extension: 'png',
      });
      ws.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 120, height: 40 },
      });
    } catch {
      // Skip logo on error
    }
  }

  if (settings.company_phone) {
    headerCell.value = settings.company_phone;
    headerCell.font = { size: 11, bold: true };
  }

  // ── Row 2: Title ──
  ws.mergeCells(`A2:${lastCol}2`);
  const titleCell = ws.getCell('A2');
  titleCell.value = `OFERTA: ${job.client_name || ''}`;
  titleCell.font = { size: 18, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 40;

  // ── Row 3: Column headers ──
  for (let i = 0; i < cols.length; i++) {
    const cell = ws.getCell(3, i + 1);
    cell.value = cols[i].header;
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = allBorders();
  }

  // ── Pre-compute label data and group by diameter ──
  const sortedLabels = [...labels].sort((a, b) => a.sort_order - b.sort_order);
  const shapeImageCache = new Map<number, string | null>();

  type LabelData = {
    label: Label;
    merged: Record<string, string>;
    diamValue: number;
    totalLength: number;
    copies: number;
    rowKg: number;
  };

  const labelDataList: LabelData[] = [];
  const toMm = (job.length_unit === 'cm') ? 10 : 1;
  for (const label of sortedLabels) {
    const merged = mergeFieldValues(job, label, allFields);
    const diamValue = diamField ? parseFloat(merged[diamField.label] || '0') : 0;
    const totalLength = (label.shape_segments || []).reduce((s, seg) => s + seg.length, 0);

    let copies = Math.max(1, label.copies || 1);
    if (bucField && merged[bucField.label]) {
      copies = parseFloat(merged[bucField.label]) || copies;
    }

    let rowKg = 0;
    if (diamValue > 0 && totalLength > 0) {
      rowKg = (diamValue * diamValue / 162) * (totalLength * toMm / 1000) * copies;
    }
    labelDataList.push({ label, merged, diamValue, totalLength, copies, rowKg });
  }

  // Group by diameter (sorted numerically)
  const groups = new Map<number, LabelData[]>();
  for (const ld of labelDataList) {
    if (!groups.has(ld.diamValue)) groups.set(ld.diamValue, []);
    groups.get(ld.diamValue)!.push(ld);
  }
  const sortedDiams = [...groups.keys()].sort((a, b) => a - b);

  // ── Render data rows ──
  let currentRow = 4;
  let nrCrt = 0;
  let grandTotalKg = 0;

  for (const diam of sortedDiams) {
    const group = groups.get(diam)!;
    let groupKg = 0;

    for (const ld of group) {
      nrCrt++;

      // Render shape image (cache)
      if (!shapeImageCache.has(ld.label.id)) {
        const png = await renderShapeToPng(ld.label.shape_segments || [], SHAPE_IMG_W, SHAPE_IMG_H);
        shapeImageCache.set(ld.label.id, png);
      }
      const shapePng = shapeImageCache.get(ld.label.id) || null;

      const row = ws.getRow(currentRow);
      row.height = shapePng ? SHAPE_ROW_HEIGHT : 25;

      // Nr.Crt.
      setCell(ws, currentRow, 1, nrCrt, { horizontal: 'center' });

      // Shape image
      const shapeCell = ws.getCell(currentRow, colShape);
      shapeCell.border = allBorders();
      shapeCell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (shapePng) {
        const imgId = workbook.addImage({ base64: shapePng, extension: 'png' });
        ws.addImage(imgId, {
          tl: { col: colShape - 1, row: currentRow - 1 } as any,
          br: { col: colShape, row: currentRow } as any,
          editAs: 'twoCell'
        });
      }

      // Manual fields
      for (let mi = 0; mi < manualFields.length; mi++) {
        const colIdx = 3 + mi; // 1-indexed, after Nr.Crt.(1) and Forma(2)
        const val = ld.merged[manualFields[mi].label] || '';
        setCell(ws, currentRow, colIdx, val, { horizontal: 'center' });
      }

      // Ø
      setCell(ws, currentRow, colDiam, ld.diamValue || '', { horizontal: 'center' });

      // L (mm)
      setCell(ws, currentRow, colLength, ld.totalLength > 0 ? ld.totalLength : '', { horizontal: 'center' });

      // Buc.
      setCell(ws, currentRow, colBuc, ld.copies, { horizontal: 'center' });

      // Kg
      const kgCell = ws.getCell(currentRow, colKg);
      kgCell.value = Math.round(ld.rowKg * 100) / 100;
      kgCell.alignment = { vertical: 'middle', horizontal: 'center' };
      kgCell.numFmt = '0.00';
      kgCell.border = allBorders();

      groupKg += ld.rowKg;
      currentRow++;
    }

    // ── Subtotal row (only if multiple diameter groups) ──
    if (sortedDiams.length > 1) {
      ws.getRow(currentRow).height = 25;

      // Merge A through Buc. column
      ws.mergeCells(currentRow, 1, currentRow, colBuc);
      const subCell = ws.getCell(currentRow, 1);
      subCell.value = `Subtotal Ø${diam}`;
      subCell.font = { bold: true, size: 11 };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      subCell.alignment = { vertical: 'middle', horizontal: 'right' };
      subCell.border = allBorders();

      for (let c = 2; c <= colBuc; c++) {
        ws.getCell(currentRow, c).border = allBorders();
      }

      const subKgCell = ws.getCell(currentRow, colKg);
      subKgCell.value = Math.round(groupKg * 100) / 100;
      subKgCell.font = { bold: true, size: 11 };
      subKgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      subKgCell.alignment = { vertical: 'middle', horizontal: 'center' };
      subKgCell.numFmt = '0.00';
      subKgCell.border = allBorders();

      currentRow++;
    }

    grandTotalKg += groupKg;
  }

  // ── Grand total row ──
  ws.getRow(currentRow).height = 30;

  ws.mergeCells(currentRow, 1, currentRow, colBuc);
  const gtCell = ws.getCell(currentRow, 1);
  gtCell.value = 'TOTAL';
  gtCell.font = { bold: true, size: 13 };
  gtCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  gtCell.alignment = { vertical: 'middle', horizontal: 'right' };
  gtCell.border = allBorders();

  for (let c = 2; c <= colBuc; c++) {
    ws.getCell(currentRow, c).border = allBorders();
  }

  const gtKgCell = ws.getCell(currentRow, colKg);
  gtKgCell.value = Math.round(grandTotalKg * 100) / 100;
  gtKgCell.font = { bold: true, size: 13 };
  gtKgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  gtKgCell.alignment = { vertical: 'middle', horizontal: 'center' };
  gtKgCell.numFmt = '0.00';
  gtKgCell.border = allBorders();

  // ── Export ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `Oferta_${(job.client_name || job.name || 'export').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

  try {
    if ('__TAURI__' in window) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const { open } = await import('@tauri-apps/plugin-shell');

      const path = await save({
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: filename,
      });

      if (path) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await writeFile(path, bytes);
        await open(path);
      }
      return;
    }
  } catch (e) {
    console.warn('Tauri save failed, falling back to browser download:', e);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Helper to set a cell with value, alignment, and borders */
function setCell(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string | number,
  align: Partial<ExcelJS.Alignment> = {}
) {
  const cell = ws.getCell(row, col);
  cell.value = typeof value === 'number' ? value : value;
  cell.alignment = { vertical: 'middle', ...align };
  cell.border = allBorders();
}

/** Convert 1-based column index to Excel letter */
function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

/** Standard thin border on all sides */
function allBorders(): Partial<ExcelJS.Borders> {
  const thin: Partial<ExcelJS.Border> = { style: 'thin' };
  return { top: thin, bottom: thin, left: thin, right: thin };
}
