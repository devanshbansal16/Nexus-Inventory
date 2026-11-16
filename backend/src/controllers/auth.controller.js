const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../middleware/asyncHandler');

const generateTokens = (user) => {
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'cims_super_secret_jwt_key_2026',
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '1d' }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'cims_super_secret_refresh_key_2026',
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { token, refreshToken };
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(400, 'User with this email already exists');
  }

  // Security Rule: Public registration defaults to unprivileged staff role
  const user = new User({
    name,
    email,
    passwordHash: password,
    role: 'staff',
  });
  await user.save();

  const { token, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

  return new ApiResponse(201, 'User registered successfully', {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
    refreshToken,
  }).send(res, 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is inactive. Please contact your administrator.');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { token, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

  return new ApiResponse(200, 'Login successful', {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedWarehouses: user.assignedWarehouses,
    },
    token,
    refreshToken,
  }).send(res, 200);
});

const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
  }
  res.clearCookie('token');
  return new ApiResponse(200, 'Logged out successfully').send(res, 200);
});

const getMe = asyncHandler(async (req, res) => {
  return new ApiResponse(200, 'Current profile fetched', { user: req.user }).send(res, 200);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, 'Refresh token required');

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'cims_super_secret_refresh_key_2026'
    );
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return new ApiResponse(200, 'Token refreshed', tokens).send(res, 200);
  } catch (e) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');

  const isMatch = await user.matchPassword(oldPassword);
  if (!isMatch) throw new ApiError(400, 'Incorrect current password');

  user.passwordHash = newPassword;
  await user.save();

  return new ApiResponse(200, 'Password updated successfully').send(res, 200);
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  refresh,
  changePassword,
};
