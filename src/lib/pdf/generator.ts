import { jsPDF } from 'jspdf';
import type { Job, Label, FieldDef, AppSettings } from '$lib/db/types';
import { calculateLayout } from '$lib/layout/engine';
import { renderSegments } from '$lib/shapes/renderer';

export function generatePdf(
  job: Job,
  labels: Label[],
  settings: AppSettings,
  logoDataUrl: string | null
): jsPDF {
  const pageW = job.page_width_mm;
  const pageH = job.page_height_mm;
  const labelW = job.label_width_mm;
  const labelH = job.label_height_mm;

  const layout = calculateLayout(
    pageW, pageH,
    settings.margin_top_mm, settings.margin_bottom_mm,
    settings.margin_left_mm, settings.margin_right_mm,
    labelW, labelH,
    settings.label_gap_mm,
    labels.map(l => ({ copies: l.copies }))
  );

  const orientation = job.page_orientation === 'landscape' ? 'landscape' : 'portrait';
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

      drawLabel(doc, pos.x, pos.y, labelW, labelH, label, job.fields, job.logo_enabled, logoDataUrl);
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
  logoEnabled: boolean,
  logoDataUrl: string | null
) {
  // Border
  doc.setDrawColor(150);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);

  let currentY = y + 1.5;
  const leftPad = x + 1.5;
  const rightPad = x + w - 1.5;
  const innerW = w - 3;

  // Zone 1: Logo
  if (logoEnabled && logoDataUrl) {
    try {
      const logoH = h * 0.15;
      doc.addImage(logoDataUrl, 'PNG', x + w * 0.2, currentY, w * 0.6, logoH);
      currentY += logoH + 1;
      doc.setDrawColor(220);
      doc.line(x + 1, currentY, x + w - 1, currentY);
      currentY += 1;
    } catch (e) {
      // Skip logo if it fails
      currentY += 1;
    }
  }

  // Zone 2: Fields (2-column table)
  doc.setTextColor(0);
  const fieldFontSizeMap: Record<number, number> = { 1: 6, 2: 7, 3: 9 };
  const midX = x + w * 0.42;

  for (const field of fields) {
    const fontSize = fieldFontSizeMap[field.font_size] || 7;
    const lineH = fontSize * 0.45;

    if (currentY + lineH > y + h * 0.6) break; // Don't overflow into shape zone

    // Label
    doc.setFontSize(fontSize);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`${field.label}:`, midX - 0.5, currentY + lineH, { align: 'right' });

    // Value
    doc.setTextColor(0);
    if (field.bold) {
      doc.setFont('Helvetica', 'bold');
    }
    const val = label.field_values[field.label] || '';
    doc.text(val, midX + 0.5, currentY + lineH);
    doc.setFont('Helvetica', 'normal');

    currentY += lineH + 0.8;
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
        const scaleX = (shapeZoneW * 0.8) / boundsW;
        const scaleY = (shapeZoneH * 0.7) / boundsH;
        const shapeSc = Math.min(scaleX, scaleY);

        const offsetX = leftPad + (shapeZoneW - boundsW * shapeSc) / 2 - renderData.bounds.minX * shapeSc;
        const offsetY = shapeZoneY + 1.5 + (shapeZoneH * 0.7 - boundsH * shapeSc) / 2 - renderData.bounds.minY * shapeSc;

        // Draw shape lines
        doc.setDrawColor(50);
        doc.setLineWidth(0.3);
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

        // Dimension labels
        doc.setFontSize(5);
        doc.setTextColor(120);
        for (const mp of renderData.segmentMidpoints) {
          doc.text(
            String(mp.length),
            offsetX + mp.x * shapeSc,
            offsetY + mp.y * shapeSc - 0.8,
            { align: 'center' }
          );
        }
      }
    }
  }
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
