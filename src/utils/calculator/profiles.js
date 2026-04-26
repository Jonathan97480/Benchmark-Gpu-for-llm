import { DEFAULT_MODEL_ANALYTICAL_PROFILE, resolveModelAnalyticalProfile } from "../data/modelProfiles.js";
import {
  BACKEND_PROFILES,
  DEFAULT_BACKEND_KEY,
  DEFAULT_CONTEXT_SIZE,
  MAX_DEFAULT_CONTEXT_SIZE,
} from "./constants.js";

export function getBackendProfile(backendKey) {
  return BACKEND_PROFILES[backendKey] || BACKEND_PROFILES[DEFAULT_BACKEND_KEY];
}

export function getModelAnalyticalProfile(model) {
  if (!model) {
    return DEFAULT_MODEL_ANALYTICAL_PROFILE;
  }

  return resolveModelAnalyticalProfile(model);
}

export function isInt4Family(quantizationKey) {
  return ["INT4", "AWQ INT4", "GPTQ INT4"].includes(quantizationKey);
}

export function getActiveParamsBillions(model) {
  return Math.max(1, Number(model?.params_billions) || 7);
}

export function getTotalParamsBillions(model) {
  return Math.max(1, Number(model?.total_params_billions) || Number(model?.params_billions) || 7);
}

export function getDefaultRequestedContextSize(model) {
  if (model?.max_context_size) {
    return Math.min(MAX_DEFAULT_CONTEXT_SIZE, Number(model.max_context_size));
  }

  return DEFAULT_CONTEXT_SIZE;
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
