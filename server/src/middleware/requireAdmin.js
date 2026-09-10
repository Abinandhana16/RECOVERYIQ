/**
 * Role-based Authorization Middleware: Admin Only
 * Runs after authMiddleware has verified the token and attached req.user.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Access denied. Authentication required.',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden. Admin privileges are required to perform this action.',
    });
  }

  next();
}

module.exports = requireAdmin;
