const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware: verifies the JWT in the Authorization header.
 *
 * Expected header format:  Authorization: Bearer <token>
 *
 * On success: attaches the full user document to req.user and calls next().
 * On failure: responds with 401 (no/invalid token) or 404 (user deleted).
 */
const protect = async (req, res, next) => {
  try {
    // 1. Extract token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized — no token provided' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify the token (throws if expired or tampered)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Fetch the user (ensures the account still exists)
    // .select('-passwordHash') is an extra safety net even though toJSON() strips it
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    // jwt.verify throws JsonWebTokenError or TokenExpiredError
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired — please log in again' });
    }
    return res.status(401).json({ message: 'Not authorized — invalid token' });
  }
};

module.exports = { protect };
