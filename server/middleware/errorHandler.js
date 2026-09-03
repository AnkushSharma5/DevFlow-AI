/**
 * Centralized error handler — must be registered LAST in Express middleware chain.
 *
 * All controllers call next(error) to hand off to this handler.
 * This keeps error formatting consistent across the entire API.
 */
const errorHandler = (err, req, res, next) => {
  // Log full error in development; in production you'd send to a logging service
  if (process.env.NODE_ENV !== 'production') {
    console.error('💥 Error:', err);
  }

  // Mongoose validation errors (e.g., required field missing)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  // Mongoose duplicate key (e.g., duplicate email on register)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} already in use` });
  }

  // Mongoose invalid ObjectId (e.g., /api/projects/not-an-id)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  // Default: use the error's own status code or fall back to 500
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
