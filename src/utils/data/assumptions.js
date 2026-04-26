export const GPU_METADATA_ASSUMPTIONS = {
  "Radeon AI PRO R9700": {
    bandwidth: 960,
    analyticalNotes: [
      "La bande passante etait absente du seed; une valeur conservative de 960 Go/s a ete retenue pour le simulateur analytique.",
    ],
  },
};

export const MODEL_METADATA_ASSUMPTIONS = {
  "Gemma 4 26B (MoE)": {
    params_billions: 4,
    total_params_billions: 26,
    max_context_size: 262144,
    analyticalNotes: [
      "Hypothese MoE: environ 4B de parametres actifs pour 26B charges en memoire, d'apres Data.md.",
      "Le contexte maximal Gemma 4 est harmonise a 256k tokens pour le simulateur analytique.",
    ],
  },
  "Gemma 4 26B-A4B (MoE)": {
    params_billions: 4,
    total_params_billions: 26,
    max_context_size: 262144,
    analyticalNotes: [
      "Hypothese MoE: 4B actifs pour 26B charges en memoire.",
      "Le contexte maximal Gemma 4 est harmonise a 256k tokens pour le simulateur analytique.",
    ],
  },
  "Gemma 4 31B": {
    params_billions: 31,
    total_params_billions: 31,
    max_context_size: 262144,
    analyticalNotes: [
      "Le contexte maximal Gemma 4 est harmonise a 256k tokens pour le simulateur analytique.",
    ],
  },
  "Gemma 4 E4B": {
    params_billions: 4,
    total_params_billions: 8,
    max_context_size: 262144,
    analyticalNotes: [
      "Hypothese edge: 4B actifs pour 8B charges en memoire.",
      "Le contexte maximal Gemma 4 est harmonise a 256k tokens pour le simulateur analytique.",
    ],
  },
  "Gemma 4 E2B": {
    params_billions: 2,
    total_params_billions: 2,
    max_context_size: 262144,
    analyticalNotes: [
      "Le contexte maximal Gemma 4 est harmonise a 256k tokens pour le simulateur analytique.",
    ],
  },
  "Qwen 3.5-35B (MoE)": {
    analyticalNotes: [
      "Hypothese MoE conservative: faute de donnees d'experts actifs dans le dataset, le simulateur traite 35B actifs et 35B totaux.",
    ],
  },
  "DeepSeek R1 671B": {
    analyticalNotes: [
      "Hypothese MoE conservative: faute de decomposition active/totale dans le dataset, le simulateur traite 671B actifs et 671B totaux.",
    ],
  },
  "Qwen3 MoE 235B": {
    analyticalNotes: [
      "Hypothese MoE conservative: faute de decomposition active/totale dans le dataset, le simulateur traite 235B actifs et 235B totaux.",
    ],
  },
  "Qwen3.5-9B": {
    analyticalProfile: {
      kvCacheMultiplier: 0.08,
      runtimeMemoryMultiplier: 0.95,
      runtimeMemoryMinimum: 0.9,
      contextPenaltyMultiplier: 1.29,
      contextPenaltyFloor: 1,
      offloadPenaltyMultiplier: 0.75,
      throughputMultiplier: 1.62,
    },
  },
  "GLM-4.6V-Flash": {
    analyticalProfile: {
      kvCacheMultiplier: 0.14,
      runtimeMemoryMultiplier: 1,
      runtimeMemoryMinimum: 1.1,
      contextPenaltyMultiplier: 1.04,
      contextPenaltyFloor: 0.84,
      offloadPenaltyMultiplier: 1.08,
      throughputMultiplier: 1.12,
    },
  },
  "Nemotron Nano 12B v2": {
    analyticalProfile: {
      kvCacheMultiplier: 0.2,
      runtimeMemoryMultiplier: 1,
      runtimeMemoryMinimum: 1.2,
      contextPenaltyMultiplier: 1,
      contextPenaltyFloor: 0.78,
      offloadPenaltyMultiplier: 1.7,
      throughputMultiplier: 0.92,
    },
  },
  "Gemma 3 12B": {
    analyticalProfile: {
      kvCacheMultiplier: 0.18,
      runtimeMemoryMultiplier: 1.02,
      runtimeMemoryMinimum: 1.2,
      contextPenaltyMultiplier: 0.92,
      contextPenaltyFloor: 0.72,
      offloadPenaltyMultiplier: 5.2,
      throughputMultiplier: 0.95,
    },
  },
  "Phi-4 14B": {
    analyticalProfile: {
      kvCacheMultiplier: 0.22,
      runtimeMemoryMultiplier: 1.05,
      runtimeMemoryMinimum: 1.25,
      contextPenaltyMultiplier: 0.88,
      contextPenaltyFloor: 0.66,
      offloadPenaltyMultiplier: 4.2,
      throughputMultiplier: 0.92,
    },
  },
};
