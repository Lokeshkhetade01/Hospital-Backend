// models/Doctor.js
const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  day:   { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
  slots: [String],
}, { _id: false });

const doctorSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specialization: { type: String, required: true },
  experience:     { type: Number, default: 0 },
  fees:           { type: Number, required: true },
  about:          { type: String },
  hospital:       { type: String },
  city:           { type: String },
  regNumber:      { type: String },
  documents:      [String],          // Cloudinary URLs
  availability:   [slotSchema],
  rating:         { type: Number, default: 0, min: 0, max: 5 },
  totalReviews:   { type: Number, default: 0 },
  isVerified:     { type: Boolean, default: false },
  isAvailable:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
