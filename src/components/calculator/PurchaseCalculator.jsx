import { useMemo, useState } from "react";
import { formatNumber, formatPrice } from "../../utils/formatters.js";

const DEFAULT_CPU = {
  cores: 6,
  threads: 12,
  frequency: 4,
};

const DEFAULT_RAM_GB = 32;
const DEFAULT_GPU_NAME = "RTX 3060 12GB";

const QUANTIZATION_PROFILES = {
  INT4: { bytesPerParam: 0.5, memoryFactor: 1.08, speedFactor: 1.08 },
  INT8: { bytesPerParam: 1, memoryFactor: 1.12, speedFactor: 0.82 },
  FP8: { bytesPerParam: 1, memoryFactor: 1.15, speedFactor: 0.9 },
  FP16: { bytesPerParam: 2, memoryFactor: 1.2, speedFactor: 0.62 },
  "Non spécifié": { bytesPerParam: 0.75, memoryFactor: 1.12, speedFactor: 0.92 },
};

const QUANTIZATION_OPTIONS = ["INT4", "INT8", "FP8", "FP16", "Non spécifié"];
const KV_CACHE_BYTES_PER_ELEMENT = {
  INT4: 2,
  INT8: 2,
  FP8: 1,
  FP16: 2,
  "Non spécifié": 2,
};
const DECODE_TRAFFIC_MULTIPLIER = {
  INT4: 1.9,
  INT8: 1.55,
  FP8: 1.2,
  FP16: 1,
  "Non spécifié": 1.4,
};

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

function getActiveParamsBillions(model) {
  return Math.max(1, Number(model.params_billions) || 7);
}

function getTotalParamsBillions(model) {
  return Math.max(1, Number(model.total_params_billions) || Number(model.params_billions) || 7);
}

function estimateMemoryRequirementGb(model, quantizationKey, contextSize) {
  const totalParamsBillions = getTotalParamsBillions(model);
  const activeParamsBillions = getActiveParamsBillions(model);
  const profile = QUANTIZATION_PROFILES[quantizationKey] || QUANTIZATION_PROFILES["Non spécifié"];
  const kvBytes = KV_CACHE_BYTES_PER_ELEMENT[quantizationKey] || 2;
  const weightsGb = totalParamsBillions * profile.bytesPerParam * profile.memoryFactor;
  const kvCacheGb =
    6.7 * Math.pow(totalParamsBillions, 0.42) * (Math.max(1, contextSize) / 131072) * (kvBytes / 2);
  const runtimeGb = Math.max(1.5, Math.max(activeParamsBillions, totalParamsBillions * 0.25) * 0.04);

  return weightsGb + kvCacheGb + runtimeGb;
}

function computeMultiGpuScaling(gpuCount) {
  if (gpuCount <= 1) {
    return 1;
  }

  return 1 + (gpuCount - 1) * 0.82;
}

function getAnalyticalTokenBaseline(model, gpu, quantizationKey, contextSize) {
  const activeParamsBillions = getActiveParamsBillions(model);
  const bandwidth = Math.max(120, Number(gpu.bandwidth) || 180);
  const score = Math.max(35, Number(gpu.score) || 50);
  const profile = QUANTIZATION_PROFILES[quantizationKey] || QUANTIZATION_PROFILES["Non spécifié"];
  const effectiveWeightsGb =
    activeParamsBillions *
    profile.bytesPerParam *
    profile.memoryFactor *
    (DECODE_TRAFFIC_MULTIPLIER[quantizationKey] || DECODE_TRAFFIC_MULTIPLIER["Non spécifié"]);
  const decodeEfficiency = Math.max(0.42, Math.min(0.72, 0.46 + ((score - 50) / 100)));
  const contextPenalty = Math.max(0.78, Math.pow(8192 / Math.max(8192, contextSize), 0.08));
  const vramPenalty = gpu.vram < Math.max(8, effectiveWeightsGb * 0.85)
    ? Math.max(0.2, gpu.vram / Math.max(8, effectiveWeightsGb * 0.85))
    : 1;

  const throughput =
    ((bandwidth * decodeEfficiency) / Math.max(effectiveWeightsGb, 1)) *
    contextPenalty *
    vramPenalty;

  return Math.max(0.5, throughput);
}

function formatTokenValue(value) {
  return value > 0 ? `${formatNumber(Number(value.toFixed(1)))} t/s` : "≈ 0 t/s";
}

function getGpuOptions(gpuData) {
  const hasDefault = gpuData.some((gpu) => gpu.name === DEFAULT_GPU_NAME);
  const options = hasDefault ? [...gpuData] : [getSyntheticDefaultGpu(), ...gpuData];
  return options.sort((a, b) => a.name.localeCompare(b.name));
}

function computeEstimate({
  model,
  gpu,
  cpu,
  ramGb,
  contextSize,
  selectedQuantizationKey,
  selectedGpuCount,
}) {
  const quantizationKey = selectedQuantizationKey || "INT4";
  const memoryRequiredGb = estimateMemoryRequirementGb(model, quantizationKey, contextSize);
  const gpuCount = Math.max(1, selectedGpuCount || 1);
  const gpuVramGb = (gpu.vram || 0) * gpuCount;
  const cpuBaseScore = DEFAULT_CPU.threads * DEFAULT_CPU.frequency;
  const cpuScore = Math.max(cpu.threads, cpu.cores) * cpu.frequency;
  const cpuFactor = Math.max(0.68, Math.min(1.24, cpuScore / cpuBaseScore));
  const ramFactor = ramGb < 32 ? Math.max(0.62, ramGb / 32) : Math.min(1.1, 1 + (ramGb - 32) / 128);

  const warnings = [];

  if (model.max_context_size && contextSize > model.max_context_size) {
    warnings.push(`Le contexte demandé dépasse le maximum déclaré du modèle (${formatNumber(model.max_context_size)} tokens).`);
  }

  if (gpuVramGb > 0 && memoryRequiredGb > gpuVramGb) {
    warnings.push(`La VRAM disponible semble insuffisante: besoin estimé ≈ ${formatNumber(memoryRequiredGb)} Go pour ${formatNumber(gpuVramGb)} Go disponibles.`);
  }

  if (ramGb < Math.max(16, memoryRequiredGb * 1.15)) {
    warnings.push(`La RAM système risque d'être limitante avec ${formatNumber(ramGb)} Go.`);
  }

  const multiGpuFactor = computeMultiGpuScaling(gpuCount);

  const viabilityPenalty =
    memoryRequiredGb > 0 && gpuVramGb > 0 && memoryRequiredGb > gpuVramGb
      ? Math.max(0.15, gpuVramGb / memoryRequiredGb)
      : 1;

  const estimatedTokensPerSecond =
    getAnalyticalTokenBaseline(model, gpu, quantizationKey, contextSize) *
    multiGpuFactor *
    cpuFactor *
    ramFactor *
    viabilityPenalty;

  return {
    estimatedTokensPerSecond: Math.max(0, estimatedTokensPerSecond),
    confidence: "Analytique",
    quantizationKey,
    gpuCount,
    memoryRequiredGb,
    referenceLabel: "Estimation analytique indépendante des benchmarks stockés.",
    warnings,
    viable: warnings.every((warning) => !warning.includes("dépasse")),
  };
}

export function PurchaseCalculator({ gpuData, models }) {
  const gpuOptions = useMemo(() => getGpuOptions(gpuData), [gpuData]);
  const [selectedGpuName, setSelectedGpuName] = useState(DEFAULT_GPU_NAME);
  const [selectedModelId, setSelectedModelId] = useState(() => String(models[0]?.id ?? ""));
  const [contextSize, setContextSize] = useState("");
  const [selectedQuantizationKey, setSelectedQuantizationKey] = useState("INT4");
  const [selectedGpuCount, setSelectedGpuCount] = useState("1");
  const [ramGb, setRamGb] = useState(String(DEFAULT_RAM_GB));
  const [cpuCores, setCpuCores] = useState(String(DEFAULT_CPU.cores));
  const [cpuThreads, setCpuThreads] = useState(String(DEFAULT_CPU.threads));
  const [cpuFrequency, setCpuFrequency] = useState(String(DEFAULT_CPU.frequency));

  const selectedGpu =
    gpuOptions.find((gpu) => gpu.name === selectedGpuName) || gpuOptions[0] || getSyntheticDefaultGpu();
  const selectedModel = models.find((model) => String(model.id) === String(selectedModelId)) || models[0] || null;

  const effectiveContextSize = useMemo(() => {
    if (!selectedModel) {
      return 0;
    }

    const preferred = Number(contextSize);
    if (Number.isFinite(preferred) && preferred > 0) {
      return selectedModel.max_context_size
        ? Math.min(preferred, selectedModel.max_context_size)
        : preferred;
    }

    if (selectedModel.max_context_size) {
      return Math.min(8192, selectedModel.max_context_size);
    }

    return 8192;
  }, [contextSize, selectedModel]);

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
      contextSize: effectiveContextSize,
      selectedQuantizationKey,
      selectedGpuCount: Number(selectedGpuCount) || 1,
    });
  }, [cpuCores, cpuFrequency, cpuThreads, effectiveContextSize, gpuData, ramGb, selectedGpu, selectedGpuCount, selectedModel, selectedQuantizationKey]);

  if (!selectedModel || gpuOptions.length === 0) {
    return null;
  }

  return (
    <section className="section reveal" id="calculator">
      <div className="section-heading">
        <span className="section-kicker">Calculateur</span>
        <h2>Estimateur d&apos;achat et de débit LLM</h2>
        <p>
          Cette estimation repose sur un modèle analytique indépendant des benchmarks stockés,
          pour éviter qu&apos;une mesure atypique en base ne déforme la projection d&apos;achat.
        </p>
      </div>

      <div className="calculator-layout">
        <article className="card glass calculator-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">Configuration</span>
              <h3>Machine cible</h3>
            </div>
          </div>

          <div className="calculator-grid">
            <label className="control">
              <span>GPU</span>
              <select value={selectedGpuName} onChange={(event) => setSelectedGpuName(event.target.value)}>
                {gpuOptions.map((gpu) => (
                  <option key={gpu.id} value={gpu.name}>
                    {gpu.name} ({gpu.vram} Go)
                  </option>
                ))}
              </select>
            </label>

            <label className="control">
              <span>Nombre de GPU</span>
              <input
                min="1"
                step="1"
                type="number"
                value={selectedGpuCount}
                onChange={(event) => setSelectedGpuCount(event.target.value)}
              />
            </label>

            <label className="control">
              <span>Modèle LLM</span>
              <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="control">
              <span>Contexte souhaité</span>
              <input
                min="1"
                max={selectedModel.max_context_size || undefined}
                type="number"
                value={contextSize}
                onChange={(event) => setContextSize(event.target.value)}
                placeholder={String(Math.min(selectedModel.max_context_size || 8192, 8192))}
              />
            </label>

            <label className="control">
              <span>Quantization</span>
              <select
                value={selectedQuantizationKey}
                onChange={(event) => setSelectedQuantizationKey(event.target.value)}
              >
                {QUANTIZATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="control">
              <span>RAM utilisée (Go)</span>
              <input min="4" type="number" value={ramGb} onChange={(event) => setRamGb(event.target.value)} />
            </label>

            <label className="control">
              <span>Cœurs CPU</span>
              <input min="1" type="number" value={cpuCores} onChange={(event) => setCpuCores(event.target.value)} />
            </label>

            <label className="control">
              <span>Threads CPU</span>
              <input min="1" type="number" value={cpuThreads} onChange={(event) => setCpuThreads(event.target.value)} />
            </label>

            <label className="control">
              <span>Fréquence CPU (GHz)</span>
              <input min="1" step="0.1" type="number" value={cpuFrequency} onChange={(event) => setCpuFrequency(event.target.value)} />
            </label>
          </div>

          <p className="calculator-note">
            Base par défaut: CPU 6 cœurs / 12 threads à 4.0 GHz, 32 Go de RAM et RTX 3060 12 Go.
          </p>
        </article>

        <article className="card glass calculator-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">Estimation</span>
              <h3>Résultat approximatif mais exploitable</h3>
            </div>
          </div>

          {estimate ? (
            <div className="calculator-result">
              <div className="calculator-hero">
                <strong>{formatTokenValue(estimate.estimatedTokensPerSecond)}</strong>
                <span>{estimate.referenceLabel}</span>
              </div>

              <div className="calculator-metrics">
                <div className="calculator-metric">
                  <span>Confiance</span>
                  <strong>{estimate.confidence}</strong>
                </div>
                <div className="calculator-metric">
                  <span>Quantization choisie</span>
                  <strong>{estimate.quantizationKey}</strong>
                </div>
                <div className="calculator-metric">
                  <span>Mémoire modèle estimée</span>
                  <strong>{formatNumber(Number(estimate.memoryRequiredGb.toFixed(1)))} Go</strong>
                </div>
                <div className="calculator-metric">
                  <span>Contexte appliqué</span>
                  <strong>{formatNumber(effectiveContextSize)}</strong>
                </div>
              </div>

              <div className="calculator-summary">
                <p>
                  GPU ciblé: <strong>{selectedGpuCount}x {selectedGpu.name}</strong>
                  {selectedGpu.priceUsedValue ? ` · prix occasion ≈ ${formatPrice(selectedGpu.priceUsedValue)}` : ""}
                </p>
                <p>
                  Paramètres retenus: <strong>{formatNumber(getActiveParamsBillions(selectedModel))}B actifs</strong>
                  {" "}pour <strong>{formatNumber(getTotalParamsBillions(selectedModel))}B totaux</strong>.
                </p>
                <p>
                  CPU saisi: <strong>{cpuCores}</strong> cœurs / <strong>{cpuThreads}</strong> threads à{" "}
                  <strong>{cpuFrequency} GHz</strong> · RAM: <strong>{ramGb} Go</strong>
                </p>
                {selectedModel.max_context_size ? (
                  <p>Contexte max déclaré pour le modèle: <strong>{formatNumber(selectedModel.max_context_size)}</strong> tokens.</p>
                ) : null}
                <p>
                  Mode de calcul: <strong>projection analytique</strong> basée sur le GPU, la VRAM, la
                  bande passante, le CPU, la RAM, la quantization et le contexte.
                </p>
              </div>

              {estimate.warnings.length > 0 ? (
                <div className="calculator-warnings">
                  {estimate.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : (
                <p className="calculator-ok">
                  La configuration semble cohérente pour une estimation d&apos;inférence locale sur ce modèle.
                </p>
              )}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
