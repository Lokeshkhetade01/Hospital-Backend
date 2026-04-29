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

// ─── Public ────────────────────────────────────────────────────────────────
// POST /api/auth/register  →  patient self-registration
// POST /api/auth/login     →  all users login (patient / doctor / admin)
router.post('/register', register);
router.post('/login',    login);
// ─── Protected (any logged-in user) ───────────────────────────────────────
// GET  /api/auth/me               →  get own profile
// PUT  /api/auth/update-profile   →  update name, phone, avatar, etc.
// PUT  /api/auth/change-password  →  change password (needs oldPassword)
router.get ('/me',               protect, getMe);
router.put ('/update-profile',   protect, updateProfile);
router.put ('/change-password',  protect, changePassword);

module.exports = router;
