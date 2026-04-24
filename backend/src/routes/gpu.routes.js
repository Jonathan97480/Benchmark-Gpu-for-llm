const express = require('express');
const router = express.Router();
const {
  getAllGPUs,
  getPublicBenchmarkDataset,
  getGPUById,
  getGpuPriceHistory,
  createGpuPriceHistoryEntry,
  updateGpuPriceHistoryEntry,
  deleteGpuPriceHistoryEntry,
  createGPU,
  updateGPU,
  deleteGPU
} = require('../controllers/gpu.controller');
const { authenticateAdminOrApiKey } = require('../middleware/auth.middleware');
const { validateGPU, validateGpuPriceHistory } = require('../middleware/validation.middleware');
const {
  createBenchmarkResult,
  updateBenchmarkResult,
  deleteBenchmarkResult
} = require('../controllers/benchmark.controller');
const { validateBenchmarkResult } = require('../middleware/validation.middleware');

router.get('/', getAllGPUs);

router.get('/public-dataset', getPublicBenchmarkDataset);
router.get('/:id/price-history', getGpuPriceHistory);
router.post('/:id/price-history', authenticateAdminOrApiKey, validateGpuPriceHistory, createGpuPriceHistoryEntry);
router.put('/:id/price-history/:history_id', authenticateAdminOrApiKey, validateGpuPriceHistory, updateGpuPriceHistoryEntry);
router.delete('/:id/price-history/:history_id', authenticateAdminOrApiKey, deleteGpuPriceHistoryEntry);

router.get('/:id', getGPUById);

router.post('/', authenticateAdminOrApiKey, validateGPU, createGPU);

router.put('/:id', authenticateAdminOrApiKey, validateGPU, updateGPU);

router.delete('/:id', authenticateAdminOrApiKey, deleteGPU);

router.post('/:gpu_id/benchmark', authenticateAdminOrApiKey, validateBenchmarkResult, createBenchmarkResult);

router.put('/:gpu_id/benchmark/:result_id', authenticateAdminOrApiKey, validateBenchmarkResult, updateBenchmarkResult);

router.delete('/:gpu_id/benchmark/:result_id', authenticateAdminOrApiKey, deleteBenchmarkResult);

module.exports = router;
