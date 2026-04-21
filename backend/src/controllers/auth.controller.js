const db = require('../../config/database');
const { hashPassword, comparePassword } = require('../utils/password.utils');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt.utils');

const REFRESH_COOKIE_NAME = 'refresh_token';

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

const adminExists = () => {
  const user = db.prepare('SELECT id FROM users LIMIT 1').get();
  return !!user;
};

const registerAdmin = async (req, res) => {
  try {
    if (adminExists()) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const { username, password } = req.body;

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = await hashPassword(password);

    const result = db.prepare(`
      INSERT INTO users (username, password_hash)
      VALUES (?, ?)
    `).run(username, passwordHash);

    const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Admin created successfully',
      user: {
        id: user.id,
        username: user.username,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user.id, user.username);
    const refreshToken = generateRefreshToken(user.id);

    db.prepare(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `).run(user.id, refreshToken);

    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    res.json({
      access_token: accessToken,
      expires_in: 15 * 60,
      user: {
        id: user.id,
        username: user.username,
        last_login: user.last_login
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const refresh_token = req.body?.refresh_token || req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyToken(refresh_token);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const storedToken = db.prepare(`
      SELECT rt.*, u.username
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token = ? AND rt.expires_at > datetime('now')
    `).get(refresh_token);

    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const newAccessToken = generateAccessToken(storedToken.user_id, storedToken.username);
    const newRefreshToken = generateRefreshToken(storedToken.user_id);

    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refresh_token);
    db.prepare(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `).run(storedToken.user_id, newRefreshToken);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());

    res.json({
      access_token: newAccessToken,
      expires_in: 15 * 60
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

const logout = async (req, res) => {
  try {
    const refresh_token = req.body?.refresh_token || req.cookies?.[REFRESH_COOKIE_NAME];

    if (refresh_token) {
      db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refresh_token);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

module.exports = {
  adminExists,
  registerAdmin,
  login,
  refreshToken,
  logout
};
