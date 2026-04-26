import {
  DEFAULT_BACKEND_KEY,
  DEFAULT_CPU,
  DEFAULT_QUANTIZATION_KEY,
  DEFAULT_RAM_GB,
  BACKEND_OPTIONS,
  QUANTIZATION_OPTIONS,
  DECODE_TRAFFIC_MULTIPLIER,
  QUANTIZATION_PROFILES,
} from "./constants.js";
import { computeDecodeCalibrationFactor, computeBackendAccelerationFactor, getAnalyticalTokenBaseline, getCalibrationContext } from "./calibration.js";
import { computeCpuPenalty } from "./cpu.js";
import { estimateKvCacheGb, estimateMemoryRequirementGb, estimateModelMemoryGb, estimateRuntimeMemoryGb } from "./memory.js";
import { computeMultiGpuScaling } from "./multiGpu.js";
import { computeContextPenalty, computeHeadroomPenalty, computeModelAwareContextPenalty, computeOffloadPenalty, computeRamPenalty, computeViabilityPenalty, computeVramPenalty } from "./penalties.js";
import { getActiveParamsBillions, getBackendProfile, getDefaultRequestedContextSize, getEffectiveContextSize, getRequestedContextSize, getTotalParamsBillions } from "./profiles.js";
import { getEstimateWarnings } from "./warnings.js";

export {
  BACKEND_OPTIONS,
  DECODE_TRAFFIC_MULTIPLIER,
  DEFAULT_BACKEND_KEY,
  DEFAULT_CPU,
  DEFAULT_QUANTIZATION_KEY,
  DEFAULT_RAM_GB,
  QUANTIZATION_PROFILES,
  QUANTIZATION_OPTIONS,
  computeBackendAccelerationFactor,
  computeContextPenalty,
  computeCpuPenalty,
  computeDecodeCalibrationFactor,
  computeHeadroomPenalty,
  computeModelAwareContextPenalty,
  computeMultiGpuScaling,
  computeOffloadPenalty,
  computeRamPenalty,
  computeViabilityPenalty,
  computeVramPenalty,
  estimateKvCacheGb,
  estimateMemoryRequirementGb,
  estimateModelMemoryGb,
  estimateRuntimeMemoryGb,
  getActiveParamsBillions,
  getAnalyticalTokenBaseline,
  getBackendProfile,
  getCalibrationContext,
  getDefaultRequestedContextSize,
  getEffectiveContextSize,
  getRequestedContextSize,
  getTotalParamsBillions,
};

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
  const quantizationKey = selectedQuantizationKey || DEFAULT_QUANTIZATION_KEY;
  const backendKey = selectedBackendKey || DEFAULT_BACKEND_KEY;
  const gpuCount = Math.max(1, selectedGpuCount || 1);
  const gpuVramGb = (Number(gpu?.vram) || 0) * gpuCount;
  const memory = estimateMemoryRequirementGb(model, quantizationKey, effectiveContextSize, backendKey);
  const calibration = getCalibrationContext(model, gpu, quantizationKey, effectiveContextSize);
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
  const warnings = getEstimateWarnings({
    model,
    ramGb,
    requestedContextSize,
    gpuVramGb,
    memory,
  });

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
