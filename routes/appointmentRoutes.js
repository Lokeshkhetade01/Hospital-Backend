// routes/appointmentRoutes.js
const express = require('express');
const router  = express.Router();
const {
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All appointment routes require patient auth ───────────────────────────

// POST /api/appointments/book
// Body: { doctorId, date, timeSlot, symptoms }
// → checks slot conflict, creates appointment, sends email, notifies admin
router.post('/book', protect, authorize('patient'), bookAppointment);

// GET /api/appointments/mine
// Query: ?status=confirmed&page=1&limit=10
// → patient's own bookings (with doctor details populated)
router.get('/mine', protect, authorize('patient'), getMyAppointments);

// PUT /api/appointments/:id/cancel
// Body: { reason }
// → cancels appointment, sets refundStatus='requested' if already paid
router.put('/:id/cancel', protect, authorize('patient'), cancelAppointment);

module.exports = router;
