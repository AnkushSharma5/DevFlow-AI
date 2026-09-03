const express = require('express');
const { breakdown, explain, debug, docs } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All AI routes require authentication — we never expose AI to anonymous users
router.use(protect);

/**
 * POST /api/ai/breakdown  — Task Breakdown
 * POST /api/ai/explain    — Code Explainer
 * POST /api/ai/debug      — AI Debugger
 * POST /api/ai/docs       — Documentation Generator
 */
router.post('/breakdown', breakdown);
router.post('/explain', explain);
router.post('/debug', debug);
router.post('/docs', docs);

module.exports = router;
