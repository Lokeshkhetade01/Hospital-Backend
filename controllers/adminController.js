// controllers/adminController.js
const User         = require('../models/User');
const Doctor       = require('../models/Doctor');
const Appointment  = require('../models/Appointment');
const Payment      = require('../models/Payment');
const generateToken = require('../utils/generateToken');

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/admin/login   PUBLIC
// ═══════════════════════════════════════════════════════════════════════════
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: 'admin' }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });

    const token = generateToken(user._id, user.role);
    res.json({
      success: true, token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/admin/dashboard   ADMIN
// ═══════════════════════════════════════════════════════════════════════════

exports.getDashboard = async (req, res, next) => {
  try {
    // Pagination parameters from request query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); 
    tomorrow.setDate(today.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalPatients, 
      totalDoctors, 
      verifiedDoctors, 
      unverifiedDoctors,
      todayTotal, 
      pendingCount, 
      recentAppointments, 
      totalAppointmentsCount, // Total count for pagination
      monthlyRevAgg,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      Doctor.countDocuments(),
      Doctor.countDocuments({ isVerified: true }),
      Doctor.countDocuments({ isVerified: false }),
      Appointment.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
      Appointment.countDocuments({ status: 'pending' }),
      // Updated recentAppointments with skip and limit
      Appointment.find()
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .populate('patient', 'name email')
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } }),
      // Fetch total count for calculating total pages
      Appointment.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalPatients, 
          totalDoctors, 
          verifiedDoctors, 
          unverifiedDoctors,
          todayTotal, 
          pendingCount,
          monthlyRevenue: monthlyRevAgg[0]?.total || 0,
        },
        recentAppointments,
        // Pagination Metadata
        pagination: {
          total: totalAppointmentsCount,
          page,
          limit,
          totalPages: Math.ceil(totalAppointmentsCount / limit)
        }
      },
    });
  } catch (err) { 
    next(err); 
  }
};



// ═══════════════════════════════════════════════════════════════════════════
//  APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════
// register

exports.adminRegister = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists"
      });
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: "admin"
    });

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      admin
    });

  } catch (err) {
    next(err);
  }
};

// GET /api/admin/appointments?status=pending&date=2026-04-19&page=1&limit=10
exports.getAllAppointments = async (req, res, next) => {
  try {
    const { status, date, doctorId, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status)   filter.status = status;
    if (doctorId) filter.doctor = doctorId;
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      const n = new Date(d); n.setDate(d.getDate() + 1);
      filter.date = { $gte: d, $lt: n };
    }

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter)
        .sort('-createdAt')
        .skip((+page - 1) * +limit).limit(+limit)
        .populate('patient', 'name email phone')
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name' }, select: 'specialization fees user' }),
    ]);

    res.json({ success: true, total, page: +page, pages: Math.ceil(total / +limit), appointments });
  } catch (err) { next(err); }
};


exports.getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validation: Check if ID exists
    if (!id) {
      return res.status(400).json({ success: false, message: "Appointment ID is required" });
    }

    const appointment = await Appointment.findById(id)
      .populate('patient', 'name email phone avatar gender dob address') // Patient ki basic details
      .populate({
        path: 'doctor',
        select: 'specialization fees user hospital city regNumber experience about',
        populate: {
          path: 'user',
          select: 'name email avatar' // Doctor ka user profile data
        }
      });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (err) {
    // Agar invalid MongoDB ID hai toh specific error handle karein
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: "Invalid Appointment ID format" });
    }
    next(err);
  }
};



// PUT /api/admin/appointments/:id/status
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, cancelReason } = req.body;
    const allowed = ['confirmed', 'cancelled', 'completed', 'no-show'];
    if (!allowed.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status value.' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    appt.status = status;
    if (status === 'cancelled') {
      appt.cancelledBy  = 'admin';
      appt.cancelReason = cancelReason || 'Cancelled by admin.';
    }
    await appt.save();

    // Real-time notify patient
    req.app.get('io')?.to(appt.patient.toString()).emit('appointment-updated', {
      appointmentId: appt._id, status,
      message: `Your appointment has been ${status}.`,
    });

    res.json({ success: true, message: `Appointment ${status}.`, appointment: appt });
  } catch (err) { next(err); }
};

//  DOCTORS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/doctors
exports.getAllDoctors = async (req, res, next) => {
  try {
    const { verified, specialization, search, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (verified !== undefined) filter.isVerified = verified === 'true';
    if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };

    let query = Doctor.find(filter)
      .sort('-createdAt')
      .skip((+page - 1) * +limit).limit(+limit)
      .populate('user', 'name email phone avatar');

    const [total, doctors] = await Promise.all([Doctor.countDocuments(filter), query]);

    // Search by name (post-populate)
    const result = search
      ? doctors.filter(d => d.user?.name?.toLowerCase().includes(search.toLowerCase()))
      : doctors;

    res.json({ success: true, total, page: +page, pages: Math.ceil(total / +limit), doctors: result });
  } catch (err) { next(err); }
};

// POST /api/admin/doctors
exports.addDoctor = async (req, res, next) => {
  try {
    const { name, email, password, phone, specialization, experience, fees, hospital, city, regNumber, about } = req.body;

    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered.' });

    const userDoc   = await User.create({ name, email, password: password || 'Doctor@123', phone, role: 'doctor' });
    const doctorDoc = await Doctor.create({ user: userDoc._id, specialization, experience, fees, hospital, city, regNumber, about });

    res.status(201).json({
      success: true, message: 'Doctor added successfully.',
      doctor: { ...doctorDoc.toObject(), user: { name, email, phone } },
    });
  } catch (err) { next(err); }
};

// PUT /api/admin/doctors/:id
exports.updateDoctor = async (req, res, next) => {
  try {
    const fields  = ['specialization', 'experience', 'fees', 'hospital', 'city', 'about', 'isAvailable'];
    const updates = {};
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('user', 'name email phone');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

    res.json({ success: true, message: 'Doctor updated.', doctor });
  } catch (err) { next(err); }
};

// PUT /api/admin/doctors/:id/verify
exports.verifyDoctor = async (req, res, next) => {
  try {
    const { isVerified } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, { isVerified }, { new: true })
      .populate('user', 'name email');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

    req.app.get('io')?.to(doctor.user._id.toString()).emit('doctor-verified', {
      isVerified,
      message: isVerified
        ? 'Your profile has been verified by admin!'
        : 'Your verification was rejected. Please re-upload documents.',
    });

    res.json({ success: true, message: `Doctor ${isVerified ? 'verified' : 'rejected'}.`, doctor });
  } catch (err) { next(err); }
};

// DELETE /api/admin/doctors/:id
exports.removeDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

    await User.findByIdAndDelete(doctor.user);
    await Doctor.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Doctor and user account removed.' });
  } catch (err) { next(err); }
};

//  USERS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, isBlocked, search, page = 1, limit = 10 } = req.query;
    const filter = { role: { $ne: 'admin' } };

    if (role)                    filter.role      = role;
    if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';
    if (search) filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort('-createdAt').skip((+page - 1) * +limit).limit(+limit),
    ]);

    res.json({ success: true,message:"fetch all user successfully!", total, page: +page, pages: Math.ceil(total / +limit), users });
  } catch (err) { next(err); }
};

// PUT /api/admin/users/:id/block
exports.toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot block admin.' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}.`, user });
  } catch (err) { next(err); }
};

//  PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/payments
exports.getAllPayments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, payments, revenueAgg] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter).sort('-createdAt')
        .skip((+page - 1) * +limit).limit(+limit)
        .populate('patient', 'name email phone')
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
        .populate('appointment', 'date timeSlot'),
      Payment.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: start } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true, total,
      page: +page, pages: Math.ceil(total / +limit),
      monthlyRevenue: revenueAgg[0]?.total || 0,
      monthlyCount:   revenueAgg[0]?.count || 0,
      payments,
    });
  } catch (err) { next(err); }
};

// POST /api/admin/payments/:id/refund
exports.processRefund = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    if (payment.status !== 'refund_requested')
      return res.status(400).json({ success: false, message: 'No active refund request.' });

    payment.status       = 'refunded';
    payment.refundAmount = payment.amount;
    await payment.save();

    await Appointment.findByIdAndUpdate(payment.appointment, { refundStatus: 'processed' });

    res.json({ success: true, message: 'Refund processed.', payment });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [revenueByMonth, apptStatus, topSpecializations, newPatients] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
        { $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' }, count: { $sum: 1 },
        }},
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      Appointment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Doctor.aggregate([
        { $lookup: { from: 'appointments', localField: '_id', foreignField: 'doctor', as: 'appts' } },
        { $project: { specialization: 1, total: { $size: '$appts' } } },
        { $group: { _id: '$specialization', total: { $sum: '$total' } } },
        { $sort: { total: -1 } }, { $limit: 6 },
      ]),
      User.aggregate([
        { $match: { role: 'patient', createdAt: { $gte: sixMonthsAgo } } },
        { $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          count: { $sum: 1 },
        }},
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
    ]);

    res.json({ success: true, data: { revenueByMonth, apptStatus, topSpecializations, newPatients } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

exports.getSettings = async (_req, res) => {
  res.json({
    success: true,
    settings: {
      hospitalName:   process.env.HOSPITAL_NAME   || 'MediCare Hospital',
      contactEmail:   process.env.CONTACT_EMAIL   || 'admin@medicare.com',
      platformFee:    +process.env.PLATFORM_FEE   || 29,
      emailNotif:     process.env.EMAIL_NOTIF     !== 'false',
      smsNotif:       process.env.SMS_NOTIF       === 'true',
      autoConfirm:    process.env.AUTO_CONFIRM    === 'true',
      paymentEnabled: process.env.PAYMENT_ENABLED !== 'false',
    },
  });
};

exports.saveSettings = async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err) { next(err); }
};
