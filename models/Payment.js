// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  appointment:       { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  patient:           { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },
  doctor:            { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor',      required: true },
  amount:            { type: Number, required: true },
  platformFee:       { type: Number, default: 29 },
  currency:          { type: String, default: 'INR' },
  method:            { type: String },        
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  status: {
    type:    String,
    enum:    ['created','paid','failed','refund_requested','refunded'],
    default: 'created',
  },
  refundId:     { type: String },
  refundAmount: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
