const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('./asyncHandler');
const { User } = require('../models');
const { DEMO_USERS } = require('../utils/demoData');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required: please log in');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cims_super_secret_jwt_key_2026');

    // Standalone / Demo mode fallback when MongoDB is not connected
    if (mongoose.connection.readyState !== 1) {
      const demoUser = DEMO_USERS.find((u) => u._id === (decoded.id || decoded.userId)) || {
        _id: decoded.id || decoded.userId,
        name: 'Demo User',
        email: decoded.email || 'inventory@cims.com',
        role: decoded.role || 'inventory_manager',
        isActive: true,
      };
      req.user = demoUser;
      return next();
    }

    const user = await User.findById(decoded.id || decoded.userId).select('-passwordHash');

    if (!user) {
      throw new ApiError(401, 'User account no longer exists');
    }
    if (!user.isActive) {
      throw new ApiError(403, 'User account has been deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Not authorized: invalid or expired token');
  }
});

module.exports = { protect };
