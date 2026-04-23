import { describe, expect, it } from "vitest";
import {
  computeEstimate,
  estimateMemoryRequirementGb,
  getActiveParamsBillions,
  getDefaultRequestedContextSize,
  getEffectiveContextSize,
  getRequestedContextSize,
} from "./calculator.js";

const gpu = {
  id: 1,
  name: "RTX 5090",
  vram: 32,
  bandwidth: 1792,
  score: 98,
};

const cpu = {
  cores: 8,
  threads: 16,
  frequency: 4.8,
};

describe("calculator", () => {
  it("conserve le contexte demandé quand il est inférieur au maximum du modèle", () => {
    const model = {
      id: 1,
      name: "Llama 3.1 8B",
      params_billions: 8,
      total_params_billions: 8,
      max_context_size: 128000,
    };

    const requestedContextSize = getRequestedContextSize("32768", model);
    const effectiveContextSize = getEffectiveContextSize(requestedContextSize, model);
    const estimate = computeEstimate({
      model,
      gpu,
      cpu,
      ramGb: 64,
      requestedContextSize,
      effectiveContextSize,
      selectedQuantizationKey: "INT4",
      selectedGpuCount: 1,
    });

    expect(requestedContextSize).toBe(32768);
    expect(effectiveContextSize).toBe(32768);
    expect(estimate.warnings).not.toContainEqual(expect.stringContaining("contexte demandé dépasse"));
  });

  it("affiche un avertissement quand le contexte demandé dépasse le maximum mais calcule avec le contexte clampé", () => {
    const model = {
      id: 2,
      name: "Gemma 4 31B",
      params_billions: 31,
      total_params_billions: 31,
      max_context_size: 262144,
    };

    const requestedContextSize = getRequestedContextSize("400000", model);
    const effectiveContextSize = getEffectiveContextSize(requestedContextSize, model);
    const estimate = computeEstimate({
      model,
      gpu,
      cpu,
      ramGb: 128,
      requestedContextSize,
      effectiveContextSize,
      selectedQuantizationKey: "INT4",
      selectedGpuCount: 1,
    });

    expect(requestedContextSize).toBe(400000);
    expect(effectiveContextSize).toBe(262144);
    expect(estimate.effectiveContextSize).toBe(262144);
    expect(estimate.warnings).toContainEqual(expect.stringContaining("contexte demandé dépasse"));
  });

  it("utilise les paramètres actifs pour le débit et les paramètres totaux pour la mémoire sur un modèle MoE", () => {
    const moeModel = {
      id: 3,
      name: "Gemma 4 26B-A4B (MoE)",
      params_billions: 4,
      total_params_billions: 26,
      max_context_size: 262144,
    };

    const denseEquivalent = {
      ...moeModel,
      name: "Dense 26B",
      params_billions: 26,
    };

    const effectiveContextSize = getDefaultRequestedContextSize(moeModel);
    const moeEstimate = computeEstimate({
      model: moeModel,
      gpu,
      cpu,
      ramGb: 128,
      requestedContextSize: effectiveContextSize,
      effectiveContextSize,
      selectedQuantizationKey: "INT4",
      selectedGpuCount: 1,
    });
    const denseEstimate = computeEstimate({
      model: denseEquivalent,
      gpu,
      cpu,
      ramGb: 128,
      requestedContextSize: effectiveContextSize,
      effectiveContextSize,
      selectedQuantizationKey: "INT4",
      selectedGpuCount: 1,
    });
    const memory = estimateMemoryRequirementGb(moeModel, "INT4", effectiveContextSize);

    expect(getActiveParamsBillions(moeModel)).toBe(4);
    expect(memory.modelMemoryGb).toBeGreaterThan(13);
    expect(moeEstimate.estimatedTokensPerSecond).toBeGreaterThan(denseEstimate.estimatedTokensPerSecond);
  });

  it("fait varier le débit selon la quantization", () => {
    const model = {
      id: 4,
      name: "DeepSeek R1 32B",
      params_billions: 32,
      total_params_billions: 32,
      max_context_size: 128000,
    };

    const requestedContextSize = getRequestedContextSize("", model);
    const effectiveContextSize = getEffectiveContextSize(requestedContextSize, model);
    const int4Estimate = computeEstimate({
      model,
      gpu,
      cpu,
      ramGb: 128,
      requestedContextSize,
      effectiveContextSize,
      selectedQuantizationKey: "INT4",
      selectedGpuCount: 1,
    });
    const fp16Estimate = computeEstimate({
      model,
      gpu,
      cpu,
      ramGb: 128,
      requestedContextSize,
      effectiveContextSize,
      selectedQuantizationKey: "FP16",
      selectedGpuCount: 1,
    });

    expect(int4Estimate.estimatedTokensPerSecond).toBeGreaterThan(fp16Estimate.estimatedTokensPerSecond);
    expect(int4Estimate.memoryRequiredGb).toBeLessThan(fp16Estimate.memoryRequiredGb);
  });

  it("reste dans la plage attendue sur RTX 3060 pour Llama 3 8B INT4 en prompt court", () => {
    const model = {
      id: 6,
      name: "Llama 3 8B",
      params_billions: 8,
      total_params_billions: 8,
      max_context_size: 128000,
    };
    const rtx3060 = {
      id: 6,
      name: "RTX 3060 12GB",
      vram: 12,
      bandwidth: 360,
      score: 58,
    };

    const estimate = computeEstimate({
      model,
      gpu: rtx3060,
      cpu: { cores: 6, threads: 12, frequency: 4 },
      ramGb: 32,
      requestedContextSize: 128,
      effectiveContextSize: 128,
      selectedQuantizationKey: "INT4",
      selectedGpuCount: 1,
    });

    expect(estimate.estimatedTokensPerSecond).toBeGreaterThanOrEqual(45);
    expect(estimate.estimatedTokensPerSecond).toBeLessThanOrEqual(55);
    expect(estimate.memoryBreakdown.modelMemoryGb).toBeGreaterThanOrEqual(4.8);
    expect(estimate.memoryBreakdown.modelMemoryGb).toBeLessThanOrEqual(5.0);
    expect(estimate.calibration.isReferenceCase).toBe(true);
  });

  it("reste dans la plage attendue sur RTX 4090 pour Llama 3 8B INT4 en prompt court", () => {
    const model = {
      id: 7,
      name: "Llama 3 8B",
      params_billions: 8,
      total_params_billions: 8,
      max_context_size: 128000,
    };
    const rtx4090 = {
      id: 7,
      name: "RTX 4090",
      vram: 24,
      bandwidth: 1008,
      score: 82,
    };

    const estimate = computeEstimate({
      model,
      gpu: rtx4090,
      cpu: { cores: 6, threads: 12, frequency: 4 },
      ramGb: 32,
      requestedContextSize: 128,
      effectiveContextSize: 128,
      selectedQuantizationKey: "INT4",
      selectedGpuCount: 1,
    });

    expect(estimate.estimatedTokensPerSecond).toBeGreaterThanOrEqual(140);
    expect(estimate.estimatedTokensPerSecond).toBeLessThanOrEqual(160);
  });

  it("réduit nettement le débit quand le contexte long gonfle le KV cache", () => {
    const model = {
      id: 8,
      name: "Llama 3 8B",
      params_billions: 8,
      total_params_billions: 8,
      max_context_size: 128000,
    };
    const rtx3060 = {
      id: 8,
      name: "RTX 3060 12GB",
      vram: 12,
      bandwidth: 360,
      score: 58,
    };

    const shortContextEstimate = computeEstimate({
      model,
      gpu: rtx3060,
      cpu: { cores: 6, threads: 12, frequency: 4 },
      ramGb: 32,
      requestedContextSize: 128,
      effectiveContextSize: 128,
      selectedQuantizationKey: "INT4",
      selectedGpuCount: 1,
    });
    const longContextEstimate = computeEstimate({
      model,
      gpu: rtx3060,
      cpu: { cores: 6, threads: 12, frequency: 4 },
      ramGb: 32,
      requestedContextSize: 32000,
      effectiveContextSize: 32000,
      selectedQuantizationKey: "INT4",
      selectedGpuCount: 1,
    });

    expect(longContextEstimate.estimatedTokensPerSecond).toBeLessThan(shortContextEstimate.estimatedTokensPerSecond * 0.82);
    expect(longContextEstimate.memoryRequiredGb).toBeGreaterThan(shortContextEstimate.memoryRequiredGb);
  });

  it("dégrade le résultat et remonte un avertissement quand la VRAM est insuffisante", () => {
    const tinyGpu = {
      id: 5,
      name: "RTX 4060",
      vram: 8,
      bandwidth: 272,
      score: 55,
    };
    const model = {
      id: 5,
      name: "Llama 3.1 70B",
      params_billions: 70,
      total_params_billions: 70,
      max_context_size: 128000,
    };

    const requestedContextSize = getRequestedContextSize("8192", model);
    const effectiveContextSize = getEffectiveContextSize(requestedContextSize, model);
    const estimate = computeEstimate({
      model,
      gpu: tinyGpu,
      cpu,
      ramGb: 32,
      requestedContextSize,
      effectiveContextSize,
      selectedQuantizationKey: "FP16",
      selectedGpuCount: 1,
    });

    expect(estimate.warnings).toContainEqual(expect.stringContaining("VRAM disponible semble insuffisante"));
    expect(estimate.penalties.viability).toBeLessThan(1);
  });

  it("colle au cas multi-GPU vLLM AWQ connu sur 4x RTX 3060 pour Llama 3.1 70B a 24k", () => {
    const model = {
      id: 9,
      name: "Llama 3.1 70B",
      params_billions: 70,
      total_params_billions: 70,
      max_context_size: 128000,
    };
    const rtx3060 = {
      id: 9,
      name: "RTX 3060 12GB",
      vram: 12,
      bandwidth: 360,
      score: 58,
    };

    const estimate = computeEstimate({
      model,
      gpu: rtx3060,
      cpu: { cores: 6, threads: 12, frequency: 4 },
      ramGb: 32,
      requestedContextSize: 24000,
      effectiveContextSize: 24000,
      selectedQuantizationKey: "AWQ INT4",
      selectedBackendKey: "vLLM",
      selectedGpuCount: 4,
    });

    expect(estimate.estimatedTokensPerSecond).toBeGreaterThanOrEqual(18);
    expect(estimate.estimatedTokensPerSecond).toBeLessThanOrEqual(24);
    expect(estimate.memoryRequiredGb).toBeLessThanOrEqual(48.5);
    expect(estimate.backendKey).toBe("vLLM");
    expect(estimate.quantizationKey).toBe("AWQ INT4");
  });

  it("colle au cas RTX 3060 Ti Ollama sur Llama 3.1 8B en 4-bit avec contexte suppose a 4k", () => {
    const model = {
      id: 10,
      name: "Llama 3.1 8B",
      params_billions: 8,
      total_params_billions: 8,
      max_context_size: 128000,
    };
    const rtx3060Ti = {
      id: 10,
      name: "RTX 3060 Ti",
      vram: 8,
      bandwidth: 448,
      score: 64,
    };

    const estimate = computeEstimate({
      model,
      gpu: rtx3060Ti,
      cpu: { cores: 24, threads: 48, frequency: 2.7 },
      ramGb: 128,
      requestedContextSize: 4096,
      effectiveContextSize: 4096,
      selectedQuantizationKey: "INT4",
      selectedBackendKey: "llama.cpp / Ollama",
      selectedGpuCount: 1,
    });

    expect(estimate.estimatedTokensPerSecond).toBeGreaterThanOrEqual(54);
    expect(estimate.estimatedTokensPerSecond).toBeLessThanOrEqual(61);
    expect(estimate.penalties.headroom).toBeLessThan(1);
  });

  it("garde Qwen3.5-9B proche de 55-58 t/s sur RTX 3070 entre 4k et 32k", () => {
    const gpu3070 = {
      id: 11,
      name: "RTX 3070",
      vram: 8,
      bandwidth: 385.7,
      score: 67,
    };
    const model = {
      id: 11,
      name: "Qwen3.5-9B",
      params_billions: 9,
      total_params_billions: 9,
      max_context_size: 262144,
    };

    const at4k = computeEstimate({
      model,
      gpu: gpu3070,
      cpu: { cores: 6, threads: 12, frequency: 3.7 },
      ramGb: 64,
      requestedContextSize: 4096,
      effectiveContextSize: 4096,
      selectedQuantizationKey: "INT4",
      selectedBackendKey: "llama.cpp / Ollama",
      selectedGpuCount: 1,
    });
    const at32k = computeEstimate({
      model,
      gpu: gpu3070,
      cpu: { cores: 6, threads: 12, frequency: 3.7 },
      ramGb: 64,
      requestedContextSize: 32768,
      effectiveContextSize: 32768,
      selectedQuantizationKey: "INT4",
      selectedBackendKey: "llama.cpp / Ollama",
      selectedGpuCount: 1,
    });

    expect(at4k.estimatedTokensPerSecond).toBeGreaterThanOrEqual(54);
    expect(at4k.estimatedTokensPerSecond).toBeLessThanOrEqual(59);
    expect(at32k.estimatedTokensPerSecond).toBeGreaterThanOrEqual(53.5);
    expect(at32k.estimatedTokensPerSecond).toBeLessThanOrEqual(59);
    expect(at32k.memoryRequiredGb).toBeLessThanOrEqual(7.2);
    expect(at32k.warnings).toHaveLength(0);
  });

  it("fait chuter Gemma 3 12B sur RTX 3070 quand le spill CPU apparait", () => {
    const estimate4k = computeEstimate({
      model: {
        id: 12,
        name: "Gemma 3 12B",
        params_billions: 12,
        total_params_billions: 12,
        max_context_size: 131072,
      },
      gpu: { id: 12, name: "RTX 3070", vram: 8, bandwidth: 385.7, score: 67 },
      cpu: { cores: 6, threads: 12, frequency: 3.7 },
      ramGb: 64,
      requestedContextSize: 4096,
      effectiveContextSize: 4096,
      selectedQuantizationKey: "INT4",
      selectedBackendKey: "llama.cpp / Ollama",
      selectedGpuCount: 1,
    });
    const estimate32k = computeEstimate({
      model: {
        id: 12,
        name: "Gemma 3 12B",
        params_billions: 12,
        total_params_billions: 12,
        max_context_size: 131072,
      },
      gpu: { id: 12, name: "RTX 3070", vram: 8, bandwidth: 385.7, score: 67 },
      cpu: { cores: 6, threads: 12, frequency: 3.7 },
      ramGb: 64,
      requestedContextSize: 32768,
      effectiveContextSize: 32768,
      selectedQuantizationKey: "INT4",
      selectedBackendKey: "llama.cpp / Ollama",
      selectedGpuCount: 1,
    });

    expect(estimate4k.estimatedTokensPerSecond).toBeGreaterThanOrEqual(7.5);
    expect(estimate4k.estimatedTokensPerSecond).toBeLessThanOrEqual(9.5);
    expect(estimate32k.estimatedTokensPerSecond).toBeGreaterThanOrEqual(3.7);
    expect(estimate32k.estimatedTokensPerSecond).toBeLessThanOrEqual(4.8);
    expect(estimate32k.memoryRequiredGb).toBeLessThanOrEqual(10.5);
    expect(estimate32k.warnings).toContainEqual(expect.stringContaining("VRAM disponible semble insuffisante"));
  });

  it("garde Phi-4 14B quasi inutilisable a 32k sur RTX 3070 8GB", () => {
    const estimate = computeEstimate({
      model: {
        id: 13,
        name: "Phi-4 14B",
        params_billions: 14,
        total_params_billions: 14,
        max_context_size: 131072,
      },
      gpu: { id: 13, name: "RTX 3070", vram: 8, bandwidth: 385.7, score: 67 },
      cpu: { cores: 6, threads: 12, frequency: 3.7 },
      ramGb: 64,
      requestedContextSize: 32768,
      effectiveContextSize: 32768,
      selectedQuantizationKey: "INT4",
      selectedBackendKey: "llama.cpp / Ollama",
      selectedGpuCount: 1,
    });

    expect(estimate.estimatedTokensPerSecond).toBeGreaterThanOrEqual(1.3);
    expect(estimate.estimatedTokensPerSecond).toBeLessThanOrEqual(2.3);
    expect(estimate.warnings).toContainEqual(expect.stringContaining("VRAM disponible semble insuffisante"));
  });
});
