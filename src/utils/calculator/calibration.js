import { CALIBRATION } from "../calibrationProfiles.js";
import { DEFAULT_BANDWIDTH_GBPS, DEFAULT_GPU_SCORE, DECODE_TRAFFIC_MULTIPLIER, MIN_BANDWIDTH_GBPS, MIN_GPU_SCORE, QUANTIZATION_PROFILES } from "./constants.js";
import { computeModelAwareContextPenalty, computeVramPenalty } from "./penalties.js";
import { getBackendProfile, getModelAnalyticalProfile, getActiveParamsBillions, getTotalParamsBillions, isInt4Family } from "./profiles.js";

export function getCalibrationContext(model, gpu, quantizationKey, effectiveContextSize) {
  const modelName = String(model?.name || "").toLowerCase();
  const isLlama3Class8B = modelName.includes("llama") && modelName.includes("8b");
  const isShortPromptDecodeContext = effectiveContextSize <= 512;
  const isInt4Reference = quantizationKey === "INT4";
  const calibrationProfile = CALIBRATION[gpu?.name] || null;
  const isReferenceCase = Boolean(calibrationProfile && isLlama3Class8B && isInt4Reference && isShortPromptDecodeContext);

  return {
    isReferenceCase,
    expectedRange: isReferenceCase ? calibrationProfile : null,
    label: isReferenceCase ? calibrationProfile.label : null,
  };
}

export function computeDecodeCalibrationFactor(gpu) {
  const bandwidth = Math.max(MIN_BANDWIDTH_GBPS, Number(gpu?.bandwidth) || DEFAULT_BANDWIDTH_GBPS);
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
  const backendBase = backendKey === "vLLM" ? 0.68 : 0.6;

  return backendBase * modelFactor * parallelFactor * quantFactor;
}

export function getAnalyticalTokenBaseline(
  model,
  gpu,
  quantizationKey,
  effectiveContextSize,
  backendKey,
  gpuCount
) {
  const activeParamsBillions = getActiveParamsBillions(model);
  const bandwidth = Math.max(MIN_BANDWIDTH_GBPS, Number(gpu?.bandwidth) || DEFAULT_BANDWIDTH_GBPS);
  const score = Math.max(MIN_GPU_SCORE, Number(gpu?.score) || DEFAULT_GPU_SCORE);
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
