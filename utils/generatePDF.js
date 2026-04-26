// utils/generatePDF.js
const PDFDocument = require('pdfkit');

/**
 * Streams a prescription PDF to the response object.
 * @param {Object} rx   - Populated Prescription document
 * @param {Object} res  - Express response object
 */
const generatePrescriptionPDF = (rx, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=prescription-${rx._id}.pdf`);
  doc.pipe(res);

  // ── Header ──────────────────────────────────────────────────────────────
  doc.fontSize(22).font('Helvetica-Bold').text('MediCare Hospital', { align: 'center' });
  doc.fontSize(11).font('Helvetica').text('123, FC Road, Pune - 411005 | +91 20 1234 5678 | admin@medicare.com', { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#185FA5').lineWidth(2).stroke();
  doc.moveDown(0.6);

  // ── Doctor + Patient Info ────────────────────────────────────────────────
  const leftX = 50, rightX = 300;
  const startY = doc.y;

  doc.fontSize(12).font('Helvetica-Bold').text(`Dr. ${rx.doctor.user?.name || 'N/A'}`, leftX, startY);
  doc.fontSize(10).font('Helvetica').text(`Specialization: ${rx.doctor.specialization}`, leftX);
  doc.fontSize(10).text(`Reg. No: ${rx.doctor.regNumber || 'N/A'}`, leftX);
  doc.fontSize(10).text(`Hospital: ${rx.doctor.hospital || 'N/A'}`, leftX);

  doc.fontSize(12).font('Helvetica-Bold').text('Patient Details', rightX, startY);
  doc.fontSize(10).font('Helvetica').text(`Name: ${rx.patient.name}`, rightX);
  doc.fontSize(10).text(`Phone: ${rx.patient.phone || 'N/A'}`, rightX);
  doc.fontSize(10).text(`Gender: ${rx.patient.gender || 'N/A'}`, rightX);
  doc.fontSize(10).text(`Date: ${new Date(rx.appointment.date).toDateString()}`, rightX);
  doc.fontSize(10).text(`Slot: ${rx.appointment.timeSlot}`, rightX);

  doc.moveDown(1.2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').lineWidth(0.5).stroke();
  doc.moveDown(0.6);

  // ── Diagnosis ────────────────────────────────────────────────────────────
  doc.fontSize(13).font('Helvetica-Bold').text('Diagnosis');
  doc.fontSize(11).font('Helvetica').text(rx.diagnosis).moveDown(0.8);

  // ── Medicines ────────────────────────────────────────────────────────────
  doc.fontSize(13).font('Helvetica-Bold').text('Medicines');
  doc.moveDown(0.3);

  rx.medicines.forEach((med, i) => {
    doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${med.name}`, { continued: false });
    doc.fontSize(10).font('Helvetica').text(
      `    Dosage: ${med.dosage || '—'}   |   Frequency: ${med.frequency || '—'}   |   Duration: ${med.duration || '—'}`
    );
    doc.moveDown(0.2);
  });
  doc.moveDown(0.5);

  // ── Advice ───────────────────────────────────────────────────────────────
  if (rx.advice) {
    doc.fontSize(13).font('Helvetica-Bold').text('Doctor\'s Advice');
    doc.fontSize(11).font('Helvetica').text(rx.advice).moveDown(0.8);
  }

  // ── Follow-up ────────────────────────────────────────────────────────────
  if (rx.followUpDate) {
    doc.fontSize(11).font('Helvetica-Bold')
      .text(`Follow-up Date: ${new Date(rx.followUpDate).toDateString()}`).moveDown(1.5);
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').lineWidth(0.5).stroke();
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#888')
    .text('This is a computer-generated prescription. Valid only with doctor\'s digital signature.', { align: 'center' });

  doc.end();
};

module.exports = generatePrescriptionPDF;
