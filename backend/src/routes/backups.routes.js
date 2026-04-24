const express = require('express');
const {
  createSiteBackup,
  downloadBackup,
  getBackups,
} = require('../controllers/backups.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticateToken, getBackups);
router.post('/', authenticateToken, createSiteBackup);
router.get('/:file_name/download', authenticateToken, downloadBackup);

module.exports = router;
