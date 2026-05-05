// routes/authRoutes.js
const express = require('express');
const router  = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../config/cloudinary');
// ─── Public ────────────────────────────────────────────────────────────────
// POST /api/auth/register  →  patient self-registration
router.post('/register', register);

// POST /api/auth/login     →  all users login (patient / doctor / admin)
router.post('/login',    login);

// ─── Protected (any logged-in user) ───────────────────────────────────────

// GET  /api/auth/me               →  get own profile
router.get ('/me',protect, getMe);

// PUT  /api/auth/update-profile   →  update name, phone, avatar, etc.
router.put('/update-profile', protect, uploadAvatar.single('avatar'), updateProfile);

// PUT  /api/auth/change-password  →  change password (needs oldPassword)
router.put ('/change-password',  protect, changePassword);

module.exports = router;
