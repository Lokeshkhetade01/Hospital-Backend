// routes/prescriptionRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getMyPrescriptions,
  getPrescriptionById,
  getMyPrescriptionPDF,
} = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── Patient can view their own prescriptions ──────────────────────────────
// (Doctor writes prescription via /api/doctors/me/prescriptions)
// (PDF download is via /api/doctors/me/prescriptions/:id/pdf)

// GET /api/prescriptions/mine
// → all prescriptions of the logged-in patient
// → populated with doctor name, specialization, appointment date/slot
router.get('/mine', protect, authorize('patient'), getMyPrescriptions);

// GET /api/prescriptions/:id/pdf
router.get('/:id/pdf', protect, authorize('patient'), getMyPrescriptionPDF);
// GET /api/prescriptions/:id
// → only accessible by the patient it belongs to
router.get('/:id', protect, authorize('patient'), getPrescriptionById);

module.exports = router;
