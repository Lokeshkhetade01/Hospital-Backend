// models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:      { type: String, required: [true, 'Name is required'], trim: true },
  email:     { type: String, required: [true, 'Email is required'], unique: true, lowercase: true },
  password:  { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  role:      { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  phone:     { type: String },
  avatar:    { type: String, default: '' },
  gender:    { type: String, enum: ['male', 'female', 'other'] },
  dob:       { type: Date },
  address:   { type: String },
  isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
