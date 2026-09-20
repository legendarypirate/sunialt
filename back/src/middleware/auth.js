const jwt = require('jsonwebtoken');
const { Admin, User } = require('../models');

function readToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.split(' ')[1];
}

function signAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role, typ: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function signUserToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, typ: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

const authenticateAdmin = async (req, res, next) => {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.typ && payload.typ !== 'admin') {
      return res.status(401).json({ error: 'Admin token required' });
    }
    const admin = await Admin.findByPk(payload.id, {
      attributes: { exclude: ['password'] },
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive admin' });
    }

    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authenticateUser = async (req, res, next) => {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.typ && payload.typ !== 'user') {
      return res.status(401).json({ error: 'User token required' });
    }
    const user = await User.findByPk(payload.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalUser = async (req, _res, next) => {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.typ && payload.typ !== 'user') return next();
    const user = await User.findByPk(payload.id);
    if (user && user.isActive) req.user = user;
  } catch {
    // public routes still work without a valid token
  }
  next();
};

module.exports = {
  authenticateAdmin,
  authenticateUser,
  optionalUser,
  signAdminToken,
  signUserToken,
};
