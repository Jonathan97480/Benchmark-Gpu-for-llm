export const DEFAULT_CPU = {
  cores: 6,
  threads: 12,
  frequency: 4,
};

export const DEFAULT_RAM_GB = 32;

export const DEFAULT_QUANTIZATION_KEY = "INT4";
export const DEFAULT_BACKEND_KEY = "llama.cpp / Ollama";

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

export const KV_CACHE_BYTES_PER_ELEMENT = {
  INT4: 2,
  "AWQ INT4": 2,
  "GPTQ INT4": 2,
  INT8: 2,
  FP8: 1,
  FP16: 2,
  "Non spécifié": 2,
};

export const DECODE_TRAFFIC_MULTIPLIER = {
  INT4: 1.9,
  "AWQ INT4": 1.3,
  "GPTQ INT4": 1.38,
  INT8: 1.55,
  FP8: 1.2,
  FP16: 1,
  "Non spécifié": 1.4,
};

export const BACKEND_PROFILES = {
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

export const DEFAULT_BANDWIDTH_GBPS = 180;
export const MIN_BANDWIDTH_GBPS = 120;
export const DEFAULT_GPU_SCORE = 50;
export const MIN_GPU_SCORE = 35;
export const REFERENCE_CONTEXT_SIZE = 8192;
export const DEFAULT_CONTEXT_SIZE = 8192;
export const MAX_DEFAULT_CONTEXT_SIZE = 8192;
export const KV_CACHE_CONTEXT_BASE = 131072;
export const MEMORY_PRESSURE_PENALTY_FLOOR = 0.72;
export const RAM_PENALTY_FLOOR = 0.62;
export const CPU_PENALTY_FLOOR = 0.68;
export const CPU_PENALTY_CEILING = 1.24;
export const RAM_PENALTY_CEILING = 1.1;
export const VRAM_PENALTY_FLOOR = 0.2;
export const VIABILITY_PENALTY_FLOOR = 0.15;
export const OFFLOAD_PENALTY_FLOOR = 0.12;
export const HEADROOM_PENALTY_FLOOR = 0.58;
