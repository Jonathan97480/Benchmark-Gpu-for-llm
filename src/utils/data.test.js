import { describe, expect, it } from "vitest";
import {
  findGpuBySlug,
  getGpuPath,
  normalizePublicDataset,
  resolveModelAnalyticalProfile,
  slugifyGpuName,
} from "./data.js";

describe("normalizePublicDataset", () => {
  it("applique les hypotheses documentees pour les modeles MoE et les GPU incomplets", () => {
    const dataset = normalizePublicDataset({
      gpus: [
        {
          id: 1,
          name: "Radeon AI PRO R9700",
          vendor: "AMD",
          architecture: "RDNA 4",
          vram: 32,
          bandwidth: 0,
          score: 84,
        },
      ],
      models: [
        {
          id: 1,
          name: "Gemma 4 26B (MoE)",
          params_billions: 26,
          total_params_billions: 26,
          max_context_size: 131072,
        },
      ],
      benchmark_results: [],
    });

    expect(dataset.gpus[0].bandwidth).toBe(960);
    expect(dataset.gpus[0].analyticalAssumptions[0]).toContain("960 Go/s");
    expect(dataset.models[0].params_billions).toBe(4);
    expect(dataset.models[0].total_params_billions).toBe(26);
    expect(dataset.models[0].max_context_size).toBe(262144);
    expect(dataset.models[0].analyticalAssumptions.join(" ")).toContain("4B");
    expect(dataset.models[0].analyticalAssumptions.join(" ")).toContain("256k");
  });

  it("attache les profils analytiques de calibration aux modeles connus", () => {
    const profile = resolveModelAnalyticalProfile({ name: "Qwen3.5-9B" });

    expect(profile.kvCacheMultiplier).toBe(0.08);
    expect(profile.contextPenaltyFloor).toBe(1);
    expect(profile.throughputMultiplier).toBe(1.62);
  });

  it("genere des slugs stables pour les pages GPU publiques", () => {
    expect(slugifyGpuName("Radeon AI PRO R9700")).toBe("radeon-ai-pro-r9700");
    expect(getGpuPath({ name: "RTX 4090" })).toBe("/gpu/rtx-4090");
    expect(
      findGpuBySlug(
        [
          { name: "RTX 4090" },
          { name: "Arc A770" },
        ],
        "arc-a770"
      )?.name
    ).toBe("Arc A770");
  });
});
