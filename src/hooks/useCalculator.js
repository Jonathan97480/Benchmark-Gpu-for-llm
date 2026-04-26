import { useMemo, useState } from "react";
import {
  DEFAULT_BACKEND_KEY,
  DEFAULT_CPU,
  DEFAULT_RAM_GB,
  DEFAULT_QUANTIZATION_KEY,
  computeEstimate,
  getDefaultRequestedContextSize,
  getEffectiveContextSize,
  getRequestedContextSize,
} from "../utils/calculator.js";

const DEFAULT_GPU_NAME = "RTX 3060 12GB";

function getSyntheticDefaultGpu() {
  return {
    id: "synthetic-rtx-3060-12g",
    name: DEFAULT_GPU_NAME,
    vendor: "NVIDIA",
    architecture: "Ampere",
    vram: 12,
    bandwidth: 360,
    score: 56,
    priceNewValue: 0,
    priceUsedValue: 260,
    benchmarkResults: [],
    coverageCount: 0,
    averageTokens: null,
    bestTokens: null,
    bestBenchmark: null,
    quantizations: [],
    testedModelIds: [],
    tier: "budget",
  };
}

function getGpuOptions(gpuData) {
  const hasDefault = gpuData.some((gpu) => gpu.name === DEFAULT_GPU_NAME);
  const options = hasDefault ? [...gpuData] : [getSyntheticDefaultGpu(), ...gpuData];
  return options.sort((a, b) => a.name.localeCompare(b.name));
}

export function useCalculator({ gpuData, models }) {
  const gpuOptions = useMemo(() => getGpuOptions(gpuData), [gpuData]);
  const [selectedGpuName, setSelectedGpuName] = useState(DEFAULT_GPU_NAME);
  const [selectedModelId, setSelectedModelId] = useState(() => String(models[0]?.id ?? ""));
  const [contextSize, setContextSize] = useState("");
  const [selectedQuantizationKey, setSelectedQuantizationKey] = useState(DEFAULT_QUANTIZATION_KEY);
  const [selectedBackendKey, setSelectedBackendKey] = useState(DEFAULT_BACKEND_KEY);
  const [selectedGpuCount, setSelectedGpuCount] = useState("1");
  const [ramGb, setRamGb] = useState(String(DEFAULT_RAM_GB));
  const [cpuCores, setCpuCores] = useState(String(DEFAULT_CPU.cores));
  const [cpuThreads, setCpuThreads] = useState(String(DEFAULT_CPU.threads));
  const [cpuFrequency, setCpuFrequency] = useState(String(DEFAULT_CPU.frequency));

  const selectedGpu =
    gpuOptions.find((gpu) => gpu.name === selectedGpuName) || gpuOptions[0] || getSyntheticDefaultGpu();
  const selectedModel = models.find((model) => String(model.id) === String(selectedModelId)) || models[0] || null;
  const selectedGpuCountNumber = Math.max(1, Number(selectedGpuCount) || 1);

  const requestedContextSize = useMemo(
    () => getRequestedContextSize(contextSize, selectedModel),
    [contextSize, selectedModel]
  );
  const effectiveContextSize = useMemo(
    () => getEffectiveContextSize(requestedContextSize, selectedModel),
    [requestedContextSize, selectedModel]
  );

  const estimate = useMemo(() => {
    if (!selectedModel || !selectedGpu) {
      return null;
    }

    return computeEstimate({
      model: selectedModel,
      gpu: selectedGpu,
      cpu: {
        cores: Number(cpuCores) || DEFAULT_CPU.cores,
        threads: Number(cpuThreads) || DEFAULT_CPU.threads,
        frequency: Number(cpuFrequency) || DEFAULT_CPU.frequency,
      },
      ramGb: Number(ramGb) || DEFAULT_RAM_GB,
      requestedContextSize,
      effectiveContextSize,
      selectedQuantizationKey,
      selectedBackendKey,
      selectedGpuCount: selectedGpuCountNumber,
    });
  }, [
    cpuCores,
    cpuFrequency,
    cpuThreads,
    effectiveContextSize,
    ramGb,
    requestedContextSize,
    selectedBackendKey,
    selectedGpu,
    selectedGpuCountNumber,
    selectedModel,
    selectedQuantizationKey,
  ]);

  return {
    cpuCores,
    cpuFrequency,
    cpuThreads,
    contextSize,
    effectiveContextSize,
    estimate,
    getDefaultRequestedContextSize,
    gpuOptions,
    ramGb,
    requestedContextSize,
    selectedBackendKey,
    selectedGpu,
    selectedGpuCount,
    selectedGpuCountNumber,
    selectedGpuName,
    selectedModel,
    selectedModelId,
    selectedQuantizationKey,
    setContextSize,
    setCpuCores,
    setCpuFrequency,
    setCpuThreads,
    setRamGb,
    setSelectedBackendKey,
    setSelectedGpuCount,
    setSelectedGpuName,
    setSelectedModelId,
    setSelectedQuantizationKey,
  };
}
