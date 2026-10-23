const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const registerRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  keyGenerator: (req) => req.ip,
  limitMessage: 'Too many registration attempts. Please try again later.',
});
const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => req.ip,
  limitMessage: 'Too many login attempts. Please try again in 15 minutes.',
});

// Validation rules for registration
const registerRules = [
  body('name').isString().withMessage('Name is required').bail().trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('email').isString().withMessage('Valid email is required').bail().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isString().withMessage('Password must be a string').bail()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
    .withMessage('Password cannot exceed 72 UTF-8 bytes'),
];

// Validation rules for login
const loginRules = [
  body('email').isString().withMessage('Valid email is required').bail().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isString().withMessage('Password is required').bail()
    .notEmpty().withMessage('Password is required')
    .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
    .withMessage('Password cannot exceed 72 UTF-8 bytes'),
];

router.post('/register', registerRateLimit, registerRules, validate, register);
router.post('/login', loginRateLimit, loginRules, validate, login);
router.get('/me', protect, getMe);

module.exports = router;
