const express = require('express');
const { body } = require('express-validator');
const { breakdown, explain, debug, docs } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const aiRateLimit = require('../middleware/aiRateLimit');
const { validate } = require('../middleware/validation');

const router = express.Router();

// All AI routes require authentication — we never expose AI to anonymous users
router.use(protect);

/**
 * POST /api/ai/breakdown  — Task Breakdown
 * POST /api/ai/explain    — Code Explainer
 * POST /api/ai/debug      — AI Debugger
 * POST /api/ai/docs       — Documentation Generator
 */
router.post('/breakdown', [
  body('description').isString().withMessage('Please provide a description.').bail().trim().isLength({ min: 10, max: 5000 }).withMessage('Description must be between 10 and 5000 characters.'),
], validate, aiRateLimit, breakdown);
router.post('/explain', [
  body('language').isString().withMessage('Please provide a language.').bail().trim().isLength({ min: 1, max: 50 }).withMessage('Language must be between 1 and 50 characters.'),
  body('code').isString().withMessage('Please provide code.').bail().trim().isLength({ min: 5, max: 20000 }).withMessage('Code must be between 5 and 20000 characters.'),
], validate, aiRateLimit, explain);
router.post('/debug', [
  body('language').isString().withMessage('Please provide a language.').bail().trim().isLength({ min: 1, max: 50 }).withMessage('Language must be between 1 and 50 characters.'),
  body('code').isString().withMessage('Please provide code.').bail().trim().isLength({ min: 5, max: 20000 }).withMessage('Code must be between 5 and 20000 characters.'),
  body('errorMessage').isString().withMessage('Please provide an error message.').bail().trim().isLength({ min: 1, max: 5000 }).withMessage('Error message must be between 1 and 5000 characters.'),
], validate, aiRateLimit, debug);
router.post('/docs', [
  body('input').isString().withMessage('Please provide code or project info.').bail().trim().isLength({ min: 10, max: 20000 }).withMessage('Input must be between 10 and 20000 characters.'),
  body('type').optional().isString().withMessage('Invalid documentation type.').bail().isIn(['code', 'project']).withMessage('Invalid documentation type.'),
], validate, aiRateLimit, docs);

module.exports = router;
