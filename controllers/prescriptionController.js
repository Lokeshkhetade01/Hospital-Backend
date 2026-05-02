// controllers/prescriptionController.js
const Prescription = require('../models/Prescription');
const generatePDF = require("../utils/generatePDF")
// ───────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/mine   PATIENT
// ───────────────────────────────────────────────────────────────────────────
exports.getMyPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.user._id })
      .sort('-createdAt')
      .populate({ path: 'doctor', select: 'specialization user', populate: { path: 'user', select: 'name avatar' } })
      .populate('appointment', 'date timeSlot')
      .populate({
        path: 'patient',
        select: 'name'
      });

    res.json({ success: true, count: prescriptions.length, prescriptions });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/:id   PATIENT
// ───────────────────────────────────────────────────────────────────────────
exports.getPrescriptionById = async (req, res, next) => {
  try {
    const rx = await Prescription.findOne({ _id: req.params.id, patient: req.user._id })
      .populate({ path: 'doctor', select: 'specialization hospital user', populate: { path: 'user', select: 'name' } })
      .populate('appointment', 'date timeSlot');

    if (!rx)
      return res.status(404).json({ success: false, message: 'Prescription not found.' });

    res.json({ success: true, prescription: rx });
  } catch (err) { next(err); }
};


exports.getMyPrescriptionPDF = async (req, res, next) => {
  try {
    // Prescription fetch karo — patient ka check bhi karo
    const rx = await Prescription.findOne({
      _id:     req.params.id,
      patient: req.user._id,   // Sirf apni prescription ka PDF milega
    })
      .populate('patient', 'name gender dob phone')
      .populate({
        path:     'doctor',
        select:   'specialization hospital regNumber user',
        populate: { path: 'user', select: 'name' },
      })
      .populate('appointment', 'date timeSlot');

    if (!rx)
      return res.status(404).json({
        success: false,
        message: 'Prescription not found.',
      });

    // Wahi generatePDF function use karo jo doctor side pe use hota hai
    // Response mein PDF stream ho jaayegi
    generatePDF(rx, res);

  } catch (err) { next(err); }
};