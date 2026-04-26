import {
  DEFAULT_BACKEND_KEY,
  KV_CACHE_BYTES_PER_ELEMENT,
  KV_CACHE_CONTEXT_BASE,
  QUANTIZATION_PROFILES,
} from "./constants.js";
import { getBackendProfile, getModelAnalyticalProfile, getActiveParamsBillions, getTotalParamsBillions } from "./profiles.js";

export function estimateModelMemoryGb(model, quantizationKey) {
  const totalParamsBillions = getTotalParamsBillions(model);
  const profile = QUANTIZATION_PROFILES[quantizationKey] || QUANTIZATION_PROFILES["Non spécifié"];

  return totalParamsBillions * profile.bytesPerParam * profile.memoryFactor;
}

export function estimateKvCacheGb(model, quantizationKey, effectiveContextSize, backendKey = DEFAULT_BACKEND_KEY) {
  const totalParamsBillions = getTotalParamsBillions(model);
  const kvBytes = KV_CACHE_BYTES_PER_ELEMENT[quantizationKey] || 2;
  const backendProfile = getBackendProfile(backendKey);
  const modelProfile = getModelAnalyticalProfile(model);

  return (
    6.7 *
    Math.pow(totalParamsBillions, 0.42) *
    (Math.max(1, effectiveContextSize) / KV_CACHE_CONTEXT_BASE) *
    (kvBytes / 2) *
    backendProfile.kvCacheFactor *
    modelProfile.kvCacheMultiplier
  );
}

export function estimateRuntimeMemoryGb(model, backendKey = DEFAULT_BACKEND_KEY) {
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

export function estimateMemoryRequirementGb(model, quantizationKey, effectiveContextSize, backendKey = DEFAULT_BACKEND_KEY) {
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
