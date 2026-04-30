// controllers/doctorController.js
const Doctor          = require('../models/Doctor');
const Appointment     = require('../models/Appointment');
const Prescription    = require('../models/Prescription');
const User            = require('../models/User');
const generatePDF     = require('../utils/generatePDF');

// ═══════════════════════════════════════════════════════════════════════════
//  GET /api/doctors/me/dashboard   DOCTOR
// ═══════════════════════════════════════════════════════════════════════════
exports.getDoctorDashboard = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const [todayCount, completedCount, totalPatientIds, upcomingAppts, completedAppts] = await Promise.all([
      Appointment.countDocuments({ doctor: doctor._id, date: { $gte: today, $lt: tomorrow } }),
      Appointment.countDocuments({ doctor: doctor._id, date: { $gte: today, $lt: tomorrow }, status: 'completed' }),
      Appointment.distinct('patient', { doctor: doctor._id }),
      Appointment.find({ doctor: doctor._id, date: { $gte: today }, status: { $in: ['pending', 'confirmed'] } })
        .sort('date timeSlot').limit(10).populate('patient', 'name phone gender dob'),
      Appointment.find({ doctor: doctor._id, status: 'completed' }).select('_id'),
    ]);

    // Find appointments without prescriptions (pending Rx)
    const rxDone       = await Prescription.distinct('appointment', { doctor: doctor._id });
    const rxDoneSet    = new Set(rxDone.map(id => id.toString()));
    const pendingRxIds = completedAppts.filter(a => !rxDoneSet.has(a._id.toString())).map(a => a._id);

    const pendingRxAppts = await Appointment.find({ _id: { $in: pendingRxIds } })
      .sort('-date').limit(5).populate('patient', 'name phone');

    res.json({
      success: true,
      data: {
        stats: {
          todayAppointments: todayCount,
          completedToday:    completedCount,
          pendingRxCount:    pendingRxAppts.length,
          totalPatients:     totalPatientIds.length,
          rating:            doctor.rating,
          totalReviews:      doctor.totalReviews,
        },
        upcomingAppointments: upcomingAppts,
        pendingRxAppointments: pendingRxAppts,
      },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/doctors/me/appointments?date=2026-04-19&status=confirmed&page=1
exports.getMyAppointments = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const { date, status, page = 1, limit = 20 } = req.query;
    const filter = { doctor: doctor._id };

    if (status) filter.status = status;
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      const n = new Date(d); n.setDate(d.getDate() + 1);
      filter.date = { $gte: d, $lt: n };
    }

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter).sort('date timeSlot')
        .skip((+page - 1) * +limit).limit(+limit)
        .populate('patient', 'name email phone gender dob avatar'),
    ]);

    res.json({ success: true, total, appointments });
  } catch (err) { next(err); }
};

// PUT /api/doctors/me/appointments/:id/status
exports.updateMyAppointmentStatus = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    const appt   = await Appointment.findById(req.params.id);

    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (appt.doctor.toString() !== doctor._id.toString())
      return res.status(403).json({ success: false, message: 'Not your appointment.' });

    const { status, notes, cancelReason } = req.body;
    appt.status = status;
    if (notes)        appt.notes        = notes;
    if (cancelReason) { appt.cancelledBy = 'doctor'; appt.cancelReason = cancelReason; }
    await appt.save();

    req.app.get('io')?.to(appt.patient.toString()).emit('appointment-updated', {
      appointmentId: appt._id, status,
    });

    res.json({ success: true, message: `Appointment marked as ${status}.`, appointment: appt });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/doctors/me/prescriptions
exports.createPrescription = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    const { appointmentId, diagnosis, medicines, advice, followUpDate, attachments } = req.body;

    const appt = await Appointment.findById(appointmentId).populate('patient', 'name _id');
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (appt.doctor.toString() !== doctor._id.toString())
      return res.status(403).json({ success: false, message: 'Not your appointment.' });

    const exists = await Prescription.findOne({ appointment: appointmentId });
    if (exists) return res.status(400).json({ success: false, message: 'Prescription already written for this appointment.' });

    const rx = await Prescription.create({
      appointment: appointmentId,
      patient:     appt.patient._id,
      doctor:      doctor._id,
      diagnosis, medicines, advice, followUpDate, attachments,
    });

    if (appt.status !== 'completed') { appt.status = 'completed'; 
      appt.isPrescriptionDone = true;
      appt.prescriptionId = rx._id;
      await appt.save(); }
    req.app.get('io')?.to(appt.patient._id.toString()).emit('prescription-ready', {
      rxId:    rx._id,
      message: `Your prescription from Dr. ${req.user.name} is ready.`,
    });

    res.status(201).json({ success: true, message: 'Prescription written successfully.', prescription: rx });
  } catch (err) { next(err); }
};

// GET /api/doctors/me/prescriptions?page=1&limit=10
exports.getMyPrescriptions = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    const { page = 1, limit = 10 } = req.query;

    const [total, prescriptions] = await Promise.all([
      Prescription.countDocuments({ doctor: doctor._id }),
      Prescription.find({ doctor: doctor._id }).sort('-createdAt')
        .skip((+page - 1) * +limit).limit(+limit)
        .populate('patient', 'name phone gender')
        .populate('appointment', 'date timeSlot'),
    ]);

    res.json({ success: true, total, prescriptions });
  } catch (err) { next(err); }
};

// GET /api/doctors/me/prescriptions/:id/pdf
exports.getPrescriptionPDF = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });

    const rx = await Prescription.findOne({ _id: req.params.id, doctor: doctor._id })
      .populate('patient', 'name gender dob phone')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
      .populate('appointment', 'date timeSlot');

    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' });

    generatePDF(rx, res);  // streams PDF to response
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  PATIENTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/doctors/me/patients?search=Rahul&page=1
exports.getMyPatients = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    const { search, page = 1, limit = 10 } = req.query;

    const patientIds = await Appointment.distinct('patient', { doctor: doctor._id });
    const filter     = { _id: { $in: patientIds } };

    if (search) filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const [total, patients] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).skip((+page - 1) * +limit).limit(+limit)
        .select('name email phone gender dob avatar createdAt'),
    ]);

    // Attach visit count + last visit per patient
    const enriched = await Promise.all(patients.map(async p => {
      const [visitCount, lastAppt] = await Promise.all([
        Appointment.countDocuments({ doctor: doctor._id, patient: p._id }),
        Appointment.findOne({ doctor: doctor._id, patient: p._id }).sort('-date').select('date status'),
      ]);
      return { ...p.toObject(), visitCount, lastVisit: lastAppt?.date, lastStatus: lastAppt?.status };
    }));

    res.json({ success: true, total, pages: Math.ceil(total / +limit), patients: enriched });
  } catch (err) { next(err); }
};

// GET /api/doctors/me/patients/:patientId/history
exports.getPatientHistory = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });

    const [patient, appointments, prescriptions] = await Promise.all([
      User.findById(req.params.patientId).select('name email phone gender dob avatar'),
      Appointment.find({ doctor: doctor._id, patient: req.params.patientId })
        .sort('-date').select('date timeSlot status symptoms notes isPaid totalAmount'),
      Prescription.find({ doctor: doctor._id, patient: req.params.patientId })
        .sort('-createdAt'),
    ]);

    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    res.json({ success: true, patient, appointments, prescriptions });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/doctors/me/schedule
exports.getSchedule = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id }).select('availability isAvailable');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    res.json({ success: true, availability: doctor.availability, isAvailable: doctor.isAvailable });
  } catch (err) { next(err); }
};

// PUT /api/doctors/me/schedule
exports.updateSchedule = async (req, res, next) => {
  try {
    const { availability, isAvailable } = req.body;
    const doctor = await Doctor.findOneAndUpdate(
      { user: req.user._id },
      { availability, isAvailable },
      { new: true }
    );
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    res.json({ success: true, message: 'Schedule updated.', availability: doctor.availability });
  } catch (err) { next(err); }
};

// GET /api/doctors/slots?doctorId=xxx&date=2026-04-20   PUBLIC
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date)
      return res.status(400).json({ success: false, message: 'doctorId and date are required.' });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isVerified)
      return res.status(404).json({ success: false, message: 'Doctor not found.' });

    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const dayAvail = doctor.availability.find(a => a.day === dayName);
    if (!dayAvail) return res.json({ success: true, slots: [], bookedSlots: [] });

    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const n = new Date(d); n.setDate(d.getDate() + 1);

    const booked    = await Appointment.find({ doctor: doctorId, date: { $gte: d, $lt: n }, status: { $ne: 'cancelled' } }).select('timeSlot');
    const bookedSet = new Set(booked.map(a => a.timeSlot));

    res.json({
      success: true,
      slots:       dayAvail.slots.filter(s => !bookedSet.has(s)),
      bookedSlots: [...bookedSet],
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/doctors/me/profile
exports.getDoctorProfile = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id }).populate('user', 'name email phone avatar');
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    res.json({ success: true, doctor });
  } catch (err) { next(err); }
};

// PUT /api/doctors/me/profile
exports.updateDoctorProfile = async (req, res, next) => {
  try {
    const userFields   = ['name', 'phone', 'avatar'];
    const doctorFields = ['specialization', 'experience', 'fees', 'about', 'hospital', 'city'];

    const userUpdates   = {};
    const doctorUpdates = {};
    userFields.forEach(f   => { if (req.body[f] !== undefined) userUpdates[f]   = req.body[f]; });
    doctorFields.forEach(f => { if (req.body[f] !== undefined) doctorUpdates[f] = req.body[f]; });

    const [, doctor] = await Promise.all([
      User.findByIdAndUpdate(req.user._id, userUpdates, { runValidators: true }),
      Doctor.findOneAndUpdate({ user: req.user._id }, doctorUpdates, { new: true }).populate('user', 'name email phone avatar'),
    ]);

    res.json({ success: true, message: 'Profile updated.', doctor });
  } catch (err) { next(err); }
};

// POST /api/doctors/me/documents   (multer + cloudinary)
exports.uploadDocuments = async (req, res, next) => {
  try {
    if (!req.files?.length)
      return res.status(400).json({ success: false, message: 'No files uploaded.' });

    const urls   = req.files.map(f => f.path);
    const doctor = await Doctor.findOneAndUpdate(
      { user: req.user._id },
      { $push: { documents: { $each: urls } } },
      { new: true }
    );

    res.json({ success: true, message: 'Documents uploaded.', documents: doctor.documents });
  } catch (err) { next(err); }
};

// GET /api/doctors   PUBLIC — listing for patient website
exports.listDoctors = async (req, res, next) => {
  try {
    const { specialization, city, minFee, maxFee, sort, search, page = 1, limit = 9 } = req.query;
    const filter = { isVerified: true };

    if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };
    if (city)           filter.city           = { $regex: city, $options: 'i' };
    if (minFee || maxFee) {
      filter.fees = {};
      if (minFee) filter.fees.$gte = +minFee;
      if (maxFee) filter.fees.$lte = +maxFee;
    }

    const sortMap = { rating: { rating: -1 }, 'fees-low': { fees: 1 }, 'fees-high': { fees: -1 }, experience: { experience: -1 } };
    const sortOpt = sortMap[sort] || { createdAt: -1 };

    const [total, doctors] = await Promise.all([
      Doctor.countDocuments(filter),
      Doctor.find(filter).sort(sortOpt).skip((+page - 1) * +limit).limit(+limit).populate('user', 'name avatar'),
    ]);

    const result = search
      ? doctors.filter(d => d.user?.name?.toLowerCase().includes(search.toLowerCase()))
      : doctors;

    res.json({ success: true, total, page: +page, pages: Math.ceil(total / +limit), doctors: result });
  } catch (err) { next(err); }
};

// GET /api/doctors/:id   PUBLIC
exports.getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('user', 'name avatar email');
    if (!doctor || !doctor.isVerified)
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    res.json({ success: true, doctor });
  } catch (err) { next(err); }
};
