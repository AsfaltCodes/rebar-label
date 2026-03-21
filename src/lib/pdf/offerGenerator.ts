import { jsPDF } from 'jspdf';
import type { Job, Label, FieldDef, AppSettings } from '$lib/db/types';
import { renderSegments } from '$lib/shapes/renderer';

// Portrait A4: 209×295.275mm, 10mm margins
const PAGE_W = 209;
const PAGE_H = 295.275;
const MARGIN_L = 10;
const MARGIN_R = 10;
const MARGIN_T = 10;
const MARGIN_B = 10;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R; // 190mm

const HEADER_H = 12;
const TITLE_H = 12;
const COL_HEADER_H = 8;
const DATA_ROW_H = 20; // rows with shape drawings
const SUMMARY_ROW_H = 7;

const HEADER_BG: [number, number, number] = [217, 225, 242]; // light blue
const SUBTOTAL_BG: [number, number, number] = [242, 242, 242]; // light gray

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

type LabelData = {
  label: Label;
  merged: Record<string, string>;
  diamValue: number;
  totalLength: number;
  copies: number;
  rowKg: number;
};

export async function exportOfferPdf(
  job: Job,
  labels: Label[],
  settings: AppSettings,
  logoDataUrl: string | null
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const allFields = job.fields || [];
  const diamField = allFields.find(f => f.source === 'diameter');
  const lengthField = allFields.find(f => f.source === 'total_length');
  const bucField = allFields.find(f => f.source === 'buc');
  const manualFields = allFields.filter(f => !f.source || f.source === 'manual');

  // Build column definitions
  const cols: ColDef[] = [
    { header: 'Nr.', key: 'nr', width: 10 },
    { header: 'Forma', key: 'shape', width: 40 },
  ];

  for (const f of manualFields) {
    cols.push({
      header: f.label,
      key: `manual_${f.label}`,
      width: 20,
      fieldLabel: f.label,
    });
  }

  const colDiamIdx = cols.length;
  cols.push({ header: diamField?.label || 'Ø', key: 'diam', width: 14 });
  const colLengthIdx = cols.length;
  cols.push({ header: lengthField?.label || 'L', key: 'length', width: 22 });
  const colBucIdx = cols.length;
  cols.push({ header: bucField?.label || 'Buc.', key: 'buc', width: 14 });
  const colKgIdx = cols.length;
  cols.push({ header: 'Kg', key: 'kg', width: 18 });

  // Distribute remaining width to Forma column
  const usedWidth = cols.reduce((s, c) => s + c.width, 0);
  if (usedWidth < CONTENT_W) {
    cols[1].width += CONTENT_W - usedWidth; // give extra to Forma
  } else if (usedWidth > CONTENT_W) {
    // Scale down proportionally
    const scale = CONTENT_W / usedWidth;
    for (const c of cols) c.width *= scale;
  }

  // Compute column X positions
  const colX: number[] = [];
  let cx = MARGIN_L;
  for (const c of cols) {
    colX.push(cx);
    cx += c.width;
  }

  // Pre-compute label data and group by diameter
  const sortedLabels = [...labels].sort((a, b) => a.sort_order - b.sort_order);
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

  // Group by diameter
  const groups = new Map<number, LabelData[]>();
  for (const ld of labelDataList) {
    if (!groups.has(ld.diamValue)) groups.set(ld.diamValue, []);
    groups.get(ld.diamValue)!.push(ld);
  }
  const sortedDiams = [...groups.keys()].sort((a, b) => a - b);

  let currentY = MARGIN_T;
  let pageNum = 0;
  let nrCrt = 0;
  let grandTotalKg = 0;

  function startNewPage(isFirst: boolean) {
    if (!isFirst) doc.addPage();
    pageNum++;
    currentY = MARGIN_T;
    drawHeader();
    drawTitle();
    drawColumnHeaders();
  }

  function drawHeader() {
    // Logo (left) + phone (right)
    if (logoDataUrl && logoDataUrl.startsWith('data:image')) {
      try {
        doc.addImage(logoDataUrl, 'PNG', MARGIN_L, currentY, 25, 10);
      } catch { /* skip logo on error */ }
    }
    if (settings.company_phone) {
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(settings.company_phone, PAGE_W - MARGIN_R, currentY + 6, { align: 'right' });
    }
    currentY += HEADER_H;
  }

  function drawTitle() {
    doc.setFontSize(16);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`OFERTA: ${job.client_name || ''}`, PAGE_W / 2, currentY + 8, { align: 'center' });
    currentY += TITLE_H;
  }

  function drawColumnHeaders() {
    // Background
    doc.setFillColor(...HEADER_BG);
    doc.rect(MARGIN_L, currentY, CONTENT_W, COL_HEADER_H, 'F');

    // Borders and text
    doc.setDrawColor(150);
    doc.setLineWidth(0.3);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0);

    for (let i = 0; i < cols.length; i++) {
      doc.rect(colX[i], currentY, cols[i].width, COL_HEADER_H);
      doc.text(cols[i].header, colX[i] + cols[i].width / 2, currentY + COL_HEADER_H / 2, {
        align: 'center',
        baseline: 'middle',
      });
    }
    currentY += COL_HEADER_H;
  }

  function needsNewPage(rowH: number): boolean {
    return currentY + rowH > PAGE_H - MARGIN_B;
  }

  function drawDataRow(ld: LabelData) {
    if (needsNewPage(DATA_ROW_H)) {
      startNewPage(false);
    }

    nrCrt++;
    const rowY = currentY;

    // Draw cell borders
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    for (let i = 0; i < cols.length; i++) {
      doc.rect(colX[i], rowY, cols[i].width, DATA_ROW_H);
    }

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(0);

    // Nr.Crt.
    doc.text(String(nrCrt), colX[0] + cols[0].width / 2, rowY + DATA_ROW_H / 2, {
      align: 'center', baseline: 'middle',
    });

    // Forma — vector shape drawing
    drawShape(doc, ld.label, colX[1] + 1, rowY + 1, cols[1].width - 2, DATA_ROW_H - 2);

    // Manual fields
    for (let mi = 0; mi < manualFields.length; mi++) {
      const ci = 2 + mi;
      const val = ld.merged[manualFields[mi].label] || '';
      doc.text(val, colX[ci] + cols[ci].width / 2, rowY + DATA_ROW_H / 2, {
        align: 'center', baseline: 'middle',
      });
    }

    // Ø
    doc.text(ld.diamValue ? String(ld.diamValue) : '', colX[colDiamIdx] + cols[colDiamIdx].width / 2, rowY + DATA_ROW_H / 2, {
      align: 'center', baseline: 'middle',
    });

    // L
    doc.text(ld.totalLength > 0 ? String(ld.totalLength) : '', colX[colLengthIdx] + cols[colLengthIdx].width / 2, rowY + DATA_ROW_H / 2, {
      align: 'center', baseline: 'middle',
    });

    // Buc.
    doc.text(String(ld.copies), colX[colBucIdx] + cols[colBucIdx].width / 2, rowY + DATA_ROW_H / 2, {
      align: 'center', baseline: 'middle',
    });

    // Kg
    doc.text((Math.round(ld.rowKg * 100) / 100).toFixed(2), colX[colKgIdx] + cols[colKgIdx].width / 2, rowY + DATA_ROW_H / 2, {
      align: 'center', baseline: 'middle',
    });

    currentY += DATA_ROW_H;
  }

  function drawSubtotalRow(diam: number, groupKg: number) {
    if (needsNewPage(SUMMARY_ROW_H)) {
      startNewPage(false);
    }

    const rowY = currentY;

    // Merged cells background
    const mergeW = colX[colKgIdx] - MARGIN_L;
    doc.setFillColor(...SUBTOTAL_BG);
    doc.rect(MARGIN_L, rowY, mergeW, SUMMARY_ROW_H, 'F');
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN_L, rowY, mergeW, SUMMARY_ROW_H);

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`Subtotal Ø${diam}              `, colX[colKgIdx] - 2, rowY + SUMMARY_ROW_H /2 , {
      align: 'right', baseline: 'middle',
    });

    // Kg cell
    doc.setFillColor(...SUBTOTAL_BG);
    doc.rect(colX[colKgIdx], rowY, cols[colKgIdx].width, SUMMARY_ROW_H, 'F');
    doc.rect(colX[colKgIdx], rowY, cols[colKgIdx].width, SUMMARY_ROW_H);
    doc.text((Math.round(groupKg * 100) / 100).toFixed(2), colX[colKgIdx] + cols[colKgIdx].width / 2, rowY + SUMMARY_ROW_H / 2, {
      align: 'center', baseline: 'middle',
    });

    currentY += SUMMARY_ROW_H;
  }

  function drawGrandTotalRow(totalKg: number) {
    if (needsNewPage(SUMMARY_ROW_H + 2)) {
      startNewPage(false);
    }

    const rowY = currentY;
    const rowH = SUMMARY_ROW_H + 2;

    const mergeW = colX[colKgIdx] - MARGIN_L;
    doc.setFillColor(...HEADER_BG);
    doc.rect(MARGIN_L, rowY, mergeW, rowH, 'F');
    doc.setDrawColor(150);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN_L, rowY, mergeW, rowH);

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('TOTAL', colX[colKgIdx] - 2, rowY + rowH / 2, {
      align: 'right', baseline: 'middle',
    });

    doc.setFillColor(...HEADER_BG);
    doc.rect(colX[colKgIdx], rowY, cols[colKgIdx].width, rowH, 'F');
    doc.rect(colX[colKgIdx], rowY, cols[colKgIdx].width, rowH);
    doc.text((Math.round(totalKg * 100) / 100).toFixed(2), colX[colKgIdx] + cols[colKgIdx].width / 2, rowY + rowH / 2, {
      align: 'center', baseline: 'middle',
    });

    currentY += rowH;
  }

  // ── Render pages ──
  startNewPage(true);

  for (const diam of sortedDiams) {
    const group = groups.get(diam)!;
    let groupKg = 0;

    for (const ld of group) {
      drawDataRow(ld);
      groupKg += ld.rowKg;
    }

    if (sortedDiams.length > 1) {
      drawSubtotalRow(diam, groupKg);
    }

    grandTotalKg += groupKg;
  }

  drawGrandTotalRow(grandTotalKg);

  // ── Export ──
  const filename = `Oferta_${(job.client_name || job.name || 'export').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  try {
    if ('__TAURI__' in window) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const { open } = await import('@tauri-apps/plugin-shell');

      const path = await save({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: filename,
      });

      if (path) {
        const pdfOutput = doc.output('arraybuffer');
        const bytes = new Uint8Array(pdfOutput);
        await writeFile(path, bytes);
        await open(path);
      }
      return;
    }
  } catch (e) {
    console.warn('Tauri save failed, falling back to browser download:', e);
  }

  doc.save(filename);
}

/**
 * Draw a vector rebar shape inside a bounding box using jsPDF line drawing.
 */
function drawShape(
  doc: jsPDF,
  label: Label,
  x: number, y: number, w: number, h: number
) {
  if (!label.shape_segments || label.shape_segments.length === 0) return;

  const renderData = renderSegments(label.shape_segments);
  if (!renderData.pathD || renderData.points.length < 2) return;

  const boundsW = renderData.bounds.maxX - renderData.bounds.minX;
  const boundsH = renderData.bounds.maxY - renderData.bounds.minY;
  if (boundsW <= 0 || boundsH <= 0) return;

  const scaleX = w / boundsW;
  const scaleY = h / boundsH;
  const sc = Math.min(scaleX, scaleY) * 0.85; // 85% to leave room for labels

  const offsetX = x + (w - boundsW * sc) / 2 - renderData.bounds.minX * sc;
  const offsetY = y + (h - boundsH * sc) / 2 - renderData.bounds.minY * sc;

  // Draw shape lines
  doc.setDrawColor(50);
  doc.setLineWidth(0.4);
  for (let i = 0; i < renderData.points.length - 1; i++) {
    const p1 = renderData.points[i];
    const p2 = renderData.points[i + 1];
    doc.line(
      offsetX + p1.x * sc,
      offsetY + p1.y * sc,
      offsetX + p2.x * sc,
      offsetY + p2.y * sc
    );
  }
  if (renderData.isClosed && renderData.points.length > 2) {
    const first = renderData.points[0];
    const last = renderData.points[renderData.points.length - 1];
    doc.line(
      offsetX + last.x * sc,
      offsetY + last.y * sc,
      offsetX + first.x * sc,
      offsetY + first.y * sc
    );
  }

  // Dimension labels
  doc.setFontSize(6);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(0);
  for (const mp of renderData.segmentMidpoints) {
    if (mp.length <= 0) continue;
    doc.text(
      String(mp.length),
      offsetX + mp.labelX * sc,
      offsetY + mp.labelY * sc,
      { align: 'center', baseline: 'middle' }
    );
  }
  doc.setFont('Helvetica', 'normal');
}
