const { validationResult } = require('express-validator');

/**
 * Middleware factory: runs after express-validator check() chains.
 * If there are validation errors, responds with 400 and the error list.
 * If clean, calls next().
 *
 * Usage:
 *   router.post('/register', [...validatorChain], validate, authController.register);
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return only the first error message per field for clean UX
    const messages = errors.array().map((e) => e.msg);
    return res.status(400).json({ message: messages[0], errors: messages });
  }
  next();
};

module.exports = { validate };
