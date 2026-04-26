// utils/seeder.js
// Run: node utils/seeder.js
// Creates admin user + 2 doctors + 2 patients for testing

require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Doctor   = require('../models/Doctor');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // Clear existing data
    await User.deleteMany({});
    await Doctor.deleteMany({});
    console.log('Cleared existing users and doctors...');

    // ── Create Admin ──────────────────────────────────────────────────
    const admin = await User.create({
      name:     'Super Admin',
      email:    'admin@medicare.com',
      password: 'Admin@123',
      role:     'admin',
      phone:    '+91 98765 00000',
    });
    console.log('Admin created:', admin.email);

    // ── Create Doctor Users ───────────────────────────────────────────
    const doctorUser1 = await User.create({
      name:  'Dr. Anjali Mehta',
      email: 'anjali@medicare.com',
      password: 'Doctor@123',
      role:  'doctor',
      phone: '+91 98765 11111',
      gender: 'female',
    });

    const doctorUser2 = await User.create({
      name:  'Dr. Rohit Singh',
      email: 'rohit@medicare.com',
      password: 'Doctor@123',
      role:  'doctor',
      phone: '+91 98765 22222',
      gender: 'male',
    });

    // ── Create Doctor Profiles ────────────────────────────────────────
    await Doctor.create({
      user:           doctorUser1._id,
      specialization: 'Cardiologist',
      experience:     12,
      fees:           600,
      about:          '12+ years experience in interventional cardiology. MBBS, MD from AIIMS Delhi.',
      hospital:       'Fortis Hospital',
      city:           'Pune',
      regNumber:      'MH-2014-09823',
      isVerified:     true,
      rating:         4.9,
      totalReviews:   128,
      availability: [
        { day: 'Monday',    slots: ['9:00 AM','9:30 AM','10:00 AM','10:30 AM','2:00 PM','2:30 PM'] },
        { day: 'Tuesday',   slots: ['9:00 AM','9:30 AM','10:00 AM','2:00 PM'] },
        { day: 'Wednesday', slots: ['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM'] },
        { day: 'Thursday',  slots: ['9:00 AM','9:30 AM','10:00 AM','10:30 AM','2:00 PM','2:30 PM'] },
        { day: 'Friday',    slots: ['9:00 AM','9:30 AM','10:00 AM','11:00 AM'] },
        { day: 'Saturday',  slots: ['9:00 AM','9:30 AM'] },
      ],
    });

    await Doctor.create({
      user:           doctorUser2._id,
      specialization: 'Orthopedic',
      experience:     8,
      fees:           500,
      about:          '8 years experience in orthopedic surgery. Specializes in joint replacement.',
      hospital:       'Ruby Hall Clinic',
      city:           'Pune',
      regNumber:      'MH-2018-04521',
      isVerified:     true,
      rating:         4.7,
      totalReviews:   95,
      availability: [
        { day: 'Monday',    slots: ['10:00 AM','10:30 AM','11:00 AM','3:00 PM','3:30 PM'] },
        { day: 'Wednesday', slots: ['10:00 AM','10:30 AM','11:00 AM'] },
        { day: 'Friday',    slots: ['10:00 AM','10:30 AM','3:00 PM'] },
      ],
    });

    console.log('2 doctors created (both verified)');

    // ── Create Patient Users ──────────────────────────────────────────
    const patient1 = await User.create({
      name:    'Rahul Sharma',
      email:   'rahul@gmail.com',
      password: 'Patient@123',
      role:    'patient',
      phone:   '+91 98765 33333',
      gender:  'male',
    });

    const patient2 = await User.create({
      name:    'Priya Patel',
      email:   'priya@gmail.com',
      password: 'Patient@123',
      role:    'patient',
      phone:   '+91 98765 44444',
      gender:  'female',
    });

    console.log('2 patients created');

    console.log('\n══════════════════════════════════════════');
    console.log('  SEEDING COMPLETE — Test credentials:');
    console.log('══════════════════════════════════════════');
    console.log('  ADMIN    → admin@medicare.com  / Admin@123');
    console.log('  DOCTOR 1 → anjali@medicare.com / Doctor@123');
    console.log('  DOCTOR 2 → rohit@medicare.com  / Doctor@123');
    console.log('  PATIENT 1→ rahul@gmail.com     / Patient@123');
    console.log('  PATIENT 2→ priya@gmail.com     / Patient@123');
    console.log('══════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('Seeder error:', err.message);
    process.exit(1);
  }
};

seed();
