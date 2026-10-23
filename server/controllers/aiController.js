const aiService = require('../services/aiService');
const { AIResponseError } = require('../services/aiResponse');

/**
 * Wraps an aiService call with consistent error handling.
 * AI errors (rate limits, bad keys, network) should not crash the server —
 * they should return a friendly message to the user.
 */
const handleAIError = (res, error) => {
  console.error('AI request failed:', error.code || error.status || error.name || 'unknown');

  if (error.code === 'AI_CONFIG_MISSING' || error.code === 'AI_CONFIG_INVALID') {
    return res.status(503).json({
      message: 'AI service is not configured. Ask the administrator to check server settings.',
    });
  }
  if (error instanceof AIResponseError || error.code === 'AI_RESPONSE_INVALID') {
    return res.status(502).json({ message: 'AI returned an unexpected response. Please try again.' });
  }
  if (error.status === 429) {
    return res.status(429).json({ message: 'AI rate limit reached. Please try again in a moment.' });
  }
  return res.status(503).json({ message: 'AI service is temporarily unavailable. Please try again.' });
};

/**
 * POST /api/ai/breakdown
 * Body: { description }
 */
const breakdown = async (req, res) => {
  try {
    const { description } = req.body;
    const result = await aiService.breakdownTask(description.trim());
    res.json(result);
  } catch (error) {
    handleAIError(res, error);
  }
};

/**
 * POST /api/ai/explain
 * Body: { language, code }
 */
const explain = async (req, res) => {
  try {
    const { language, code } = req.body;
    const result = await aiService.explainCode(language.trim(), code.trim());
    res.json(result);
  } catch (error) {
    handleAIError(res, error);
  }
};

/**
 * POST /api/ai/debug
 * Body: { language, code, errorMessage }
 */
const debug = async (req, res) => {
  try {
    const { language, code, errorMessage } = req.body;
    const result = await aiService.debugCode(language.trim(), code.trim(), errorMessage.trim());
    res.json(result);
  } catch (error) {
    handleAIError(res, error);
  }
};

/**
 * POST /api/ai/docs
 * Body: { input, type? }  type: "code" | "project"
 */
const docs = async (req, res) => {
  try {
    const { input, type } = req.body;
    const result = await aiService.generateDocs(input.trim(), type || 'code');
    res.json(result);
  } catch (error) {
    handleAIError(res, error);
  }
};

module.exports = { breakdown, explain, debug, docs };
