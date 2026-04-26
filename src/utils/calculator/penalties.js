import {
  DECODE_TRAFFIC_MULTIPLIER,
  DEFAULT_BANDWIDTH_GBPS,
  DEFAULT_GPU_SCORE,
  DEFAULT_QUANTIZATION_KEY,
  HEADROOM_PENALTY_FLOOR,
  MEMORY_PRESSURE_PENALTY_FLOOR,
  OFFLOAD_PENALTY_FLOOR,
  QUANTIZATION_PROFILES,
  RAM_PENALTY_CEILING,
  RAM_PENALTY_FLOOR,
  REFERENCE_CONTEXT_SIZE,
  VIABILITY_PENALTY_FLOOR,
  VRAM_PENALTY_FLOOR,
} from "./constants.js";
import { getModelAnalyticalProfile, getActiveParamsBillions, getTotalParamsBillions } from "./profiles.js";

export function computeContextPenalty(effectiveContextSize) {
  return Math.max(
    MEMORY_PRESSURE_PENALTY_FLOOR,
    Math.pow(REFERENCE_CONTEXT_SIZE / Math.max(REFERENCE_CONTEXT_SIZE, effectiveContextSize), 0.18)
  );
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
    return Math.max(RAM_PENALTY_FLOOR, ramGb / 32);
  }

  return Math.min(RAM_PENALTY_CEILING, 1 + (ramGb - 32) / 128);
}

export function computeVramPenalty(gpu, model, quantizationKey = DEFAULT_QUANTIZATION_KEY) {
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

  return Math.max(VRAM_PENALTY_FLOOR, availableVramGb / requiredWorkingSetGb);
}

export function computeViabilityPenalty(totalMemoryGb, gpuVramGb) {
  if (totalMemoryGb > 0 && gpuVramGb > 0 && totalMemoryGb > gpuVramGb) {
    return Math.max(VIABILITY_PENALTY_FLOOR, gpuVramGb / totalMemoryGb);
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

  return Math.max(OFFLOAD_PENALTY_FLOOR, 1 / (1 + overflowRatio * 3.2 * modelProfile.offloadPenaltyMultiplier));
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

  return Math.max(HEADROOM_PENALTY_FLOOR, Math.min(1, 0.45 + headroomRatio * 1.8));
}
