// models/Appointment.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  doctor:       { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  date:         { type: Date,   required: true },
  timeSlot:     { type: String, required: true },
  isPrescriptionDone: { type: Boolean, default: false },
  symptoms:     { type: String },
  notes:        { type: String },   // doctor's internal notes
  status: {
    type:    String,
    enum:    ['pending','confirmed','cancelled','completed','no-show'],
    default: 'pending',
  },
  fees:         { type: Number, default: 0 },
  platformFee:  { type: Number, default: 29 },
  totalAmount:  { type: Number, default: 0 },
  isPaid:       { type: Boolean, default: false },
  paymentId:    { type: String },
  orderId:      { type: String },
  cancelledBy:  { type: String, enum: ['patient','doctor','admin'] },
  cancelReason: { type: String },
  refundStatus: { type: String, enum: ['none','requested','processed','rejected'], default: 'none' },
}, { timestamps: true });

// Auto-calculate totalAmount
appointmentSchema.pre('save', function (next) {
  if (this.isModified('fees') || this.isModified('platformFee')) {
    this.totalAmount = (this.fees || 0) + (this.platformFee || 29);
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
