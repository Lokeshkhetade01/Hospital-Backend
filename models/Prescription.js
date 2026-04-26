// models/Prescription.js
const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  dosage:    String,
  frequency: String,
  duration:  String,
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  appointment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },
  doctor:       { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor',      required: true },
  diagnosis:    { type: String, required: true },
  medicines:    [medicineSchema],
  advice:       { type: String },
  followUpDate: { type: Date },
  attachments:  [String],   // Cloudinary report URLs
  pdfUrl:       { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
