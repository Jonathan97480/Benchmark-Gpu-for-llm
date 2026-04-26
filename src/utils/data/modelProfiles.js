import { MODEL_METADATA_ASSUMPTIONS } from "./assumptions.js";

export const DEFAULT_MODEL_ANALYTICAL_PROFILE = {
  kvCacheMultiplier: 1,
  runtimeMemoryMultiplier: 1,
  runtimeMemoryMinimum: 1.5,
  contextPenaltyMultiplier: 1,
  contextPenaltyFloor: 0.72,
  offloadPenaltyMultiplier: 1,
  throughputMultiplier: 1,
};

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
