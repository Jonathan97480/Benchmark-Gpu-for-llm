const path = require('path');
const { pathToFileURL } = require('url');
const db = require('../../config/database');

let calculatorModulePromise = null;
let dataModulePromise = null;

function getFrontendModuleUrl(relativePath) {
  return pathToFileURL(path.join(__dirname, '..', '..', '..', relativePath)).href;
}

function loadCalculatorModule() {
  if (!calculatorModulePromise) {
    calculatorModulePromise = import(getFrontendModuleUrl('src/utils/calculator.js'));
  }

  return calculatorModulePromise;
}

function loadDataModule() {
  if (!dataModulePromise) {
    dataModulePromise = import(getFrontendModuleUrl('src/utils/data.js'));
  }

  return dataModulePromise;
}

function readGpuById(gpuId) {
  if (gpuId === undefined || gpuId === null || gpuId === '') {
    return null;
  }

  return db.prepare('SELECT * FROM gpu_benchmarks WHERE id = ?').get(gpuId) || null;
}

function readModelById(modelId) {
  if (modelId === undefined || modelId === null || modelId === '') {
    return null;
  }

  return db.prepare('SELECT * FROM llm_models WHERE id = ?').get(modelId) || null;
}

async function computeCalculatorEstimate(payload = {}) {
  const calculatorModule = await loadCalculatorModule();
  const dataModule = await loadDataModule();
  const modelSource = readModelById(payload.modelId) || payload.model || null;
  const gpuSource = readGpuById(payload.gpuId) || payload.gpu || null;

  if (!modelSource) {
    const error = new Error('Model not found for calculator estimate');
    error.status = 404;
    throw error;
  }

  if (!gpuSource) {
    const error = new Error('GPU not found for calculator estimate');
    error.status = 404;
    throw error;
  }

  const {
    DEFAULT_CPU,
    DEFAULT_RAM_GB,
    computeEstimate,
    getEffectiveContextSize,
    getRequestedContextSize,
  } = calculatorModule;
  const { normalizeGpuMetadata, normalizeModelMetadata } = dataModule;
  const normalizedModel = normalizeModelMetadata(modelSource);
  const normalizedGpu = normalizeGpuMetadata(gpuSource);
  const requestedContextSize = getRequestedContextSize(payload.requestedContextSize, normalizedModel);
  const effectiveContextSize = getEffectiveContextSize(requestedContextSize, normalizedModel);

  return computeEstimate({
    model: normalizedModel,
    gpu: normalizedGpu,
    cpu: {
      cores: Number(payload.cpu?.cores) || DEFAULT_CPU.cores,
      threads: Number(payload.cpu?.threads) || DEFAULT_CPU.threads,
      frequency: Number(payload.cpu?.frequency) || DEFAULT_CPU.frequency,
    },
    ramGb: Number(payload.ramGb) || DEFAULT_RAM_GB,
    requestedContextSize,
    effectiveContextSize,
    selectedQuantizationKey: payload.selectedQuantizationKey,
    selectedBackendKey: payload.selectedBackendKey,
    selectedGpuCount: Number(payload.selectedGpuCount) || 1,
  });
}

module.exports = {
  computeCalculatorEstimate,
};
