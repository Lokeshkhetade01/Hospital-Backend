// controllers/appointmentController.js
const Appointment = require('../models/Appointment');
const Doctor      = require('../models/Doctor');
const sendEmail   = require('../utils/sendEmail');

// ───────────────────────────────────────────────────────────────────────────
// POST /api/appointments/book   PATIENT
// ───────────────────────────────────────────────────────────────────────────
exports.bookAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, timeSlot, symptoms } = req.body;

    if (!doctorId || !date || !timeSlot)
      return res.status(400).json({ success: false, message: 'doctorId, date and timeSlot are required.' }); 

    // 1. Verify doctor
    const doctor = await Doctor.findById(doctorId).populate('user', 'name');
    if (!doctor || !doctor.isVerified)
      return res.status(400).json({ success: false, message: 'Doctor not found or not verified.' });

    // 2. Slot conflict check
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const n = new Date(d); n.setDate(d.getDate() + 1);

    const conflict = await Appointment.findOne({
      doctor: doctorId, timeSlot,
      date: { $gte: d, $lt: n },
      status: { $nin: ['cancelled'] },
    });
    if (conflict)
      return res.status(400).json({ success: false, message: 'This slot is already booked. Please choose another time.' });

    // 3. Create appointment
    const appointment = await Appointment.create({
      patient:     req.user._id,
      doctor:      doctorId,
      date:        new Date(date),
      timeSlot,
      symptoms,
      fees:        doctor.fees,
      platformFee: +(process.env.PLATFORM_FEE) || 29,
      status:      process.env.AUTO_CONFIRM === 'true' ? 'confirmed' : 'pending',
    });

    // 4. Send confirmation email
    // await sendEmail({
    //   to:      req.user.email,
    //   subject: '✅ Appointment Booked Succesfully — MediCare',
    //   html: `
    //     <div style="font-family:sans-serif;max-width:480px">
    //       <h2 style="color:#185FA5">MediCare Hospital</h2>
    //       <p>Hi <b>${req.user.name}</b>, your appointment is booked!</p>
    //       <table style="width:100%;border-collapse:collapse;font-size:14px">
    //         <tr><td style="padding:6px 0;color:#666">Doctor</td><td><b>Dr. ${doctor.user.name}</b></td></tr>
    //         <tr><td style="padding:6px 0;color:#666">Specialization</td><td>${doctor.specialization}</td></tr>
    //         <tr><td style="padding:6px 0;color:#666">Date</td><td>${new Date(date).toDateString()}</td></tr>
    //         <tr><td style="padding:6px 0;color:#666">Time</td><td>${timeSlot}</td></tr>
    //         <tr><td style="padding:6px 0;color:#666">Consultation fee</td><td>₹${doctor.fees}</td></tr>
    //         <tr><td style="padding:6px 0;color:#666">Platform fee</td><td>₹${process.env.PLATFORM_FEE || 29}</td></tr>
    //         <tr><td style="padding:6px 0;color:#666">Booking ID</td><td><b>#${appointment._id}</b></td></tr>
    //       </table>
    //       <p style="color:#888;font-size:12px">Please arrive 10 minutes early. Team MediCare</p>
    //     </div>
    //   `,
    // }).catch(() => {});  // don't fail if email fails

    // 5. Notify admin via Socket.io
    // req.app.get('io')?.to('admin-room').emit('new-appointment', {
    //   message:       `New booking by ${req.user.name} with Dr. ${doctor.user.name}`,
    //   appointmentId: appointment._id,
    // });

    res.status(201).json({ success: true, message: 'Appointment booked successfully.', appointment });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────────────────────
// GET /api/appointments/mine   PATIENT
// ───────────────────────────────────────────────────────────────────────────
exports.getMyAppointments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { patient: req.user._id };
    if (status) filter.status = status;

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter).sort('-createdAt')
        .skip((+page - 1) * +limit).limit(+limit)
        .populate({
          path:     'doctor',
          select:   'specialization fees hospital user',
          populate: { path: 'user', select: 'name avatar' },
        })
       
    ]);

    res.json({ success: true, total, page: +page, pages: Math.ceil(total / +limit), appointments });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────────────────────
// PUT /api/appointments/:id/cancel   PATIENT
// ───────────────────────────────────────────────────────────────────────────
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
    if (!appt)
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (['completed', 'cancelled'].includes(appt.status))
      return res.status(400).json({ success: false, message: `Cannot cancel a ${appt.status} appointment.` });

    appt.status       = 'cancelled';
    appt.cancelledBy  = 'patient';
    appt.cancelReason = req.body.reason || 'Cancelled by patient.';
    if (appt.isPaid) appt.refundStatus = 'requested';
    await appt.save();

    res.json({ success: true, message: 'Appointment cancelled.', appointment: appt });
  } catch (err) { next(err); }
};
