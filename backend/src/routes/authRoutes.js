const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/authController');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { protect } = require('../middleware/auth');

// Auth routes with 5 requests/minute rate limit
router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.get('/me', protect, getMe);

module.exports = router;
