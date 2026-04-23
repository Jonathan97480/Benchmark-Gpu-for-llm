const DEFAULT_CPU = {
  cores: 6,
  threads: 12,
  frequency: 4,
};

const QUANTIZATION_PROFILES = {
  INT4: { bytesPerParam: 0.5, memoryFactor: 1.225, speedFactor: 1.08 },
  'AWQ INT4': { bytesPerParam: 0.5, memoryFactor: 1.03, speedFactor: 1.16 },
  'GPTQ INT4': { bytesPerParam: 0.5, memoryFactor: 1.05, speedFactor: 1.12 },
  INT8: { bytesPerParam: 1, memoryFactor: 1.12, speedFactor: 0.82 },
  FP8: { bytesPerParam: 1, memoryFactor: 1.15, speedFactor: 0.9 },
  FP16: { bytesPerParam: 2, memoryFactor: 1.2, speedFactor: 0.62 },
  'Non spécifié': { bytesPerParam: 0.75, memoryFactor: 1.12, speedFactor: 0.92 },
};

const DECODE_TRAFFIC_MULTIPLIER = {
  INT4: 1.9,
  'AWQ INT4': 1.3,
  'GPTQ INT4': 1.38,
  INT8: 1.55,
  FP8: 1.2,
  FP16: 1,
  'Non spécifié': 1.4,
};

const BACKEND_PROFILES = {
  'llama.cpp': {
    kvCacheFactor: 1,
    runtimeMemoryFactor: 1,
    throughputFactor: 1,
    accelerationBase: 1,
  },
  'ollama': {
    kvCacheFactor: 1,
    runtimeMemoryFactor: 1,
    throughputFactor: 1,
    accelerationBase: 1,
  },
  'vllm': {
    kvCacheFactor: 0.52,
    runtimeMemoryFactor: 0.9,
    throughputFactor: 1,
    accelerationBase: 0.68,
  },
  'exllamav2': {
    kvCacheFactor: 0.72,
    runtimeMemoryFactor: 0.94,
    throughputFactor: 1,
    accelerationBase: 0.6,
  },
  'tabbyapi': {
    kvCacheFactor: 0.72,
    runtimeMemoryFactor: 0.94,
    throughputFactor: 1,
    accelerationBase: 0.6,
  },
  'sglang': {
    kvCacheFactor: 0.58,
    runtimeMemoryFactor: 0.92,
    throughputFactor: 1,
    accelerationBase: 0.66,
  },
  'autre': {
    kvCacheFactor: 1,
    runtimeMemoryFactor: 1,
    throughputFactor: 1,
    accelerationBase: 1,
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundValue(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(3));
}

function normalizeMeasurementType(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (['decode', 'prefill', 'mixed'].includes(normalized)) {
    return normalized;
  }

  return null;
}

function normalizeBackendKey(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized.includes('llama.cpp')) {
    return 'llama.cpp';
  }

  if (normalized.includes('ollama')) {
    return 'ollama';
  }

  if (normalized.includes('vllm')) {
    return 'vllm';
  }

  if (normalized.includes('exllamav2')) {
    return 'exllamav2';
  }

  if (normalized.includes('tabbyapi')) {
    return 'tabbyapi';
  }

  if (normalized.includes('sglang')) {
    return 'sglang';
  }

  if (normalized.includes('autre')) {
    return 'autre';
  }

  return 'llama.cpp';
}

function getBackendProfile(benchmark) {
  return BACKEND_PROFILES[normalizeBackendKey(benchmark?.inference_backend)] || BACKEND_PROFILES['llama.cpp'];
}

function getKvCachePrecisionFactor(value) {
  const normalized = String(value || '').trim().toUpperCase();

  if (normalized === 'FP8' || normalized === 'INT8') {
    return 0.5;
  }

  if (normalized === 'INT4') {
    return 0.25;
  }

  return 1;
}

function isDecodeLikeBenchmark(benchmark) {
  const measurementType = normalizeMeasurementType(benchmark.measurement_type);
  return !measurementType || measurementType === 'decode' || measurementType === 'mixed';
}

function isSingleStreamBenchmark(benchmark) {
  const batchSize = Number(benchmark.batch_size) || 1;
  const concurrency = Number(benchmark.concurrency) || 1;
  return batchSize <= 1 && concurrency <= 1;
}

function selectComparableBenchmarks(benchmarks) {
  const decodeLike = benchmarks.filter(isDecodeLikeBenchmark);
  const decodeSource = decodeLike.length > 0 ? decodeLike : benchmarks;
  const singleStream = decodeSource.filter(isSingleStreamBenchmark);

  return singleStream.length > 0 ? singleStream : decodeSource;
}

function getActiveParamsBillions(model) {
  return Math.max(1, Number(model.params_billions) || 7);
}

function getTotalParamsBillions(model) {
  return Math.max(1, Number(model.total_params_billions) || Number(model.params_billions) || 7);
}

function computeContextPenalty(contextSize) {
  return Math.max(0.72, Math.pow(8192 / Math.max(8192, contextSize), 0.18));
}

function computeCpuPenalty(cpu = DEFAULT_CPU) {
  const cpuBaseScore = DEFAULT_CPU.threads * DEFAULT_CPU.frequency;
  const cpuScore = Math.max(cpu.threads, cpu.cores) * cpu.frequency;

  return Math.max(0.68, Math.min(1.24, cpuScore / cpuBaseScore));
}

function computeMultiGpuScaling(gpuCount) {
  if (gpuCount <= 1) {
    return 1;
  }

  return 1 + (gpuCount - 1) * 0.82;
}

function computeDecodeCalibrationFactor(gpu) {
  const bandwidth = Math.max(120, Number(gpu.bandwidth) || 180);
  const normalizedBandwidth = bandwidth / 360;

  return 2.01 * Math.pow(normalizedBandwidth, -0.18);
}

function computeVramPenalty(gpu, model, quantizationKey) {
  const activeParamsBillions = getActiveParamsBillions(model);
  const profile = QUANTIZATION_PROFILES[quantizationKey] || QUANTIZATION_PROFILES['Non spécifié'];
  const decodeTraffic =
    DECODE_TRAFFIC_MULTIPLIER[quantizationKey] || DECODE_TRAFFIC_MULTIPLIER['Non spécifié'];
  const effectiveWeightsGb =
    activeParamsBillions * profile.bytesPerParam * profile.memoryFactor * decodeTraffic;
  const availableVramGb = Math.max(0, Number(gpu.vram) || 0);
  const requiredWorkingSetGb = Math.max(8, effectiveWeightsGb * 0.85);

  if (availableVramGb >= requiredWorkingSetGb) {
    return 1;
  }

  return Math.max(0.2, availableVramGb / requiredWorkingSetGb);
}

function estimateModelMemoryGb(model, quantizationKey) {
  const totalParamsBillions = getTotalParamsBillions(model);
  const profile = QUANTIZATION_PROFILES[quantizationKey] || QUANTIZATION_PROFILES['Non spécifié'];

  return totalParamsBillions * profile.bytesPerParam * profile.memoryFactor;
}

function estimateBaseKvCacheGb(model, quantizationKey, contextSize, kvCachePrecision) {
  const totalParamsBillions = getTotalParamsBillions(model);
  const profile = QUANTIZATION_PROFILES[quantizationKey] || QUANTIZATION_PROFILES['Non spécifié'];
  const kvByteFactor =
    (profile.bytesPerParam <= 1 ? 1 : profile.bytesPerParam / 2) *
    getKvCachePrecisionFactor(kvCachePrecision);

  return (
    6.7 *
    Math.pow(totalParamsBillions, 0.42) *
    (Math.max(1, contextSize) / 131072) *
    kvByteFactor
  );
}

function estimateBaseRuntimeMemoryGb(model) {
  const totalParamsBillions = getTotalParamsBillions(model);
  const activeParamsBillions = getActiveParamsBillions(model);

  return Math.max(1.5, Math.max(activeParamsBillions, totalParamsBillions * 0.25) * 0.04);
}

function estimateMemoryRequirementGb(model, quantizationKey, contextSize, profile = {}, benchmark = null) {
  const backendProfile = getBackendProfile(benchmark);
  const runtimeMemoryGb = Math.max(
    profile.runtimeMemoryMinimum ?? estimateBaseRuntimeMemoryGb(model),
    estimateBaseRuntimeMemoryGb(model) *
      backendProfile.runtimeMemoryFactor *
      (profile.runtimeMemoryMultiplier ?? 1)
  );
  const kvCacheGb =
    estimateBaseKvCacheGb(
      model,
      quantizationKey,
      contextSize,
      benchmark?.kv_cache_precision || benchmark?.precision
    ) *
    backendProfile.kvCacheFactor *
    (profile.kvCacheMultiplier ?? 1);
  const modelMemoryGb = estimateModelMemoryGb(model, quantizationKey);

  return {
    modelMemoryGb,
    kvCacheGb,
    runtimeMemoryGb,
    totalMemoryGb: modelMemoryGb + kvCacheGb + runtimeMemoryGb,
  };
}

function computeViabilityPenalty(totalMemoryGb, gpuVramGb) {
  if (totalMemoryGb > gpuVramGb && gpuVramGb > 0) {
    return Math.max(0.15, gpuVramGb / totalMemoryGb);
  }

  return 1;
}

function normalizeQuantization(precision) {
  const normalized = String(precision || '').toUpperCase();

  if (normalized.includes('AWQ')) {
    return 'AWQ INT4';
  }

  if (normalized.includes('GPTQ')) {
    return 'GPTQ INT4';
  }

  if (normalized.includes('INT4') || normalized.includes('Q4') || normalized === '4') {
    return 'INT4';
  }

  if (normalized.includes('INT8') || normalized.includes('Q8') || normalized === '8') {
    return 'INT8';
  }

  if (normalized.includes('FP8')) {
    return 'FP8';
  }

  if (normalized.includes('FP16') || normalized.includes('F16')) {
    return 'FP16';
  }

  return 'Non spécifié';
}

function estimateGenericTokensPerSecond({ model, gpu, benchmark }) {
  const quantizationKey = normalizeQuantization(benchmark.precision);
  const contextSize = Number(benchmark.context_size) || 8192;
  const gpuCount = Math.max(1, Number(benchmark.gpu_count) || 1);
  const bandwidth = Math.max(120, Number(gpu.bandwidth) || 180);
  const score = Math.max(35, Number(gpu.score) || 50);
  const backendProfile = getBackendProfile(benchmark);
  const profile = QUANTIZATION_PROFILES[quantizationKey] || QUANTIZATION_PROFILES['Non spécifié'];
  const decodeTraffic =
    DECODE_TRAFFIC_MULTIPLIER[quantizationKey] || DECODE_TRAFFIC_MULTIPLIER['Non spécifié'];
  const activeParamsBillions = getActiveParamsBillions(model);
  const effectiveWeightsGb =
    activeParamsBillions * profile.bytesPerParam * profile.memoryFactor * decodeTraffic;
  const decodeEfficiency = Math.max(0.42, Math.min(0.72, 0.46 + (score - 50) / 100));
  const contextPenalty = computeContextPenalty(contextSize);
  const vramPenalty = computeVramPenalty(gpu, model, quantizationKey);
  const memoryRequiredGb = estimateMemoryRequirementGb(model, quantizationKey, contextSize, {}, benchmark).totalMemoryGb;
  const totalVramGb = Math.max(0, Number(gpu.vram) || 0) * gpuCount;
  const viabilityPenalty = computeViabilityPenalty(memoryRequiredGb, totalVramGb);
  const modelFactor = Math.max(1, Math.pow(getTotalParamsBillions(model) / 8, 0.36));
  const parallelFactor = 1 + (gpuCount - 1) * 0.16;
  const quantFactor =
    quantizationKey === 'AWQ INT4'
      ? 1.12
      : quantizationKey === 'GPTQ INT4'
        ? 1.08
        : quantizationKey === 'INT4'
          ? 1.02
          : 1;
  const backendAcceleration =
    normalizeBackendKey(benchmark.inference_backend) === 'llama.cpp' ||
    normalizeBackendKey(benchmark.inference_backend) === 'ollama' ||
    gpuCount <= 1
      ? 1
      : backendProfile.accelerationBase * modelFactor * parallelFactor * quantFactor;

  return (
    ((bandwidth * decodeEfficiency) / Math.max(effectiveWeightsGb, 1)) *
    computeDecodeCalibrationFactor(gpu) *
    backendProfile.throughputFactor *
    backendAcceleration *
    profile.speedFactor *
    contextPenalty *
    vramPenalty *
    computeMultiGpuScaling(gpuCount) *
    computeCpuPenalty() *
    viabilityPenalty
  );
}

function median(values) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

function deriveThroughputMultiplier(model, benchmarks) {
  const ratios = selectComparableBenchmarks(benchmarks)
    .map((benchmark) => {
      const baseEstimate = estimateGenericTokensPerSecond({
        model,
        gpu: benchmark,
        benchmark,
      });
      const actual = Number(benchmark.tokens_per_second) || 0;

      if (!Number.isFinite(baseEstimate) || baseEstimate <= 0 || actual <= 0) {
        return null;
      }

      return actual / baseEstimate;
    })
    .filter((ratio) => ratio && Number.isFinite(ratio));

  if (ratios.length === 0) {
    return null;
  }

  return clamp(median(ratios), 0.1, 5);
}

function groupBenchmarksByContextTrack(benchmarks) {
  const grouped = new Map();

  for (const benchmark of benchmarks) {
    const contextSize = Number(benchmark.context_size) || 0;

    if (contextSize <= 0) {
      continue;
    }

    const key = [
      benchmark.gpu_id || benchmark.name || 'gpu',
      benchmark.gpu_count || 1,
      normalizeQuantization(benchmark.precision),
      normalizeBackendKey(benchmark.inference_backend),
      benchmark.kv_cache_precision || '',
    ].join('|');

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(benchmark);
  }

  return [...grouped.values()].filter((group) => group.length >= 2);
}

function deriveContextPenaltyCalibration(benchmarks) {
  const floorCandidates = [];
  const multiplierCandidates = [];

  for (const group of groupBenchmarksByContextTrack(selectComparableBenchmarks(benchmarks))) {
    const ordered = [...group].sort((a, b) => Number(a.context_size) - Number(b.context_size));
    const shortest = ordered[0];
    const longest = ordered[ordered.length - 1];

    if (!shortest || !longest || Number(shortest.context_size) === Number(longest.context_size)) {
      continue;
    }

    const shortTps = Number(shortest.tokens_per_second) || 0;
    const longTps = Number(longest.tokens_per_second) || 0;

    if (shortTps <= 0 || longTps <= 0) {
      continue;
    }

    const actualRatio = clamp(longTps / shortTps, 0.2, 1);
    const baseRatio =
      computeContextPenalty(Number(longest.context_size)) /
      computeContextPenalty(Number(shortest.context_size));

    floorCandidates.push(actualRatio);

    if (baseRatio > 0) {
      multiplierCandidates.push(clamp(actualRatio / baseRatio, 0.5, 1.8));
    }
  }

  const floor = median(floorCandidates);
  const multiplier = median(multiplierCandidates);

  return {
    analytical_context_penalty_floor: floor ? roundValue(clamp(floor, 0.45, 1)) : null,
    analytical_context_penalty_multiplier: multiplier ? roundValue(clamp(multiplier, 0.5, 1.8)) : null,
  };
}

function deriveMemoryCalibration(model, benchmarks, throughputMultiplier, contextCalibration) {
  const comparableBenchmarks = selectComparableBenchmarks(benchmarks);
  const telemetryGroups = groupBenchmarksByContextTrack(
    comparableBenchmarks.filter((benchmark) => Number(benchmark.vram_used_gb) > 0)
  );
  const telemetryKvMultipliers = [];
  const telemetryRuntimeMinimums = [];
  const telemetryRuntimeMultipliers = [];
  const healthyKvUpperBounds = [];
  const runtimeHeadrooms = [];

  for (const group of telemetryGroups) {
    const ordered = [...group].sort((a, b) => Number(a.context_size) - Number(b.context_size));
    const shortest = ordered[0];
    const longest = ordered[ordered.length - 1];
    const quantizationKey = normalizeQuantization(shortest.precision);
    const backendProfile = getBackendProfile(shortest);
    const modelMemoryGb = estimateModelMemoryGb(model, quantizationKey);
    const kvBaseShort =
      estimateBaseKvCacheGb(
        model,
        quantizationKey,
        Number(shortest.context_size) || 8192,
        shortest.kv_cache_precision || shortest.precision
      ) * backendProfile.kvCacheFactor;
    const kvBaseLong =
      estimateBaseKvCacheGb(
        model,
        quantizationKey,
        Number(longest.context_size) || 8192,
        longest.kv_cache_precision || longest.precision
      ) * backendProfile.kvCacheFactor;
    const observedShort = Number(shortest.vram_used_gb);
    const observedLong = Number(longest.vram_used_gb);
    const kvDelta = kvBaseLong - kvBaseShort;

    if (!Number.isFinite(observedShort) || !Number.isFinite(observedLong) || kvDelta <= 0) {
      continue;
    }

    const kvMultiplier = (observedLong - observedShort) / kvDelta;

    if (Number.isFinite(kvMultiplier) && kvMultiplier > 0) {
      telemetryKvMultipliers.push(clamp(kvMultiplier, 0.08, 1.6));

      const runtimeObserved =
        (observedShort - modelMemoryGb - kvBaseShort * kvMultiplier) /
        Math.max(backendProfile.runtimeMemoryFactor, 1e-6);

      if (Number.isFinite(runtimeObserved) && runtimeObserved > 0) {
        telemetryRuntimeMinimums.push(clamp(runtimeObserved, 0.5, 4));
        telemetryRuntimeMultipliers.push(
          clamp(runtimeObserved / Math.max(estimateBaseRuntimeMemoryGb(model), 1e-6), 0.5, 1.5)
        );
      }
    }
  }

  for (const benchmark of comparableBenchmarks) {
    const contextSize = Number(benchmark.context_size) || 8192;
    const quantizationKey = normalizeQuantization(benchmark.precision);
    const gpuCount = Math.max(1, Number(benchmark.gpu_count) || 1);
    const totalVramGb = Math.max(0, Number(benchmark.vram) || 0) * gpuCount;
    const baseEstimate = estimateGenericTokensPerSecond({ model, gpu: benchmark, benchmark });
    const actual = Number(benchmark.tokens_per_second) || 0;

    if (totalVramGb <= 0 || baseEstimate <= 0 || actual <= 0) {
      continue;
    }

    const baseContextPenalty = computeContextPenalty(contextSize);
    const adjustedContextPenalty = Math.max(
      contextCalibration.analytical_context_penalty_floor ?? 0.72,
      Math.min(
        1,
        baseContextPenalty * (contextCalibration.analytical_context_penalty_multiplier ?? 1)
      )
    );
    const contextAdjustmentFactor = adjustedContextPenalty / Math.max(baseContextPenalty, 1e-6);
    const normalizedPerformance = actual / Math.max(baseEstimate * throughputMultiplier * contextAdjustmentFactor, 1e-6);

    if (normalizedPerformance < 0.8) {
      continue;
    }

    const backendProfile = getBackendProfile(benchmark);
    const modelMemoryGb = estimateModelMemoryGb(model, quantizationKey);
    const kvBaseGb =
      estimateBaseKvCacheGb(
        model,
        quantizationKey,
        contextSize,
        benchmark.kv_cache_precision || benchmark.precision
      ) * backendProfile.kvCacheFactor;
    const runtimeBaseGb = estimateBaseRuntimeMemoryGb(model) * backendProfile.runtimeMemoryFactor;
    const availableForKvAndRuntime = totalVramGb - modelMemoryGb;

    if (availableForKvAndRuntime <= 0) {
      continue;
    }

    if (kvBaseGb > 0) {
      healthyKvUpperBounds.push((availableForKvAndRuntime - runtimeBaseGb) / kvBaseGb);
    }

    runtimeHeadrooms.push(availableForKvAndRuntime - kvBaseGb);
  }

  const kvUpperBound = healthyKvUpperBounds
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)[0];
  const runtimeHeadroom = runtimeHeadrooms
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)[0];
  const runtimeBase = estimateBaseRuntimeMemoryGb(model);

  const telemetryKv = median(telemetryKvMultipliers);
  const telemetryRuntimeMinimum = median(telemetryRuntimeMinimums);
  const telemetryRuntimeMultiplier = median(telemetryRuntimeMultipliers);

  const kvCacheMultiplier = telemetryKv
    ? roundValue(telemetryKv)
    : kvUpperBound
      ? roundValue(clamp(Math.min(1, kvUpperBound), 0.08, 1.6))
    : null;
  const runtimeMemoryMinimum = telemetryRuntimeMinimum
    ? roundValue(telemetryRuntimeMinimum)
    : runtimeHeadroom
      ? roundValue(clamp(Math.min(runtimeBase, runtimeHeadroom), 0.5, 4))
    : null;
  const runtimeMemoryMultiplier = telemetryRuntimeMultiplier
    ? roundValue(telemetryRuntimeMultiplier)
    : runtimeMemoryMinimum
      ? roundValue(clamp(runtimeMemoryMinimum / Math.max(runtimeBase, 1e-6), 0.5, 1.5))
    : null;

  return {
    analytical_kv_cache_multiplier: kvCacheMultiplier,
    analytical_runtime_memory_minimum: runtimeMemoryMinimum,
    analytical_runtime_memory_multiplier: runtimeMemoryMultiplier,
  };
}

function deriveOffloadPenaltyCalibration(model, benchmarks, throughputMultiplier, contextCalibration, memoryCalibration) {
  const candidates = [];

  for (const benchmark of selectComparableBenchmarks(benchmarks)) {
    const contextSize = Number(benchmark.context_size) || 8192;
    const quantizationKey = normalizeQuantization(benchmark.precision);
    const gpuCount = Math.max(1, Number(benchmark.gpu_count) || 1);
    const totalVramGb = Math.max(0, Number(benchmark.vram) || 0) * gpuCount;
    const baseEstimate = estimateGenericTokensPerSecond({ model, gpu: benchmark, benchmark });
    const actual = Number(benchmark.tokens_per_second) || 0;

    if (totalVramGb <= 0 || baseEstimate <= 0 || actual <= 0) {
      continue;
    }

    const memory = estimateMemoryRequirementGb(model, quantizationKey, contextSize, {
      kvCacheMultiplier: memoryCalibration.analytical_kv_cache_multiplier ?? 1,
      runtimeMemoryMultiplier: memoryCalibration.analytical_runtime_memory_multiplier ?? 1,
      runtimeMemoryMinimum:
        memoryCalibration.analytical_runtime_memory_minimum ?? estimateBaseRuntimeMemoryGb(model),
    }, benchmark);

    const hasRamTelemetry = Number(benchmark.ram_used_gb) > 0.5;

    if (memory.totalMemoryGb <= totalVramGb && !hasRamTelemetry) {
      continue;
    }

    const baseContextPenalty = computeContextPenalty(contextSize);
    const adjustedContextPenalty = Math.max(
      contextCalibration.analytical_context_penalty_floor ?? 0.72,
      Math.min(
        1,
        baseContextPenalty * (contextCalibration.analytical_context_penalty_multiplier ?? 1)
      )
    );
    const contextAdjustmentFactor = adjustedContextPenalty / Math.max(baseContextPenalty, 1e-6);
    const observedPenalty = clamp(
      actual / Math.max(baseEstimate * throughputMultiplier * contextAdjustmentFactor, 1e-6),
      0.12,
      1
    );
    const overflowRatio = (memory.totalMemoryGb - totalVramGb) / totalVramGb;

    if (overflowRatio <= 0 || observedPenalty >= 0.98) {
      continue;
    }

    const candidate = ((1 / observedPenalty) - 1) / Math.max(overflowRatio * 3.2, 1e-6);
    candidates.push(clamp(candidate, 0.5, 8));
  }

  const offloadPenaltyMultiplier = median(candidates);

  return {
    analytical_offload_penalty_multiplier: offloadPenaltyMultiplier
      ? roundValue(clamp(offloadPenaltyMultiplier, 0.5, 8))
      : null,
  };
}

function computeCalibrationFromBenchmarks(model, benchmarks) {
  const comparableBenchmarks = selectComparableBenchmarks(benchmarks);
  const throughputMultiplier = deriveThroughputMultiplier(model, comparableBenchmarks);

  if (!throughputMultiplier) {
    return null;
  }

  const contextCalibration = deriveContextPenaltyCalibration(comparableBenchmarks);
  const memoryCalibration = deriveMemoryCalibration(
    model,
    comparableBenchmarks,
    throughputMultiplier,
    contextCalibration
  );
  const offloadCalibration = deriveOffloadPenaltyCalibration(
    model,
    comparableBenchmarks,
    throughputMultiplier,
    contextCalibration,
    memoryCalibration
  );

  return {
    analytical_throughput_multiplier: roundValue(throughputMultiplier),
    analytical_kv_cache_multiplier: memoryCalibration.analytical_kv_cache_multiplier,
    analytical_runtime_memory_multiplier: memoryCalibration.analytical_runtime_memory_multiplier,
    analytical_runtime_memory_minimum: memoryCalibration.analytical_runtime_memory_minimum,
    analytical_context_penalty_multiplier: contextCalibration.analytical_context_penalty_multiplier,
    analytical_context_penalty_floor: contextCalibration.analytical_context_penalty_floor,
    analytical_offload_penalty_multiplier: offloadCalibration.analytical_offload_penalty_multiplier,
    benchmark_count: comparableBenchmarks.length,
  };
}

module.exports = {
  computeCalibrationFromBenchmarks,
};
