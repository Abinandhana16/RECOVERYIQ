const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'recoveryiq_jwt_secret_key_2026';

/**
 * Authentication Middleware
 * Checks for Bearer JWT token in Authorization header and verifies it.
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        error: 'Access denied. No Authorization header provided.',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Invalid Authorization header format. Expected Bearer <token>.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid or malformed authentication token.' });
  }
}

module.exports = authMiddleware;
