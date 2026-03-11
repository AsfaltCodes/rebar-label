import { jsPDF } from 'jspdf';
import type { Job, Label, FieldDef, AppSettings } from '$lib/db/types';
import { calculateLayout } from '$lib/layout/engine';
import { calculateLabelDimensions } from '$lib/utils/labelDimensions';
import { renderSegments } from '$lib/shapes/renderer';

export function generatePdf(
  job: Job,
  labels: Label[],
  settings: AppSettings,
  logoDataUrl: string | null
): jsPDF {
  const pageW = job.page_width_mm;
  const pageH = job.page_height_mm;

  // Grid mode: derive label dimensions from columns × rows
  let labelW: number, labelH: number;
  if (job.sizing_mode === 'grid') {
    const dims = calculateLabelDimensions(
      pageW, pageH,
      job.margin_top_mm || 0, job.margin_bottom_mm || 0,
      job.margin_left_mm || 0, job.margin_right_mm || 0,
      job.label_gap_mm || 0, job.columns, job.rows
    );
    labelW = dims.width;
    labelH = dims.height;
  } else {
    labelW = job.label_width_mm;
    labelH = job.label_height_mm;
  }

  const layout = calculateLayout(
    pageW, pageH,
    job.margin_top_mm || 0, job.margin_bottom_mm || 0,
    job.margin_left_mm || 0, job.margin_right_mm || 0,
    labelW, labelH,
    job.label_gap_mm || 0,
    labels.map(l => ({ copies: l.copies }))
  );

  const orientation = pageW > pageH ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageW, pageH],
  });

  // Font setup - use Helvetica (built-in) for reliability
  doc.setFont('Helvetica');

  for (let page = 0; page < layout.totalPages; page++) {
    if (page > 0) {
      doc.addPage([pageW, pageH], orientation);
    }

    const pagePositions = layout.positions.filter(p => p.page === page);

    for (const pos of pagePositions) {
      const label = labels[pos.labelIndex];
      if (!label) continue;

      drawLabel(doc, pos.x, pos.y, labelW, labelH, label, job.fields, job.job_field_values || {}, job.logo_enabled, logoDataUrl, job.phone_enabled, settings.company_phone, pos.globalIndex + 1, job.client_name);
    }

    // Fill remaining slots on this page with blank labels
    const filledSlots = pagePositions.length;
    for (let slot = filledSlots; slot < layout.labelsPerPage; slot++) {
      const col = slot % layout.columns;
      const row = Math.floor(slot / layout.columns);
      const blankX = (job.margin_left_mm || 0) + col * (labelW + (job.label_gap_mm || 0));
      const blankY = (job.margin_top_mm || 0) + row * (labelH + (job.label_gap_mm || 0));
      drawBlankLabel(doc, blankX, blankY, labelW, labelH, job.fields, job.logo_enabled, logoDataUrl, job.phone_enabled, settings.company_phone);
    }
  }

  return doc;
}

function drawLabel(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: Label,
  fields: FieldDef[],
  jobFieldValues: Record<string, string>,
  logoEnabled: boolean,
  logoDataUrl: string | null,
  phoneEnabled: boolean = false,
  companyPhone: string = '',
  labelNumber?: number,
  clientName?: string
) {
  // Compute total length from shape segments
  const totalLength = label.shape_segments?.length
    ? label.shape_segments.reduce((sum: number, s: any) => sum + (s.length || 0), 0)
    : 0;

  // Build computed field values (auto-filled from shape data and job metadata)
  const computedValues: Record<string, string> = {};
  for (const f of fields) {
    if (f.source === 'total_length' && totalLength > 0) {
      computedValues[f.label] = `${totalLength} mm`;
    }
    if (f.source === 'client_name' && clientName) {
      computedValues[f.label] = clientName;
    }
  }

  // Merge job-scoped, label-scoped, and computed field values
  const mergedValues = { ...jobFieldValues, ...label.field_values, ...computedValues };
  // Border
  doc.setDrawColor(150);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);

  let currentY = y + 1.5;
  const leftPad = x + 1.5;
  const rightPad = x + w - 1.5;
  const innerW = w - 3;

  // Zone 1: Logo + Phone
  if (logoEnabled && logoDataUrl) {
    try {
      const logoH = h * 0.15;
      doc.addImage(logoDataUrl, 'PNG', x + w * 0.2, currentY, w * 0.6, logoH);
      currentY += logoH + 0.5;
    } catch (e) {
      // Skip logo if it fails
    }
  }

  // Phone number (below logo or at top if no logo)
  if (phoneEnabled && companyPhone) {
    doc.setFontSize(7);
    doc.setTextColor(0);
    doc.setFont('Helvetica', 'bold');
    doc.text(companyPhone, x + w / 2, currentY + 2, { align: 'center' });
    currentY += 3;
  }

  // Separator after logo/phone zone
  if ((logoEnabled && logoDataUrl) || (phoneEnabled && companyPhone)) {
    doc.setDrawColor(220);
    doc.line(x + 1, currentY, x + w - 1, currentY);
    currentY += 1;
  }

  // Zone 2: Fields — inline layout (bold label + underline + value on line)
  doc.setTextColor(0);
  const fieldFontSizeMap: Record<number, number> = { 1: 6, 2: 7, 3: 14 };
  const labelGap = 0.5; // gap between label text and underline

  type FieldRow = { type: 'full'; field: FieldDef } | { type: 'pair'; left: FieldDef; right: FieldDef };
  const fieldRows: FieldRow[] = [];
  let fi = 0;
  while (fi < fields.length) {
    const f = fields[fi];
    if (f.layout === 'half' && fi + 1 < fields.length && fields[fi + 1].layout === 'half') {
      fieldRows.push({ type: 'pair', left: f, right: fields[fi + 1] });
      fi += 2;
    } else {
      fieldRows.push({ type: 'full', field: f });
      fi++;
    }
  }

  function drawInlineField(field: FieldDef, val: string, startX: number, endX: number, drawY: number, fontSize: number) {
    doc.setFontSize(fontSize);

    // Bold label
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(field.label, startX, drawY);
    const labelW = doc.getTextWidth(field.label);
    const lineStartX = startX + labelW + labelGap;

    // Always draw underline
    doc.setDrawColor(0);
    doc.setLineWidth(0.15);
    doc.line(lineStartX, drawY + 0.3, endX, drawY + 0.3);

    // Value on top of underline
    if (val) {
      doc.setFont('Helvetica', field.bold ? 'bold' : 'normal');
      doc.setTextColor(0);
      doc.text(val, lineStartX + 0.3, drawY);
    }

    doc.setFont('Helvetica', 'normal');
  }

  for (const row of fieldRows) {
    if (row.type === 'full') {
      const field = row.field;
      const fontSize = fieldFontSizeMap[field.font_size] || 7;
      const lineH = fontSize * 0.45;
      if (currentY + lineH > y + h * 0.6) break;

      drawInlineField(field, mergedValues[field.label] || '', leftPad, rightPad, currentY + lineH, fontSize);
      currentY += lineH + 0.8;
    } else {
      const leftField = row.left;
      const rightField = row.right;
      const leftFontSize = fieldFontSizeMap[leftField.font_size] || 7;
      const rightFontSize = fieldFontSizeMap[rightField.font_size] || 7;
      const lineH = Math.max(leftFontSize, rightFontSize) * 0.45;
      if (currentY + lineH > y + h * 0.6) break;

      const halfEnd = leftPad + innerW / 2 - 1;
      const rightStart = leftPad + innerW / 2 + 1;

      drawInlineField(leftField, mergedValues[leftField.label] || '', leftPad, halfEnd, currentY + lineH, leftFontSize);
      drawInlineField(rightField, mergedValues[rightField.label] || '', rightStart, rightPad, currentY + lineH, rightFontSize);
      currentY += lineH + 0.8;
    }
  }

  // Zone 3: Shape
  if (label.shape_segments && label.shape_segments.length > 0) {
    const shapeZoneY = y + h * 0.6;
    const shapeZoneH = h * 0.38;
    const shapeZoneW = w - 3;

    // Draw separator
    doc.setDrawColor(230);
    doc.line(x + 1, shapeZoneY, x + w - 1, shapeZoneY);

    const renderData = renderSegments(label.shape_segments);
    if (renderData.pathD) {
      const boundsW = renderData.bounds.maxX - renderData.bounds.minX;
      const boundsH = renderData.bounds.maxY - renderData.bounds.minY;

      if (boundsW > 0 && boundsH > 0) {
        const scaleX = (shapeZoneW * 1.0) / boundsW;
        const scaleY = (shapeZoneH * 1.0) / boundsH;
        const shapeSc = Math.min(scaleX, scaleY);

        const offsetX = leftPad + (shapeZoneW - boundsW * shapeSc) / 2 - renderData.bounds.minX * shapeSc;
        const offsetY = shapeZoneY + 1.5 + (shapeZoneH * 1.0 - boundsH * shapeSc) / 2 - renderData.bounds.minY * shapeSc;

        // Draw shape lines
        doc.setDrawColor(50);
        doc.setLineWidth(0.5);
        for (let i = 0; i < renderData.points.length - 1; i++) {
          const p1 = renderData.points[i];
          const p2 = renderData.points[i + 1];
          doc.line(
            offsetX + p1.x * shapeSc,
            offsetY + p1.y * shapeSc,
            offsetX + p2.x * shapeSc,
            offsetY + p2.y * shapeSc
          );
        }
        if (renderData.isClosed && renderData.points.length > 2) {
          const first = renderData.points[0];
          const last = renderData.points[renderData.points.length - 1];
          doc.line(
            offsetX + last.x * shapeSc,
            offsetY + last.y * shapeSc,
            offsetX + first.x * shapeSc,
            offsetY + first.y * shapeSc
          );
        }

        // Dimension labels — use precalculated offset
        doc.setFontSize(10);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(0);
        const dist_mm = 2.4; // Consistent close distance from the line
        for (const mp of renderData.segmentMidpoints) {
          // Calculate normalized outward vector based on the labelOffsetAngle
          const rad = (mp.labelOffsetAngle * Math.PI) / 180;
          
          // Re-calculate the anchor point (midpoint/tip-shifted) by removing the renderer's offset
          // Wait, I updated the renderer to include the offset in labelX/Y.
          // Let's just calculate the anchor directly to be 100% sure.
          
          const finalX = (offsetX + mp.labelX * shapeSc);
          const finalY = (offsetY + mp.labelY * shapeSc);
          
          doc.text(
            String(mp.length),
            finalX,
            finalY,
            { align: 'center', baseline: 'middle', angle: 0 }
          );
        }
        doc.setFont('Helvetica', 'normal');
      }
    }
  }

  // Label counter at bottom-center
  if (labelNumber !== undefined) {
    doc.setFontSize(7);
    doc.setTextColor(0);
    doc.setFont('Helvetica', 'normal');
    doc.text(String(labelNumber), x + w / 2, y + h - 1, { align: 'center' });
  }
}

function drawBlankLabel(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fields: FieldDef[],
  logoEnabled: boolean,
  logoDataUrl: string | null,
  phoneEnabled: boolean = false,
  companyPhone: string = ''
) {
  // Border
  doc.setDrawColor(150);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);

  let currentY = y + 1.5;
  const leftPad = x + 1.5;
  const rightPad = x + w - 1.5;
  const innerW = w - 3;

  // Zone 1: Logo + Phone (same as filled label)
  if (logoEnabled && logoDataUrl) {
    try {
      const logoH = h * 0.15;
      doc.addImage(logoDataUrl, 'PNG', x + w * 0.2, currentY, w * 0.6, logoH);
      currentY += logoH + 0.5;
    } catch (e) {
      // Skip logo if it fails
    }
  }

  if (phoneEnabled && companyPhone) {
    doc.setFontSize(7);
    doc.setTextColor(0);
    doc.setFont('Helvetica', 'bold');
    doc.text(companyPhone, x + w / 2, currentY + 2, { align: 'center' });
    currentY += 3;
  }

  if ((logoEnabled && logoDataUrl) || (phoneEnabled && companyPhone)) {
    doc.setDrawColor(220);
    doc.line(x + 1, currentY, x + w - 1, currentY);
    currentY += 1;
  }

  // Zone 2: Field titles + underlines only (no values)
  doc.setTextColor(0);
  const fieldFontSizeMap: Record<number, number> = { 1: 6, 2: 7, 3: 14 };
  const labelGap = 0.5;

  type FieldRow = { type: 'full'; field: FieldDef } | { type: 'pair'; left: FieldDef; right: FieldDef };
  const fieldRows: FieldRow[] = [];
  let fi = 0;
  while (fi < fields.length) {
    const f = fields[fi];
    if (f.layout === 'half' && fi + 1 < fields.length && fields[fi + 1].layout === 'half') {
      fieldRows.push({ type: 'pair', left: f, right: fields[fi + 1] });
      fi += 2;
    } else {
      fieldRows.push({ type: 'full', field: f });
      fi++;
    }
  }

  function drawBlankInlineField(field: FieldDef, startX: number, endX: number, drawY: number, fontSize: number) {
    doc.setFontSize(fontSize);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(field.label, startX, drawY);
    const labelW = doc.getTextWidth(field.label);
    const lineStartX = startX + labelW + labelGap;
    doc.setDrawColor(0);
    doc.setLineWidth(0.15);
    doc.line(lineStartX, drawY + 0.3, endX, drawY + 0.3);
    doc.setFont('Helvetica', 'normal');
  }

  for (const row of fieldRows) {
    if (row.type === 'full') {
      const field = row.field;
      const fontSize = fieldFontSizeMap[field.font_size] || 7;
      const lineH = fontSize * 0.45;
      if (currentY + lineH > y + h * 0.6) break;

      drawBlankInlineField(field, leftPad, rightPad, currentY + lineH, fontSize);
      currentY += lineH + 0.8;
    } else {
      const leftFontSize = fieldFontSizeMap[row.left.font_size] || 7;
      const rightFontSize = fieldFontSizeMap[row.right.font_size] || 7;
      const lineH = Math.max(leftFontSize, rightFontSize) * 0.45;
      if (currentY + lineH > y + h * 0.6) break;

      const halfEnd = leftPad + innerW / 2 - 1;
      const rightStart = leftPad + innerW / 2 + 1;

      drawBlankInlineField(row.left, leftPad, halfEnd, currentY + lineH, leftFontSize);
      drawBlankInlineField(row.right, rightStart, rightPad, currentY + lineH, rightFontSize);
      currentY += lineH + 0.8;
    }
  }

  // Zone 3: Empty (no shape for blank labels) — just a grey area
  const shapeZoneY = y + h * 0.6;
  doc.setDrawColor(230);
  doc.line(x + 1, shapeZoneY, x + w - 1, shapeZoneY);
}

export async function exportPdf(
  job: Job,
  labels: Label[],
  settings: AppSettings,
  logoDataUrl: string | null
): Promise<void> {
  const doc = generatePdf(job, labels, settings, logoDataUrl);
  const pdfBlob = doc.output('blob');

  // Try Tauri save dialog first
  try {
    if ('__TAURI__' in window) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');

      const path = await save({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `${job.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      });

      if (path) {
        const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
        await writeFile(path, bytes);
      }
      return;
    }
  } catch (e) {
    console.warn('Tauri save failed, falling back to browser download:', e);
  }

  // Browser fallback
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${job.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
