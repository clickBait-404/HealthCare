const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'super_secret_healthcare_jwt_key_2026_antigravity';
    
    const decoded = jwt.verify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        doctorProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of: ${rolesArray.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
};
