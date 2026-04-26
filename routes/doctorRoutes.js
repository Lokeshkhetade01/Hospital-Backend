// routes/doctorRoutes.js
const express = require('express');
const router  = express.Router();
const {
  // Public
  listDoctors,
  getDoctorById,
  getAvailableSlots,
  // Doctor panel
  getDoctorDashboard,
  getMyAppointments,
  updateMyAppointmentStatus,
  createPrescription,
  getMyPrescriptions,
  getPrescriptionPDF,
  getMyPatients,
  getPatientHistory,
  getSchedule,
  updateSchedule,
  getDoctorProfile,
  updateDoctorProfile,
  uploadDocuments,
} = require('../controllers/doctorController');
const { protect, authorize }  = require('../middleware/authMiddleware');
const { uploadDoc }           = require('../config/cloudinary');

// ─── Public routes (used by patient website) ───────────────────────────────
// GET /api/doctors              → list all verified doctors with filters
// GET /api/doctors/slots        → available time slots for a date
// GET /api/doctors/:id          → single doctor detail page
router.get('/',      listDoctors);
router.get('/slots', getAvailableSlots);
router.get('/:id',   getDoctorById);

// ─── Doctor-only protected routes ─────────────────────────────────────────
router.use(protect, authorize('doctor'));

// Dashboard
// GET /api/doctors/me/dashboard
router.get('/me/dashboard', getDoctorDashboard);

// Appointments
// GET /api/doctors/me/appointments?date=2026-04-19&status=confirmed&page=1
// PUT /api/doctors/me/appointments/:id/status → { status, notes, cancelReason }
router.get('/me/appointments',             getMyAppointments);
router.put('/me/appointments/:id/status',  updateMyAppointmentStatus);

// Prescriptions
// POST /api/doctors/me/prescriptions         → write new Rx
// GET  /api/doctors/me/prescriptions         → all Rx written by this doctor
// GET  /api/doctors/me/prescriptions/:id/pdf → stream PDF (responseType: blob)
router.post('/me/prescriptions',          createPrescription);
router.get ('/me/prescriptions',          getMyPrescriptions);
router.get ('/me/prescriptions/:id/pdf',  getPrescriptionPDF);

// Patients
// GET /api/doctors/me/patients?search=Rahul&page=1
// GET /api/doctors/me/patients/:patientId/history
router.get('/me/patients',                    getMyPatients);
router.get('/me/patients/:patientId/history', getPatientHistory);

// Schedule
// GET /api/doctors/me/schedule
// PUT /api/doctors/me/schedule → { availability: [{day, slots[]}], isAvailable }
router.get('/me/schedule', getSchedule);
router.put('/me/schedule', updateSchedule);

// Profile
// GET  /api/doctors/me/profile
// PUT  /api/doctors/me/profile  → update name, fees, bio, etc.
// POST /api/doctors/me/documents → upload docs (multipart/form-data, field: 'documents')
router.get ('/me/profile',   getDoctorProfile);
router.put ('/me/profile',   updateDoctorProfile);
router.post('/me/documents', uploadDoc.array('documents', 5), uploadDocuments);

module.exports = router;
