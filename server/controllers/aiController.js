const aiService = require('../services/aiService');

/**
 * Wraps an aiService call with consistent error handling.
 * AI errors (rate limits, bad keys, network) should not crash the server —
 * they should return a friendly message to the user.
 */
const handleAIError = (res, error) => {
  console.error('AI Service Error:', error.message);

  // Don't leak API keys or internal details
  if (error.message.includes('API key') || error.message.includes('GEMINI_API_KEY') || error.message.includes('OPENAI_API_KEY')) {
    return res.status(503).json({
      message: 'AI service is not configured. Please add your API key to the server environment.',
    });
  }
  if (error.status === 429 || error.message.includes('quota') || error.message.includes('rate limit')) {
    return res.status(429).json({ message: 'AI rate limit reached. Please try again in a moment.' });
  }
  if (error.message.includes('JSON')) {
    return res.status(500).json({ message: 'AI returned an unexpected response format. Please try again.' });
  }
  return res.status(500).json({ message: 'AI service temporarily unavailable. Please try again.' });
};

/**
 * POST /api/ai/breakdown
 * Body: { description }
 */
const breakdown = async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ message: 'Please provide a description (at least 10 characters).' });
    }
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
    if (!language || !code || code.trim().length < 5) {
      return res.status(400).json({ message: 'Please provide language and code snippet.' });
    }
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
    if (!language || !code || !errorMessage) {
      return res.status(400).json({ message: 'Please provide language, code, and error message.' });
    }
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
    if (!input || input.trim().length < 10) {
      return res.status(400).json({ message: 'Please provide code or project info to document.' });
    }
    const result = await aiService.generateDocs(input.trim(), type || 'code');
    res.json(result);
  } catch (error) {
    handleAIError(res, error);
  }
};

module.exports = { breakdown, explain, debug, docs };
