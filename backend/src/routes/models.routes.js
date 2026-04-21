const express = require('express');
const router = express.Router();
const {
  getAllModels,
  getModelById,
  createModel,
  updateModel,
  deleteModel
} = require('../controllers/models.controller');
const { authenticateAdminOrApiKey } = require('../middleware/auth.middleware');
const { validateLLMModel } = require('../middleware/validation.middleware');

router.get('/', getAllModels);

router.get('/:id', getModelById);

router.post('/', authenticateAdminOrApiKey, validateLLMModel, createModel);

router.put('/:id', authenticateAdminOrApiKey, validateLLMModel, updateModel);

router.delete('/:id', authenticateAdminOrApiKey, deleteModel);

module.exports = router;
