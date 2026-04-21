const express = require('express');
const router = express.Router();
const {
  adminExists,
  registerAdmin,
  login,
  refreshToken,
  logout
} = require('../controllers/auth.controller');
const {
  createApiKey,
  listApiKeys,
  revokeApiKey
} = require('../controllers/apiKeys.controller');
const {
  validateRegistration,
  validateLogin,
  validateApiKeyCreate
} = require('../middleware/validation.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/admin-exists', (req, res) => {
  res.json({ exists: adminExists() });
});

router.post('/register', validateRegistration, registerAdmin);

router.post('/login', validateLogin, login);

router.post('/refresh', refreshToken);

router.post('/logout', logout);

router.get('/api-keys', authenticateToken, listApiKeys);

router.post('/api-keys', authenticateToken, validateApiKeyCreate, createApiKey);

router.delete('/api-keys/:id', authenticateToken, revokeApiKey);

module.exports = router;
