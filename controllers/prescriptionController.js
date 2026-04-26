// controllers/prescriptionController.js
const Prescription = require('../models/Prescription');

// ───────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/mine   PATIENT
// ───────────────────────────────────────────────────────────────────────────
exports.getMyPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.user._id })
      .sort('-createdAt')
      .populate({ path: 'doctor', select: 'specialization user', populate: { path: 'user', select: 'name avatar' } })
      .populate('appointment', 'date timeSlot');

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
