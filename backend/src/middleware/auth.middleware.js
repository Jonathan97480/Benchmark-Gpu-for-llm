const db = require('../../config/database');
const { verifyToken } = require('../utils/jwt.utils');
const { hashApiKey } = require('../utils/apiKey.utils');

function parseBearerToken(req) {
  const authHeader = req.headers['authorization'];
  return authHeader && authHeader.split(' ')[1];
}

function getApiKeyFromRequest(req) {
  return req.headers['x-api-key'] || req.headers['x-api-key'.toLowerCase()] || null;
}

const authenticateToken = (req, res, next) => {
  const token = parseBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);

    if (decoded.type === 'refresh') {
      return res.status(401).json({ error: 'Refresh token cannot be used for access' });
    }

    req.user = {
      userId: decoded.userId,
      username: decoded.username
    };
    req.auth = {
      type: 'jwt',
      userId: decoded.userId,
      username: decoded.username
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', expired: true });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    } else {
      return res.status(500).json({ error: 'Authentication error' });
    }
  }
};

const authenticateApiKey = (req, res, next) => {
  const apiKey = getApiKeyFromRequest(req);

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const keyHash = hashApiKey(apiKey);
    const storedApiKey = db.prepare(`
      SELECT *
      FROM api_keys
      WHERE key_hash = ? AND is_active = 1
    `).get(keyHash);

    if (!storedApiKey) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    db.prepare(`
      UPDATE api_keys
      SET last_used_at = datetime('now')
      WHERE id = ?
    `).run(storedApiKey.id);

    req.apiKey = {
      id: storedApiKey.id,
      name: storedApiKey.name,
      keyPrefix: storedApiKey.key_prefix
    };
    req.auth = {
      type: 'api_key',
      apiKeyId: storedApiKey.id,
      apiKeyName: storedApiKey.name
    };

    next();
  } catch (error) {
    return res.status(500).json({ error: 'API key authentication error' });
  }
};

const authenticateAdminOrApiKey = (req, res, next) => {
  const bearerToken = parseBearerToken(req);

  if (bearerToken) {
    return authenticateToken(req, res, next);
  }

  return authenticateApiKey(req, res, next);
};

module.exports = {
  authenticateAdminOrApiKey,
  authenticateApiKey,
  authenticateToken
};
