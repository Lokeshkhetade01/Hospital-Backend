// routes/adminRoutes.js
const express = require('express');
const router  = express.Router();
const {
  adminLogin,
  getDashboard,
  getAllAppointments,
  updateAppointmentStatus,
  getAllDoctors,
  addDoctor,
  updateDoctor,
  verifyDoctor,
  removeDoctor,
  getAllUsers,
  toggleBlockUser,
  getAllPayments,
  processRefund,
  getAnalytics,
  getSettings,
  saveSettings,
  adminRegister
} = require('../controllers/adminController');
const {doctorLogin} = require("../controllers/authController")
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── Public ────────────────────────────────────────────────────────────────
// POST /api/admin/login
router.post('/login', adminLogin);

router.post('/register', adminRegister);

// ─── All routes below require Admin auth ──────────────────────────────────
router.use(protect, authorize('admin'));

// ── Dashboard ──────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
router.get('/dashboard', getDashboard);

// ── Appointments ───────────────────────────────────────────────────────────
// GET /api/admin/appointments?status=pending&date=2026-04-19&page=1&limit=10
// PUT /api/admin/appointments/:id/status  → { status, cancelReason }
router.get('/appointments',             getAllAppointments);
router.put('/appointments/:id/status',  updateAppointmentStatus);

// ── Doctors ────────────────────────────────────────────────────────────────
// GET    /api/admin/doctors?verified=true&specialization=Cardiologist&page=1
// POST   /api/admin/doctors           → add new doctor
// PUT    /api/admin/doctors/:id       → edit doctor details
// PUT    /api/admin/doctors/:id/verify→ { isVerified: true/false }
// DELETE /api/admin/doctors/:id       → remove doctor + user account
router.get   ('/doctors',              getAllDoctors);
router.post  ('/doctors',              addDoctor);
router.put   ('/doctors/:id',          updateDoctor);
router.put   ('/doctors/:id/verify',   verifyDoctor);
router.delete('/doctors/:id',          removeDoctor);
router.post("/doctor-login", doctorLogin);

// ── Users ──────────────────────────────────────────────────────────────────
// GET /api/admin/users?role=patient&isBlocked=false&search=Rahul&page=1
// PUT /api/admin/users/:id/block   → toggles isBlocked
router.get('/users',            getAllUsers);
router.put('/users/:id/block',  toggleBlockUser);

// ── Payments ───────────────────────────────────────────────────────────────
// GET  /api/admin/payments?status=paid&page=1
// POST /api/admin/payments/:id/refund
router.get ('/payments',             getAllPayments);
router.post('/payments/:id/refund',  processRefund);

// ── Analytics ──────────────────────────────────────────────────────────────
// GET /api/admin/analytics
router.get('/analytics', getAnalytics);

// ── Settings ───────────────────────────────────────────────────────────────
// GET  /api/admin/settings
// POST /api/admin/settings
router.get ('/settings', getSettings);
router.post('/settings', saveSettings);

module.exports = router;
