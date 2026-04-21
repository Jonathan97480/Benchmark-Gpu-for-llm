const db = require('../../config/database');
const { generateApiKey, getApiKeyPrefix, hashApiKey } = require('../utils/apiKey.utils');

const listApiKeys = (req, res) => {
  try {
    const apiKeys = db.prepare(`
      SELECT id, name, key_prefix, is_active, last_used_at, created_at, created_by_user_id
      FROM api_keys
      ORDER BY created_at DESC, id DESC
    `).all();

    res.json({
      api_keys: apiKeys,
      total: apiKeys.length
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
};

const createApiKey = (req, res) => {
  try {
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getApiKeyPrefix(apiKey);

    const result = db.prepare(`
      INSERT INTO api_keys (name, key_hash, key_prefix, created_by_user_id, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(req.body.name, keyHash, keyPrefix, req.user?.userId || null);

    const storedKey = db.prepare(`
      SELECT id, name, key_prefix, is_active, last_used_at, created_at, created_by_user_id
      FROM api_keys
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'API key created successfully',
      api_key: apiKey,
      key: storedKey
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
};

const revokeApiKey = (req, res) => {
  try {
    const { id } = req.params;
    const existingKey = db.prepare('SELECT id FROM api_keys WHERE id = ?').get(id);

    if (!existingKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    db.prepare(`
      UPDATE api_keys
      SET is_active = 0
      WHERE id = ?
    `).run(id);

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
};

module.exports = {
  createApiKey,
  listApiKeys,
  revokeApiKey
};
