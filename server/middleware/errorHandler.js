/**
 * Centralized error handler — must be registered LAST in Express middleware chain.
 *
 * All controllers call next(error) to hand off to this handler.
 * This keeps error formatting consistent across the entire API.
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Avoid logging request bodies, stack traces, or driver details that may contain user data.
  if (process.env.NODE_ENV !== 'production') {
    console.error('Request failed:', err.name || 'Error', err.message || 'Unknown error');
  }

  // Mongoose validation errors (e.g., required field missing)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  // Mongoose duplicate key (e.g., duplicate email on register)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'Value';
    return res.status(400).json({ message: `${field} already in use` });
  }

  // Mongoose invalid ObjectId (e.g., /api/projects/not-an-id)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  // Express body-parser errors include `status`; controller errors may use `statusCode`.
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode < 500 ? (err.message || 'Request failed') : 'Internal server error';

  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
