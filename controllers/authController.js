// controllers/authController.js
const User          = require('../models/User');
const generateToken = require('../utils/generateToken');

// ───────────────────────────────────────────────────────────────────────────
// POST /api/auth/register   PUBLIC
// ───────────────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, gender, dob } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email is already registered.' });

    const user  = await User.create({ name, email, password, phone, gender, dob, role: 'patient' });
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────────────────────
// POST /api/auth/login   PUBLIC
// ───────────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    if (user.isBlocked)
      return res.status(403).json({ success: false, message: 'Account blocked. Contact admin.' });

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────────────────────
// GET /api/auth/me   PROTECTED
// ───────────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────────────────────
// PUT /api/auth/update-profile   PROTECTED
// ───────────────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'gender', 'dob', 'address', 'avatar'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────────────────────
// PUT /api/auth/change-password   PROTECTED
// ───────────────────────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword,  } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(oldPassword)))
      return res.status(400).json({ success: false, message: 'Old password is incorrect.' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) { next(err); }
};


exports.doctorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: 'doctor' }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      token,
      user
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};