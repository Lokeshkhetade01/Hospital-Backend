// routes/paymentRoutes.js
const express = require('express');
const router  = express.Router();
const {
  createOrder,
  verifyPayment,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── Both payment routes require patient auth ──────────────────────────────

// POST /api/payments/create-order
// Body: { appointmentId }
// → creates Razorpay order, returns { order, key } to frontend
// → frontend opens Razorpay checkout modal with this data
router.post('/create-order', protect, authorize('patient'), createOrder);

// POST /api/payments/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId }
// → verifies HMAC SHA256 signature
// → sets appointment.isPaid = true, status = 'confirmed'
// → updates Payment record to 'paid'
// → sends confirmation email to patient
router.post('/verify', protect, authorize('patient'), verifyPayment);

module.exports = router;
