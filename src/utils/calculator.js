import { formatNumber } from "./formatters.js";
import { DEFAULT_MODEL_ANALYTICAL_PROFILE, resolveModelAnalyticalProfile } from "./data.js";

export const DEFAULT_CPU = {
  cores: 6,
  threads: 12,
  frequency: 4,
};

export const DEFAULT_RAM_GB = 32;

export const QUANTIZATION_PROFILES = {
  INT4: { bytesPerParam: 0.5, memoryFactor: 1.225, speedFactor: 1.08 },
  "AWQ INT4": { bytesPerParam: 0.5, memoryFactor: 1.03, speedFactor: 1.16 },
  "GPTQ INT4": { bytesPerParam: 0.5, memoryFactor: 1.05, speedFactor: 1.12 },
  INT8: { bytesPerParam: 1, memoryFactor: 1.12, speedFactor: 0.82 },
  FP8: { bytesPerParam: 1, memoryFactor: 1.15, speedFactor: 0.9 },
  FP16: { bytesPerParam: 2, memoryFactor: 1.2, speedFactor: 0.62 },
  "Non spécifié": { bytesPerParam: 0.75, memoryFactor: 1.12, speedFactor: 0.92 },
};

export const QUANTIZATION_OPTIONS = ["INT4", "AWQ INT4", "GPTQ INT4", "INT8", "FP8", "FP16", "Non spécifié"];
export const BACKEND_OPTIONS = ["llama.cpp / Ollama", "vLLM", "exllamav2 / tabbyAPI"];

const KV_CACHE_BYTES_PER_ELEMENT = {
  INT4: 2,
  "AWQ INT4": 2,
  "GPTQ INT4": 2,
  INT8: 2,
  FP8: 1,
  FP16: 2,
  "Non spécifié": 2,
};

const DECODE_TRAFFIC_MULTIPLIER = {
  INT4: 1.9,
  "AWQ INT4": 1.3,
  "GPTQ INT4": 1.38,
  INT8: 1.55,
  FP8: 1.2,
  FP16: 1,
  "Non spécifié": 1.4,
};

const BACKEND_PROFILES = {
  "llama.cpp / Ollama": {
    kvCacheFactor: 1,
    runtimeMemoryFactor: 1,
    throughputFactor: 1,
  },
  vLLM: {
    kvCacheFactor: 0.52,
    runtimeMemoryFactor: 0.9,
    throughputFactor: 1,
  },
  "exllamav2 / tabbyAPI": {
    kvCacheFactor: 0.72,
    runtimeMemoryFactor: 0.94,
    throughputFactor: 1,
  },
};

export function getActiveParamsBillions(model) {
  return Math.max(1, Number(model?.params_billions) || 7);
}

export function getTotalParamsBillions(model) {
  return Math.max(1, Number(model?.total_params_billions) || Number(model?.params_billions) || 7);
}

export function getDefaultRequestedContextSize(model) {
  if (model?.max_context_size) {
    return Math.min(8192, Number(model.max_context_size));
  }

  return 8192;
}

export function getRequestedContextSize(rawContextSize, model) {
  const preferred = Number(rawContextSize);

  if (Number.isFinite(preferred) && preferred > 0) {
    return preferred;
  }

  return getDefaultRequestedContextSize(model);
}

export function getEffectiveContextSize(requestedContextSize, model) {
  if (!model) {
    return 0;
  }

  if (model.max_context_size) {
    return Math.min(requestedContextSize, Number(model.max_context_size));
  }

  return requestedContextSize;
}

export function estimateModelMemoryGb(model, quantizationKey) {
  const totalParamsBillions = getTotalParamsBillions(model);
  const profile = QUANTIZATION_PROFILES[quantizationKey] || QUANTIZATION_PROFILES["Non spécifié"];

  return totalParamsBillions * profile.bytesPerParam * profile.memoryFactor;
}

function getBackendProfile(backendKey) {
  return BACKEND_PROFILES[backendKey] || BACKEND_PROFILES["llama.cpp / Ollama"];
}

function getModelAnalyticalProfile(model) {
  if (!model) {
    return DEFAULT_MODEL_ANALYTICAL_PROFILE;
  }

  return resolveModelAnalyticalProfile(model);
}

function isInt4Family(quantizationKey) {
  return ["INT4", "AWQ INT4", "GPTQ INT4"].includes(quantizationKey);
}

export function estimateKvCacheGb(model, quantizationKey, effectiveContextSize, backendKey = "llama.cpp / Ollama") {
  const totalParamsBillions = getTotalParamsBillions(model);
  const kvBytes = KV_CACHE_BYTES_PER_ELEMENT[quantizationKey] || 2;
  const backendProfile = getBackendProfile(backendKey);
  const modelProfile = getModelAnalyticalProfile(model);

  return (
    6.7 *
    Math.pow(totalParamsBillions, 0.42) *
    (Math.max(1, effectiveContextSize) / 131072) *
    (kvBytes / 2) *
    backendProfile.kvCacheFactor *
    modelProfile.kvCacheMultiplier
  );
}

export function estimateRuntimeMemoryGb(model, backendKey = "llama.cpp / Ollama") {
  const totalParamsBillions = getTotalParamsBillions(model);
  const activeParamsBillions = getActiveParamsBillions(model);
  const backendProfile = getBackendProfile(backendKey);
  const modelProfile = getModelAnalyticalProfile(model);

  return Math.max(
    modelProfile.runtimeMemoryMinimum,
    Math.max(activeParamsBillions, totalParamsBillions * 0.25) *
      0.04 *
      backendProfile.runtimeMemoryFactor *
      modelProfile.runtimeMemoryMultiplier
  );
}

export function estimateMemoryRequirementGb(model, quantizationKey, effectiveContextSize, backendKey = "llama.cpp / Ollama") {
  const modelMemoryGb = estimateModelMemoryGb(model, quantizationKey);
  const kvCacheGb = estimateKvCacheGb(model, quantizationKey, effectiveContextSize, backendKey);
  const runtimeMemoryGb = estimateRuntimeMemoryGb(model, backendKey);

  return {
    modelMemoryGb,
    kvCacheGb,
    runtimeMemoryGb,
    totalMemoryGb: modelMemoryGb + kvCacheGb + runtimeMemoryGb,
  };
}

export function computeContextPenalty(effectiveContextSize) {
  return Math.max(0.72, Math.pow(8192 / Math.max(8192, effectiveContextSize), 0.18));
}

export function computeModelAwareContextPenalty(model, effectiveContextSize) {
  const modelProfile = getModelAnalyticalProfile(model);
  return Math.max(
    modelProfile.contextPenaltyFloor,
    Math.min(1, computeContextPenalty(effectiveContextSize) * modelProfile.contextPenaltyMultiplier)
  );
}

export function computeRamPenalty(ramGb) {
  if (ramGb < 32) {
    return Math.max(0.62, ramGb / 32);
  }

  return Math.min(1.1, 1 + (ramGb - 32) / 128);
}

export function computeCpuPenalty(cpu) {
  const cpuBaseScore = DEFAULT_CPU.threads * DEFAULT_CPU.frequency;
  const cpuScore = Math.max(cpu.threads, cpu.cores) * cpu.frequency;

  return Math.max(0.68, Math.min(1.24, cpuScore / cpuBaseScore));
}

export function computeMultiGpuScaling(gpuCount) {
  if (gpuCount <= 1) {
    return 1;
  }

  return 1 + (gpuCount - 1) * 0.82;
}

export function computeVramPenalty(gpu, model, quantizationKey) {
  const activeParamsBillions = getActiveParamsBillions(model);
  const profile = QUANTIZATION_PROFILES[quantizationKey] || QUANTIZATION_PROFILES["Non spécifié"];
  const decodeTraffic =
    DECODE_TRAFFIC_MULTIPLIER[quantizationKey] || DECODE_TRAFFIC_MULTIPLIER["Non spécifié"];
  const effectiveWeightsGb =
    activeParamsBillions * profile.bytesPerParam * profile.memoryFactor * decodeTraffic;
  const availableVramGb = Math.max(0, Number(gpu?.vram) || 0);
  const requiredWorkingSetGb = Math.max(8, effectiveWeightsGb * 0.85);

  if (availableVramGb >= requiredWorkingSetGb) {
    return 1;
  }

  return Math.max(0.2, availableVramGb / requiredWorkingSetGb);
}

export function computeViabilityPenalty(totalMemoryGb, gpuVramGb) {
  if (totalMemoryGb > 0 && gpuVramGb > 0 && totalMemoryGb > gpuVramGb) {
    return Math.max(0.15, gpuVramGb / totalMemoryGb);
  }

  return 1;
}

export function computeOffloadPenalty({
  model,
  totalMemoryGb,
  gpuVramGb,
  backendKey,
}) {
  if (backendKey !== "llama.cpp / Ollama" || gpuVramGb <= 0 || totalMemoryGb <= gpuVramGb) {
    return 1;
  }

  const overflowRatio = (totalMemoryGb - gpuVramGb) / gpuVramGb;
  const modelProfile = getModelAnalyticalProfile(model);

  return Math.max(0.12, 1 / (1 + overflowRatio * 3.2 * modelProfile.offloadPenaltyMultiplier));
}

export function computeHeadroomPenalty({
  model,
  gpu,
  totalMemoryGb,
  backendKey,
  gpuCount,
}) {
  const vramGb = Math.max(0, Number(gpu?.vram) || 0);
  const totalParamsBillions = getTotalParamsBillions(model);

  if (
    backendKey !== "llama.cpp / Ollama" ||
    gpuCount !== 1 ||
    vramGb > 8 ||
    totalParamsBillions > 16 ||
    totalMemoryGb <= 0 ||
    totalMemoryGb >= vramGb
  ) {
    return 1;
  }

  const headroomRatio = (vramGb - totalMemoryGb) / vramGb;

  if (headroomRatio >= 0.22) {
    return 1;
  }

  return Math.max(0.58, Math.min(1, 0.45 + headroomRatio * 1.8));
}

export function getAnalyticalTokenBaseline(
  model,
  gpu,
  quantizationKey,
  effectiveContextSize,
  backendKey = "llama.cpp / Ollama",
  gpuCount = 1
) {
  const activeParamsBillions = getActiveParamsBillions(model);
  const bandwidth = Math.max(120, Number(gpu?.bandwidth) || 180);
  const score = Math.max(35, Number(gpu?.score) || 50);
  const profile = QUANTIZATION_PROFILES[quantizationKey] || QUANTIZATION_PROFILES["Non spécifié"];
  const backendProfile = getBackendProfile(backendKey);
  const modelProfile = getModelAnalyticalProfile(model);
  const decodeTraffic =
    DECODE_TRAFFIC_MULTIPLIER[quantizationKey] || DECODE_TRAFFIC_MULTIPLIER["Non spécifié"];
  const effectiveWeightsGb =
    activeParamsBillions * profile.bytesPerParam * profile.memoryFactor * decodeTraffic;
  const decodeEfficiency = Math.max(0.42, Math.min(0.72, 0.46 + (score - 50) / 100));
  const contextPenalty = computeModelAwareContextPenalty(model, effectiveContextSize);
  const vramPenalty = computeVramPenalty(gpu, model, quantizationKey);

  return Math.max(
    0.5,
    ((bandwidth * decodeEfficiency) / Math.max(effectiveWeightsGb, 1)) *
      computeDecodeCalibrationFactor(gpu) *
      computeBackendAccelerationFactor(model, quantizationKey, backendKey, gpuCount) *
      backendProfile.throughputFactor *
      modelProfile.throughputMultiplier *
      profile.speedFactor *
      contextPenalty *
      vramPenalty
  );
}

export function getCalibrationContext(model, quantizationKey, effectiveContextSize) {
  const modelName = String(model?.name || "").toLowerCase();
  const isLlama3Class8B =
    modelName.includes("llama") &&
    modelName.includes("8b");
  const isShortPromptDecodeContext = effectiveContextSize <= 512;
  const isInt4Reference = quantizationKey === "INT4";

  return {
    isReferenceCase: isLlama3Class8B && isInt4Reference && isShortPromptDecodeContext,
    label:
      isLlama3Class8B && isInt4Reference
        ? "Calibré sur Llama 3 8B Q4_K_M, prompt court, premiers tokens générés."
        : null,
  };
}

export function computeDecodeCalibrationFactor(gpu) {
  const bandwidth = Math.max(120, Number(gpu?.bandwidth) || 180);
  const normalizedBandwidth = bandwidth / 360;

  return 2.01 * Math.pow(normalizedBandwidth, -0.18);
}

export function computeBackendAccelerationFactor(model, quantizationKey, backendKey, gpuCount) {
  if (backendKey === "llama.cpp / Ollama" || gpuCount <= 1) {
    return 1;
  }

  const totalParamsBillions = getTotalParamsBillions(model);
  const modelFactor = Math.max(1, Math.pow(totalParamsBillions / 8, 0.36));
  const parallelFactor = 1 + (gpuCount - 1) * 0.16;
  const quantFactor =
    quantizationKey === "AWQ INT4"
      ? 1.12
      : quantizationKey === "GPTQ INT4"
        ? 1.08
        : isInt4Family(quantizationKey)
          ? 1.02
          : 1;
  const backendBase =
    backendKey === "vLLM"
      ? 0.68
      : 0.6;

  return backendBase * modelFactor * parallelFactor * quantFactor;
}

export function computeEstimate({
  model,
  gpu,
  cpu,
  ramGb,
  requestedContextSize,
  effectiveContextSize,
  selectedQuantizationKey,
  selectedBackendKey,
  selectedGpuCount,
}) {
  const quantizationKey = selectedQuantizationKey || "INT4";
  const backendKey = selectedBackendKey || "llama.cpp / Ollama";
  const gpuCount = Math.max(1, selectedGpuCount || 1);
  const gpuVramGb = (Number(gpu?.vram) || 0) * gpuCount;
  const memory = estimateMemoryRequirementGb(model, quantizationKey, effectiveContextSize, backendKey);
  const calibration = getCalibrationContext(model, quantizationKey, effectiveContextSize);
  const cpuFactor = computeCpuPenalty(cpu);
  const ramFactor = computeRamPenalty(ramGb);
  const multiGpuFactor = computeMultiGpuScaling(gpuCount);
  const viabilityPenalty = computeViabilityPenalty(memory.totalMemoryGb, gpuVramGb);
  const offloadPenalty = computeOffloadPenalty({
    model,
    totalMemoryGb: memory.totalMemoryGb,
    gpuVramGb,
    backendKey,
  });
  const headroomPenalty = computeHeadroomPenalty({
    model,
    gpu,
    totalMemoryGb: memory.totalMemoryGb,
    backendKey,
    gpuCount,
  });
  const warnings = [];

  if (model.max_context_size && requestedContextSize > model.max_context_size) {
    warnings.push(
      `Le contexte demandé dépasse le maximum déclaré du modèle (${formatNumber(model.max_context_size)} tokens).`
    );
  }

  if (gpuVramGb > 0 && memory.totalMemoryGb > gpuVramGb) {
    warnings.push(
      `La VRAM disponible semble insuffisante: besoin estimé ≈ ${formatNumber(memory.totalMemoryGb)} Go pour ${formatNumber(gpuVramGb)} Go disponibles.`
    );
  }

  if (ramGb < Math.max(16, memory.totalMemoryGb * 1.15)) {
    warnings.push(`La RAM système risque d'être limitante avec ${formatNumber(ramGb)} Go.`);
  }

  const estimatedTokensPerSecond =
    getAnalyticalTokenBaseline(model, gpu, quantizationKey, effectiveContextSize, backendKey, gpuCount) *
    multiGpuFactor *
    cpuFactor *
    ramFactor *
    offloadPenalty *
    headroomPenalty *
    viabilityPenalty;

  return {
    estimatedTokensPerSecond: Math.max(0, estimatedTokensPerSecond),
    confidence: "Estimation analytique",
    quantizationKey,
    backendKey,
    gpuCount,
    requestedContextSize,
    effectiveContextSize,
    memoryRequiredGb: memory.totalMemoryGb,
    memoryBreakdown: memory,
    penalties: {
      context: computeModelAwareContextPenalty(model, effectiveContextSize),
      ram: ramFactor,
      cpu: cpuFactor,
      multiGpu: multiGpuFactor,
      offload: offloadPenalty,
      headroom: headroomPenalty,
      viability: viabilityPenalty,
    },
    calibration,
    referenceLabel: "Estimation analytique, non issue d'un benchmark mesuré.",
    warnings,
    viable: warnings.every((warning) => !warning.includes("insuffisante")),
  };
}
