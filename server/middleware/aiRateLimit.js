const { createRateLimiter } = require('./rateLimit');

module.exports = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => req.user?._id || req.ip,
  limitMessage: 'AI request limit reached. Please try again in a minute.',
});
