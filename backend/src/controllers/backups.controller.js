const path = require('path');
const { sendError } = require('../utils/httpResponses.utils');
const {
  createBackup,
  listBackups,
  resolveBackupArchive,
} = require('../utils/backup.utils');

const getBackups = (req, res) => {
  try {
    res.json({
      backups: listBackups(),
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    return sendError(res, 500, 'Failed to list backups');
  }
};

const createSiteBackup = async (req, res) => {
  try {
    const backup = await createBackup({
      reason: req.body?.reason || 'manual',
      includeImages: req.body?.include_images !== false,
    });

    res.status(201).json({
      message: 'Backup created successfully',
      backup,
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    return sendError(res, 500, 'Failed to create backup');
  }
};

const downloadBackup = (req, res) => {
  try {
    const archivePath = resolveBackupArchive(req.params.file_name);
    res.download(archivePath, path.basename(archivePath));
  } catch (error) {
    const statusCode = error.message === 'Backup not found' ? 404 : 400;
    return sendError(res, statusCode, error.message);
  }
};

module.exports = {
  createSiteBackup,
  downloadBackup,
  getBackups,
};
