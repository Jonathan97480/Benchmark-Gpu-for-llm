const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateAccessToken = (userId, username) => {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyToken,
  decodeToken
};
