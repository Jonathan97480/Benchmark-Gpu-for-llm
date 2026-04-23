export function sortData(data, sort) {
  const order = sort.direction === "asc" ? 1 : -1;

  return [...data].sort((a, b) => {
    const aValue = a[sort.key];
    const bValue = b[sort.key];

    if (typeof aValue === "string") {
      return aValue.localeCompare(bValue) * order;
    }

    return ((aValue ?? 0) - (bValue ?? 0)) * order;
  });
}

const GPU_METADATA_ASSUMPTIONS = {
  "Radeon AI PRO R9700": {
    bandwidth: 960,
    analyticalNotes: [
      "La bande passante etait absente du seed; une valeur conservative de 960 Go/s a ete retenue pour le simulateur analytique.",
    ],
  },
};

const MODEL_METADATA_ASSUMPTIONS = {
  "Gemma 4 26B (MoE)": {
    params_billions: 4,
    total_params_billions: 26,
    max_context_size: 262144,
    analyticalNotes: [
      "Hypothese MoE: environ 4B de parametres actifs pour 26B charges en memoire, d'apres Data.md.",
      "Le contexte maximal Gemma 4 est harmonise a 256k tokens pour le simulateur analytique.",
    ],
  },
  "Gemma 4 26B-A4B (MoE)": {
    params_billions: 4,
    total_params_billions: 26,
    max_context_size: 262144,
    analyticalNotes: [
      "Hypothese MoE: 4B actifs pour 26B charges en memoire.",
      "Le contexte maximal Gemma 4 est harmonise a 256k tokens pour le simulateur analytique.",
    ],
  },
  "Gemma 4 31B": {
    params_billions: 31,
    total_params_billions: 31,
    max_context_size: 262144,
    analyticalNotes: [
      "Le contexte maximal Gemma 4 est harmonise a 256k tokens pour le simulateur analytique.",
    ],
  },
  "Gemma 4 E4B": {
    params_billions: 4,
    total_params_billions: 8,
    max_context_size: 262144,
    analyticalNotes: [
      "Hypothese edge: 4B actifs pour 8B charges en memoire.",
      "Le contexte maximal Gemma 4 est harmonise a 256k tokens pour le simulateur analytique.",
    ],
  },
  "Gemma 4 E2B": {
    params_billions: 2,
    total_params_billions: 2,
    max_context_size: 262144,
    analyticalNotes: [
      "Le contexte maximal Gemma 4 est harmonise a 256k tokens pour le simulateur analytique.",
    ],
  },
  "Qwen 3.5-35B (MoE)": {
    analyticalNotes: [
      "Hypothese MoE conservative: faute de donnees d'experts actifs dans le dataset, le simulateur traite 35B actifs et 35B totaux.",
    ],
  },
  "DeepSeek R1 671B": {
    analyticalNotes: [
      "Hypothese MoE conservative: faute de decomposition active/totale dans le dataset, le simulateur traite 671B actifs et 671B totaux.",
    ],
  },
  "Qwen3 MoE 235B": {
    analyticalNotes: [
      "Hypothese MoE conservative: faute de decomposition active/totale dans le dataset, le simulateur traite 235B actifs et 235B totaux.",
    ],
  },
  "Qwen3.5-9B": {
    analyticalProfile: {
      kvCacheMultiplier: 0.08,
      runtimeMemoryMultiplier: 0.95,
      runtimeMemoryMinimum: 0.9,
      contextPenaltyMultiplier: 1.29,
      contextPenaltyFloor: 1,
      offloadPenaltyMultiplier: 0.75,
      throughputMultiplier: 1.62,
    },
  },
  "GLM-4.6V-Flash": {
    analyticalProfile: {
      kvCacheMultiplier: 0.14,
      runtimeMemoryMultiplier: 1,
      runtimeMemoryMinimum: 1.1,
      contextPenaltyMultiplier: 1.04,
      contextPenaltyFloor: 0.84,
      offloadPenaltyMultiplier: 1.08,
      throughputMultiplier: 1.12,
    },
  },
  "Nemotron Nano 12B v2": {
    analyticalProfile: {
      kvCacheMultiplier: 0.2,
      runtimeMemoryMultiplier: 1,
      runtimeMemoryMinimum: 1.2,
      contextPenaltyMultiplier: 1,
      contextPenaltyFloor: 0.78,
      offloadPenaltyMultiplier: 1.7,
      throughputMultiplier: 0.92,
    },
  },
  "Gemma 3 12B": {
    analyticalProfile: {
      kvCacheMultiplier: 0.18,
      runtimeMemoryMultiplier: 1.02,
      runtimeMemoryMinimum: 1.2,
      contextPenaltyMultiplier: 0.92,
      contextPenaltyFloor: 0.72,
      offloadPenaltyMultiplier: 5.2,
      throughputMultiplier: 0.95,
    },
  },
  "Phi-4 14B": {
    analyticalProfile: {
      kvCacheMultiplier: 0.22,
      runtimeMemoryMultiplier: 1.05,
      runtimeMemoryMinimum: 1.25,
      contextPenaltyMultiplier: 0.88,
      contextPenaltyFloor: 0.66,
      offloadPenaltyMultiplier: 4.2,
      throughputMultiplier: 0.92,
    },
  },
};

export const DEFAULT_MODEL_ANALYTICAL_PROFILE = {
  kvCacheMultiplier: 1,
  runtimeMemoryMultiplier: 1,
  runtimeMemoryMinimum: 1.5,
  contextPenaltyMultiplier: 1,
  contextPenaltyFloor: 0.72,
  offloadPenaltyMultiplier: 1,
  throughputMultiplier: 1,
};

function pickAnalyticalProfileFromModel(model) {
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

function normalizeGpuMetadata(gpu) {
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

function normalizeModelMetadata(model) {
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

export function filterGpuCatalog(data, filters) {
  const normalizedSearch = filters.search.toLowerCase().trim();

  return data.filter((item) => {
    const matchesSearch = [
      item.name,
      item.vendor,
      item.architecture,
      item.tier,
      item.quantizations.join(" "),
      item.bestBenchmark?.model_name || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
    const matchesVendor = filters.vendor === "all" || item.vendor === filters.vendor;
    const matchesTier = filters.tier === "all" || item.tier === filters.tier;

    return matchesSearch && matchesVendor && matchesTier;
  });
}

export function getVendors(data) {
  return [...new Set(data.map((item) => item.vendor))];
}

export function normalizePublicDataset(rawDataset) {
  const benchmarkResults = (rawDataset.benchmark_results || []).map((result) => ({
    ...result,
    gpu_count: Number(result.gpu_count) || 1,
    precision: result.precision || null,
    tokens_per_second: Number(result.tokens_per_second) || 0,
    context_size: result.context_size || null,
  }));

  const resultsByGpu = new Map();
  const resultsByModel = new Map();

  benchmarkResults.forEach((result) => {
    if (!resultsByGpu.has(result.gpu_id)) {
      resultsByGpu.set(result.gpu_id, []);
    }
    resultsByGpu.get(result.gpu_id).push(result);

    if (!resultsByModel.has(result.llm_model_id)) {
      resultsByModel.set(result.llm_model_id, []);
    }
    resultsByModel.get(result.llm_model_id).push(result);
  });

  const gpus = (rawDataset.gpus || []).map((gpu) => {
    const gpuResults = resultsByGpu.get(gpu.id) || [];
    const bestBenchmark = [...gpuResults].sort(
      (a, b) => b.tokens_per_second - a.tokens_per_second
    )[0] || null;
    const averageTokens =
      gpuResults.length > 0
        ? gpuResults.reduce((sum, result) => sum + result.tokens_per_second, 0) / gpuResults.length
        : null;
    const quantizations = [...new Set(gpuResults.map((result) => result.precision).filter(Boolean))];

    return {
      ...normalizeGpuMetadata(gpu),
      priceValue: gpu.price_value || 0,
      priceNewValue: gpu.price_new_value || 0,
      priceUsedValue: gpu.price_used_value || 0,
      benchmarkResults: gpuResults,
      coverageCount: gpuResults.length,
      averageTokens,
      bestTokens: bestBenchmark?.tokens_per_second || null,
      bestBenchmark,
      quantizations,
      testedModelIds: [...new Set(gpuResults.map((result) => result.llm_model_id))],
    };
  });

  const models = (rawDataset.models || []).map((model) => {
    const modelResults = resultsByModel.get(model.id) || [];
    const topBenchmark = [...modelResults].sort(
      (a, b) => b.tokens_per_second - a.tokens_per_second
    )[0] || null;
    const quantizations = [...new Set(modelResults.map((result) => result.precision).filter(Boolean))];
    const normalizedModel = normalizeModelMetadata(model);

    return {
      ...normalizedModel,
      benchmarks: modelResults,
      testedGpuCount: modelResults.length,
      topBenchmark,
      quantizations,
    };
  });

  const allQuantizations = [...new Set(benchmarkResults.map((result) => result.precision).filter(Boolean))];
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
    allQuantizations,
  };
}

export function getTopAveragePerformance(data) {
  return [...data]
    .filter((gpu) => gpu.averageTokens)
    .sort((a, b) => b.averageTokens - a.averageTokens)
    .slice(0, 3);
}

export function getTopCoverage(data) {
  return [...data]
    .sort((a, b) => b.coverageCount - a.coverageCount || b.score - a.score)
    .slice(0, 3);
}

export function getBenchmarkForGpuAndModel(gpu, modelId) {
  return gpu.benchmarkResults.find((result) => result.llm_model_id === modelId) || null;
}
