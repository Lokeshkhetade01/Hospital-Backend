// routes/faqRoutes.js
const express = require('express');
const router = express.Router();

const {
  createFaq,
  getFaq,
  updateFaq,
  deleteFaq
} = require('../controllers/faqController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ✅ Public Route (NO TOKEN)
router.get('/', getFaq);

// 🔐 Admin Only Routes
router.post('/', protect, authorize('admin'), createFaq);
router.put('/:id', protect, authorize('admin'), updateFaq);
router.delete('/:id', protect, authorize('admin'), deleteFaq);

module.exports = router;