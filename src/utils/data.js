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
      ...gpu,
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

    return {
      ...model,
      total_params_billions: model.total_params_billions || null,
      max_context_size: model.max_context_size || null,
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
