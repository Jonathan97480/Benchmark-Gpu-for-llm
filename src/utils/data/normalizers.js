import { GPU_METADATA_ASSUMPTIONS, MODEL_METADATA_ASSUMPTIONS } from "./assumptions.js";

export const DEFAULT_MODEL_ANALYTICAL_PROFILE = {
  kvCacheMultiplier: 1,
  runtimeMemoryMultiplier: 1,
  runtimeMemoryMinimum: 1.5,
  contextPenaltyMultiplier: 1,
  contextPenaltyFloor: 0.72,
  offloadPenaltyMultiplier: 1,
  throughputMultiplier: 1,
};

function normalizeBenchmarkResult(result) {
  return {
    ...result,
    gpu_count: Number(result.gpu_count) || 1,
    precision: result.precision || null,
    tokens_per_second: Number(result.tokens_per_second) || 0,
    context_size: result.context_size || null,
  };
}

function getUniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function getBestBenchmark(benchmarks) {
  return [...benchmarks].sort((a, b) => b.tokens_per_second - a.tokens_per_second || a.id - b.id)[0] || null;
}

function getAverageTokens(benchmarks) {
  if (benchmarks.length === 0) {
    return null;
  }

  return benchmarks.reduce((sum, result) => sum + result.tokens_per_second, 0) / benchmarks.length;
}

export function pickAnalyticalProfileFromModel(model) {
  const profile = {
    kvCacheMultiplier: model?.analytical_kv_cache_multiplier,
    runtimeMemoryMultiplier: model?.analytical_runtime_memory_multiplier,
    runtimeMemoryMinimum: model?.analytical_runtime_memory_minimum,
    contextPenaltyMultiplier: model?.analytical_context_penalty_multiplier,
    contextPenaltyFloor: model?.analytical_context_penalty_floor,
    offloadPenaltyMultiplier: model?.analytical_offload_penalty_multiplier,
    throughputMultiplier: model?.analytical_throughput_multiplier,
  };

  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== undefined && value !== null)
  );
}

export function resolveModelAnalyticalProfile(model) {
  const assumptions = MODEL_METADATA_ASSUMPTIONS[model?.name] || {};

  return {
    ...DEFAULT_MODEL_ANALYTICAL_PROFILE,
    ...(assumptions.analyticalProfile || {}),
    ...pickAnalyticalProfileFromModel(model),
    ...(model?.analyticalProfile || {}),
  };
}

export function normalizeGpuMetadata(gpu) {
  const assumptions = GPU_METADATA_ASSUMPTIONS[gpu.name] || {};
  const vram = Math.max(1, Number(gpu.vram) || 0);
  const bandwidth = Math.max(0, Number(gpu.bandwidth) || Number(assumptions.bandwidth) || 0);
  const score = Math.max(0, Number(gpu.score) || 0);

  return {
    ...gpu,
    vram,
    bandwidth,
    score,
    analyticalAssumptions: assumptions.analyticalNotes || [],
  };
}

export function normalizeModelMetadata(model) {
  const assumptions = MODEL_METADATA_ASSUMPTIONS[model.name] || {};
  const paramsBillions = Math.max(
    1,
    Number(assumptions.params_billions) || Number(model.params_billions) || 1
  );
  const totalParamsBillions = Math.max(
    paramsBillions,
    Number(assumptions.total_params_billions) ||
      Number(model.total_params_billions) ||
      paramsBillions
  );
  const maxContextSize =
    Number(assumptions.max_context_size) ||
    Number(model.max_context_size) ||
    null;

  return {
    ...model,
    params_billions: paramsBillions,
    total_params_billions: totalParamsBillions,
    max_context_size: maxContextSize,
    analyticalAssumptions: assumptions.analyticalNotes || [],
    analyticalProfile: resolveModelAnalyticalProfile(model),
  };
}

function indexResultsByKey(benchmarkResults, key) {
  const indexedResults = new Map();

  for (const result of benchmarkResults) {
    if (!indexedResults.has(result[key])) {
      indexedResults.set(result[key], []);
    }

    indexedResults.get(result[key]).push(result);
  }

  return indexedResults;
}

export function normalizePublicDataset(rawDataset) {
  const benchmarkResults = (rawDataset.benchmark_results || []).map(normalizeBenchmarkResult);
  const resultsByGpu = indexResultsByKey(benchmarkResults, "gpu_id");
  const resultsByModel = indexResultsByKey(benchmarkResults, "llm_model_id");

  const gpus = (rawDataset.gpus || []).map((gpu) => {
    const gpuResults = resultsByGpu.get(gpu.id) || [];
    const bestBenchmark = getBestBenchmark(gpuResults);

    return {
      ...normalizeGpuMetadata(gpu),
      priceValue: gpu.price_value || 0,
      priceNewValue: gpu.price_new_value || 0,
      priceUsedValue: gpu.price_used_value || 0,
      benchmarkResults: gpuResults,
      coverageCount: gpuResults.length,
      averageTokens: getAverageTokens(gpuResults),
      bestTokens: bestBenchmark?.tokens_per_second || null,
      bestBenchmark,
      quantizations: getUniqueValues(gpuResults.map((result) => result.precision)),
      testedModelIds: [...new Set(gpuResults.map((result) => result.llm_model_id))],
    };
  });

  const models = (rawDataset.models || []).map((model) => {
    const modelResults = resultsByModel.get(model.id) || [];
    const normalizedModel = normalizeModelMetadata(model);

    return {
      ...normalizedModel,
      benchmarks: modelResults,
      testedGpuCount: modelResults.length,
      topBenchmark: getBestBenchmark(modelResults),
      quantizations: getUniqueValues(modelResults.map((result) => result.precision)),
    };
  });

  const expectedBenchmarkCount = gpus.length * models.length;

  return {
    gpus,
    models,
    benchmarkResults,
    totals: {
      gpus: gpus.length,
      models: models.length,
      benchmarkResults: benchmarkResults.length,
      expectedBenchmarkCount,
      coveragePercent:
        expectedBenchmarkCount > 0
          ? (benchmarkResults.length / expectedBenchmarkCount) * 100
          : 0,
    },
    allQuantizations: getUniqueValues(benchmarkResults.map((result) => result.precision)),
  };
}

export function normalizeCatalogTableDataset(rawDataset) {
  const models = (rawDataset.models || []).map((model) => normalizeModelMetadata(model));

  const gpus = (rawDataset.gpus || []).map((gpu) => {
    const gpuResults = (gpu.benchmark_results || []).map(normalizeBenchmarkResult);
    const bestBenchmark = getBestBenchmark(gpuResults);

    return {
      ...normalizeGpuMetadata(gpu),
      priceValue: gpu.price_value || 0,
      priceNewValue: gpu.price_new_value || 0,
      priceUsedValue: gpu.price_used_value || 0,
      benchmarkResults: gpuResults,
      coverageCount: Number(gpu.coverage_count) || gpuResults.length,
      averageTokens: getAverageTokens(gpuResults),
      bestTokens: bestBenchmark?.tokens_per_second || null,
      bestBenchmark,
      quantizations: getUniqueValues(gpuResults.map((result) => result.precision)),
      testedModelIds: [...new Set(gpuResults.map((result) => result.llm_model_id))],
    };
  });

  return { gpus, models };
}
