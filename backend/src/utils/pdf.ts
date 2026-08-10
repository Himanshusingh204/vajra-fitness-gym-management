import PDFDocument from 'pdfkit';
import { Response } from 'express';

export const sendPdf = (res: Response, filename: string, build: (doc: PDFKit.PDFDocument) => void) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  doc.pipe(res);
  try {
    build(doc);
    doc.end();
  } catch {
    doc.destroy();
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
};

const money = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc
    .rect(0, 0, doc.page.width, 130)
    .fill('#111827');
  doc.fill('#ffffff').fontSize(22).font('Helvetica-Bold')
    .text('VAJRA FITNESS', doc.page.margins.left, 36, { width: pageWidth, align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Fee Payment Receipt', 0, 68, { width: doc.page.width, align: 'center' });

  doc.y = 160;
  doc.fill('#111827').fontSize(11).font('Helvetica-Bold').text('Payment Information');
  doc.moveDown(0.4);

  const leftX = doc.page.margins.left;
  const rightX = pageWidth / 2 + doc.page.margins.left;

  const row = (label: string, value: string, x: number) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#6B7280').text(label, x, doc.y, { width: 150, continued: true });
    doc.font('Helvetica').fillColor('#111827').text(value, { width: 180 });
    doc.moveDown(0.2);
  };

  doc.y += 4;
  row('Receipt No.', data.feeId.slice(0, 8).toUpperCase(), leftX);
  row('Status', data.status, rightX);
  row('Amount', money(data.amount), leftX);
  row('Payment Date', fmtDate(data.paymentDate), rightX);
  row('Due Date', fmtDate(data.dueDate), leftX);
  if (data.paymentMethod) row('Payment Method', data.paymentMethod, rightX);
  if (data.transactionId) row('Transaction ID', data.transactionId, rightX);
  if (data.notes) row('Notes', data.notes, leftX);

  doc.moveDown(0.8);
  doc.fill('#111827').fontSize(11).font('Helvetica-Bold').text('Member Details');
  doc.moveDown(0.4);
  doc.y += 4;
  row('Name', data.memberName, leftX);
  if (data.memberEmail) row('Email', data.memberEmail, leftX);
  if (data.memberPhone) row('Phone', data.memberPhone, leftX);

  doc.moveDown(0.8);
  doc.fill('#111827').fontSize(11).font('Helvetica-Bold').text('Gym Details');
  doc.moveDown(0.4);
  doc.y += 4;
  row('Gym', data.gymName, leftX);
  if (data.gymAddress) row('Address', data.gymAddress, leftX);
  if (data.gymGst) row('GST No.', data.gymGst, leftX);

  doc.moveDown(2);
  doc
    .rect(0, doc.page.height - 90, doc.page.width, 90)
    .fill('#F3F4F6');
  doc.fill('#6B7280').fontSize(9).font('Helvetica')
    .text('This is a computer-generated receipt and does not require a physical signature.', doc.page.margins.left, doc.page.height - 74, { width: pageWidth, align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')} · Vajra Fitness`, doc.page.margins.left, doc.page.height - 52, { width: pageWidth, align: 'center' });
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
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc
    .rect(0, 0, doc.page.width, 130)
    .fill('#111827');
  doc.fill('#ffffff').fontSize(22).font('Helvetica-Bold')
    .text('VAJRA FITNESS', doc.page.margins.left, 36, { width: pageWidth, align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Workout Slip', 0, 68, { width: doc.page.width, align: 'center' });

  doc.y = 160;
  doc.fill('#111827').fontSize(11).font('Helvetica-Bold').text(data.title || 'Personalized Workout Plan');
  doc.moveDown(0.4);

  const row = (label: string, value: string) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#6B7280').text(label, { width: 150, continued: true });
    doc.font('Helvetica').fillColor('#111827').text(value, { width: 300 });
    doc.moveDown(0.2);
  };

  doc.y += 4;
  row('Slip No.', data.slipId.slice(0, 8).toUpperCase());
  row('Member', data.memberName);
  row('Gym', data.gymName);
  if (data.trainerName) row('Trainer', data.trainerName);
  row('Assigned', fmtDate(data.assignedDate));
  if (data.validUntil) row('Valid Until', fmtDate(data.validUntil));

  doc.moveDown(0.8);
  doc.fill('#111827').fontSize(11).font('Helvetica-Bold').text('Exercises');
  doc.moveDown(0.3);

  const exercises = parseExercises(data.exercises);

  if (exercises.length === 0) {
    doc.fontSize(10).fillColor('#6B7280').text('No exercises listed.');
  } else {
    doc.y += 2;
    exercises.forEach((ex, i) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(`${i + 1}.`);
      const x = doc.x;
      doc.font('Helvetica').fontSize(10).fillColor('#374151').text(ex, x + 4);
      doc.moveDown(0.25);
    });
  }

  doc.moveDown(1.5);
  doc.fill('#6B7280').fontSize(9).font('Helvetica')
    .text('Please warm up before exercising and consult a trainer for correct form.', doc.page.margins.left, undefined, { width: pageWidth });
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')} · Vajra Fitness`, undefined, undefined, { width: pageWidth });
};
