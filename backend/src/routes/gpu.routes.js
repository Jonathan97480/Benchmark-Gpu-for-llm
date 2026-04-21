const express = require('express');
const router = express.Router();
const {
  getAllGPUs,
  getPublicBenchmarkDataset,
  getGPUById,
  createGPU,
  updateGPU,
  deleteGPU
} = require('../controllers/gpu.controller');
const { authenticateAdminOrApiKey } = require('../middleware/auth.middleware');
const { validateGPU } = require('../middleware/validation.middleware');
const {
  createBenchmarkResult,
  updateBenchmarkResult,
  deleteBenchmarkResult
} = require('../controllers/benchmark.controller');
const { validateBenchmarkResult } = require('../middleware/validation.middleware');

router.get('/', getAllGPUs);

router.get('/public-dataset', getPublicBenchmarkDataset);

router.get('/:id', getGPUById);

router.post('/', authenticateAdminOrApiKey, validateGPU, createGPU);

router.put('/:id', authenticateAdminOrApiKey, validateGPU, updateGPU);

router.delete('/:id', authenticateAdminOrApiKey, deleteGPU);

router.post('/:gpu_id/benchmark', authenticateAdminOrApiKey, validateBenchmarkResult, createBenchmarkResult);

router.put('/:gpu_id/benchmark/:result_id', authenticateAdminOrApiKey, validateBenchmarkResult, updateBenchmarkResult);

router.delete('/:gpu_id/benchmark/:result_id', authenticateAdminOrApiKey, deleteBenchmarkResult);

module.exports = router;
