// controllers/paymentController.js
const Razorpay    = require('razorpay');
const crypto      = require('crypto');
const Appointment = require('../models/Appointment');
const Payment     = require('../models/Payment');
const sendEmail   = require('../utils/sendEmail');

// Initialize lazily so it works without .env in test/load
const getRazorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY     || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_SECRET  || 'placeholder_secret',
});

// ───────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-order   PATIENT
// Step 1: create Razorpay order, return order + key to frontend
// ───────────────────────────────────────────────────────────────────────────
exports.createOrder = async (req, res, next) => {
  try {
    const { appointmentId } = req.body;

    const appt = await Appointment.findById(appointmentId);
    if (!appt)
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (appt.patient.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your appointment.' });
    if (appt.isPaid)
      return res.status(400).json({ success: false, message: 'Appointment is already paid.' });

    // Create Razorpay order
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   appt.totalAmount * 100,   // paise mein
      currency: 'INR',
      receipt:  `rcpt_${appointmentId}`,
      notes:    { appointmentId: appointmentId.toString(), patientId: req.user._id.toString() },
    });

    // Save order ID to appointment
    appt.orderId = order.id;
    await appt.save();

    // Create Payment record with 'created' status
    await Payment.create({
      appointment:     appointmentId,
      patient:         req.user._id,
      doctor:          appt.doctor,
      amount:          appt.totalAmount,
      platformFee:     appt.platformFee,
      razorpayOrderId: order.id,
      status:          'created',
    });

    res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY,
    });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────────────────────
// POST /api/payments/verify   PATIENT
// Step 2: verify HMAC signature, confirm appointment
// ───────────────────────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId } = req.body;

    // HMAC SHA256 verification
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });

    // Update appointment
    const appt = await Appointment.findByIdAndUpdate(appointmentId, {
      isPaid:    true,
      paymentId: razorpay_payment_id,
      status:    'confirmed',
    }, { new: true });

    // Update payment record
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status:            'paid',
      }
    );

    // Confirmation email
    await sendEmail({
      to:      req.user.email,
      subject: '💳 Payment Confirmed — MediCare',
      html: `<p>Hi ${req.user.name},</p><p>₹${appt.totalAmount} received. Appointment confirmed!</p><p>Booking ID: <b>#${appointmentId}</b></p>`,
    }).catch(() => {});

    res.json({ success: true, message: 'Payment verified. Appointment confirmed!', appointment: appt });
  } catch (err) { next(err); }
};
