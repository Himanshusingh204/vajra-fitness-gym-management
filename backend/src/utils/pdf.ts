import PDFDocument from 'pdfkit';
import { Response } from 'express';

const INK = '#111827';
const MUTED = '#6B7280';
const BRAND = '#800020';
const LINE = '#E5E7EB';
const STRIPE = '#F9FAFB';

export const sendPdf = (res: Response, filename: string, build: (doc: PDFKit.PDFDocument) => void) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  // bufferPages lets us stamp "Page X of Y" once the page count is known.
  const doc = new PDFDocument({ size: 'A4', margins: { top: 48, bottom: 60, left: 48, right: 48 }, bufferPages: true });
  doc.pipe(res);
  try {
    build(doc);
    addFooters(doc);
    doc.end();
  } catch {
    doc.destroy();
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
};

const addFooters = (doc: PDFKit.PDFDocument) => {
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    const { left, right, bottom } = doc.page.margins;
    const width = doc.page.width - left - right;
    const y = doc.page.height - bottom + 20;
    // the footer sits inside the bottom margin, which pdfkit would treat as overflow
    doc.page.margins.bottom = 0;
    doc.moveTo(left, y - 8).lineTo(left + width, y - 8).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(MUTED);
    doc.text('Kavach Fitness · computer-generated document, no signature required', left, y, { width, lineBreak: false });
    doc.text(`Page ${i - start + 1} of ${count}`, left, y, { width, align: 'right', lineBreak: false });
    doc.page.margins.bottom = bottom;
  }
};

// Helvetica has no ₹ glyph, so amounts use "Rs."
const money = (n: number) =>
  `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const contentWidth = (doc: PDFKit.PDFDocument) => doc.page.width - doc.page.margins.left - doc.page.margins.right;
const pageBottom = (doc: PDFKit.PDFDocument) => doc.page.height - doc.page.margins.bottom;

const drawHeader = (doc: PDFKit.PDFDocument, gymName: string, title: string) => {
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const width = contentWidth(doc);

  doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND).text('KAVACH FITNESS', left, top, { characterSpacing: 1.5 });
  doc.font('Helvetica-Bold').fontSize(18).fillColor(INK).text(gymName, left, top + 14, { width: width * 0.6 });
  const nameBottom = doc.y;

  doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text(title, left, top + 14, { width, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED)
    .text(`Generated ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`, left, doc.y + 2, { width, align: 'right' });

  const y = Math.max(nameBottom, doc.y) + 10;
  doc.rect(left, y, width, 2).fill(BRAND);
  doc.x = left;
  doc.y = y + 18;
};

type Field = [string, string];

const fieldBlock = (doc: PDFKit.PDFDocument, heading: string, fields: Field[], x: number, y: number, width: number) => {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(heading.toUpperCase(), x, y, { width, characterSpacing: 1 });
  doc.y += 4;
  for (const [label, value] of fields) {
    const rowY = doc.y;
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(label, x, rowY, { width: 85 });
    const labelBottom = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(value, x + 85, rowY, { width: width - 85 });
    doc.y = Math.max(doc.y, labelBottom) + 3;
  }
  return doc.y;
};

// Side-by-side blocks of labelled fields, e.g. "Billed to" next to "Receipt details".
const fieldColumns = (doc: PDFKit.PDFDocument, blocks: Array<{ heading: string; fields: Field[] }>) => {
  const left = doc.page.margins.left;
  const gap = 24;
  const colWidth = (contentWidth(doc) - gap * (blocks.length - 1)) / blocks.length;
  const top = doc.y;
  const bottom = Math.max(...blocks.map((b, i) => fieldBlock(doc, b.heading, b.fields, left + i * (colWidth + gap), top, colWidth)));
  doc.x = left;
  doc.y = bottom + 16;
};

// width is a fraction of the content width
type Column = { label: string; width: number; align?: 'left' | 'right' | 'center' };

const drawTable = (doc: PDFKit.PDFDocument, columns: Column[], rows: string[][], total?: [string, string]) => {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const pad = 6;
  const widths = columns.map((c) => c.width * width);

  const rowHeight = (cells: string[], font: string) => {
    doc.font(font).fontSize(9);
    return Math.max(...cells.map((c, i) => doc.heightOfString(c, { width: widths[i]! - pad * 2 }))) + pad * 2;
  };

  const drawRow = (cells: string[], font: string, color: string, fill?: string) => {
    const h = rowHeight(cells, font);
    const y = doc.y;
    if (fill) doc.rect(left, y, width, h).fill(fill);
    let x = left;
    cells.forEach((cell, i) => {
      doc.font(font).fontSize(9).fillColor(color)
        .text(cell, x + pad, y + pad, { width: widths[i]! - pad * 2, align: columns[i]!.align ?? 'left' });
      x += widths[i]!;
    });
    doc.y = y + h;
  };

  const drawHead = () => drawRow(columns.map((c) => c.label), 'Helvetica-Bold', '#FFFFFF', INK);

  drawHead();
  rows.forEach((cells, i) => {
    if (doc.y + rowHeight(cells, 'Helvetica') > pageBottom(doc)) {
      doc.addPage();
      drawHead();
    }
    drawRow(cells, 'Helvetica', INK, i % 2 ? STRIPE : undefined);
    doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(0.5).strokeColor(LINE).stroke();
  });

  if (total) {
    // label goes in the second-to-last column, amount in the last
    const cells = columns.map((_, i) => (i === columns.length - 2 ? total[0] : i === columns.length - 1 ? total[1] : ''));
    if (doc.y + rowHeight(cells, 'Helvetica-Bold') > pageBottom(doc)) doc.addPage();
    doc.rect(left, doc.y, width, 1).fill(INK);
    drawRow(cells, 'Helvetica-Bold', INK, '#F3F4F6');
  }
  doc.x = left;
  doc.y += 16;
};

const note = (doc: PDFKit.PDFDocument, text: string) => {
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(text, doc.page.margins.left, doc.y, { width: contentWidth(doc) });
};

export const parseExercises = (raw: string): string[] => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) =>
        typeof item === 'string' ? item : typeof item?.exercise === 'string' ? item.exercise : JSON.stringify(item)
      );
    }
  } catch {
    // fall through to text parsing
  }
  return trimmed
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
};

type ReceiptData = {
  feeId: string;
  amount: number;
  paymentDate: Date;
  dueDate: Date;
  status: string;
  paymentMethod?: string | null;
  transactionId?: string | null;
  notes?: string | null;
  gymName: string;
  gymAddress?: string | null;
  gymGst?: string | null;
  memberName: string;
  memberEmail?: string | null;
  memberPhone?: string | null;
};

export const buildFeeReceipt = (doc: PDFKit.PDFDocument, data: ReceiptData) => {
  drawHeader(doc, data.gymName, 'Fee Receipt');

  const member: Field[] = [['Name', data.memberName]];
  if (data.memberEmail) member.push(['Email', data.memberEmail]);
  if (data.memberPhone) member.push(['Phone', data.memberPhone]);

  const receipt: Field[] = [
    ['Receipt No.', data.feeId.slice(0, 8).toUpperCase()],
    ['Status', data.status],
  ];
  if (data.transactionId) receipt.push(['Transaction ID', data.transactionId]);
  if (data.gymAddress) receipt.push(['Gym address', data.gymAddress]);
  if (data.gymGst) receipt.push(['GSTIN', data.gymGst]);

  fieldColumns(doc, [
    { heading: 'Billed to', fields: member },
    { heading: 'Receipt details', fields: receipt },
  ]);

  const paid = data.status === 'PAID';
  drawTable(
    doc,
    [
      { label: 'Description', width: 0.36 },
      { label: 'Due date', width: 0.15 },
      { label: 'Paid on', width: 0.15 },
      { label: 'Method', width: 0.14 },
      { label: 'Amount', width: 0.2, align: 'right' },
    ],
    [[data.notes || 'Membership fee', fmtDate(data.dueDate), paid ? fmtDate(data.paymentDate) : '-', data.paymentMethod || '-', money(data.amount)]],
    [paid ? 'Total paid' : 'Amount due', money(data.amount)]
  );

  note(doc, 'Thank you for training with us. Please keep this receipt for your records.');
};

type SlipData = {
  slipId: string;
  title?: string | null;
  exercises: string;
  assignedDate: Date;
  validUntil?: Date | null;
  gymName: string;
  memberName: string;
  trainerName?: string | null;
};

export const buildWorkoutSlip = (doc: PDFKit.PDFDocument, data: SlipData) => {
  drawHeader(doc, data.gymName, 'Workout Slip');

  const plan: Field[] = [
    ['Plan', data.title || 'Personalized Workout Plan'],
    ['Slip No.', data.slipId.slice(0, 8).toUpperCase()],
    ['Assigned', fmtDate(data.assignedDate)],
  ];
  if (data.validUntil) plan.push(['Valid until', fmtDate(data.validUntil)]);

  const people: Field[] = [['Member', data.memberName]];
  if (data.trainerName) people.push(['Trainer', data.trainerName]);

  fieldColumns(doc, [
    { heading: 'Plan', fields: plan },
    { heading: 'Assigned to', fields: people },
  ]);

  const exercises = parseExercises(data.exercises);
  if (exercises.length === 0) {
    note(doc, 'No exercises listed.');
    doc.moveDown(1);
  } else {
    drawTable(
      doc,
      [
        { label: '#', width: 0.08, align: 'center' },
        { label: 'Exercise', width: 0.92 },
      ],
      exercises.map((ex, i) => [String(i + 1), ex])
    );
  }

  note(doc, 'Please warm up before exercising and consult a trainer for correct form.');
};
