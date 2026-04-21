const crypto = require('crypto');

function generateApiKey() {
  const rawKey = crypto.randomBytes(24).toString('hex');
  return `gpublm_${rawKey}`;
}

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

function getApiKeyPrefix(apiKey) {
  return apiKey.slice(0, 12);
}

module.exports = {
  generateApiKey,
  getApiKeyPrefix,
  hashApiKey,
};
