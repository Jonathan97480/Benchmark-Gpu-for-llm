import { formatNumber, formatPrice } from "../../utils/formatters.js";
import oneCardImage from "../../image/cardEvolution/1card.jpg";
import twoCardImage from "../../image/cardEvolution/2card.jpg";
import threeCardImage from "../../image/cardEvolution/3card.jpg";
import fourCardImage from "../../image/cardEvolution/4card.jpg";
import sixCardImage from "../../image/cardEvolution/6card.jpg";
import sevenCardImage from "../../image/cardEvolution/7card.jpg";
import { useCalculator } from "../../hooks/useCalculator.js";
import {
  BACKEND_OPTIONS,
  QUANTIZATION_OPTIONS,
  getActiveParamsBillions,
  getTotalParamsBillions,
} from "../../utils/calculator.js";

const GPU_COUNT_SCENE_IMAGES = {
  1: oneCardImage,
  2: twoCardImage,
  3: threeCardImage,
  4: fourCardImage,
  6: sixCardImage,
  7: sevenCardImage,
};

function getClosestAvailableGpuSceneCount(requestedCount) {
  const safeCount = Math.max(1, Number(requestedCount) || 1);
  const availableCounts = Object.keys(GPU_COUNT_SCENE_IMAGES)
    .map(Number)
    .sort((a, b) => a - b);
  const exactMatch = availableCounts.find((count) => count === safeCount);

  if (exactMatch) {
    return exactMatch;
  }

  const lowerOrEqual = [...availableCounts].reverse().find((count) => count <= safeCount);
  return lowerOrEqual || availableCounts[0];
}

function formatTokenValue(value) {
  return value > 0 ? `${formatNumber(Number(value.toFixed(1)))} t/s` : "≈ 0 t/s";
}

export function PurchaseCalculator({ gpuData, models }) {
  const {
    cpuCores,
    cpuFrequency,
    cpuThreads,
    contextSize,
    effectiveContextSize,
    estimate,
    estimateError,
    getDefaultRequestedContextSize,
    gpuOptions,
    isEstimateLoading,
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
  } = useCalculator({ gpuData, models });
  const sceneGpuCount = getClosestAvailableGpuSceneCount(selectedGpuCountNumber);
  const selectedGpuSceneImage = GPU_COUNT_SCENE_IMAGES[sceneGpuCount];

  if (!selectedModel || gpuOptions.length === 0) {
    return null;
  }

  return (
    <section className="section reveal" id="calculator">
      <div className="section-heading">
        <span className="section-kicker">Simulateur analytique</span>
        <h2>Estimation analytique d&apos;achat et de débit LLM</h2>
        <p>
          Cette projection est calculée à partir des métadonnées GPU, CPU, RAM, quantization et contexte.
          Elle ne correspond pas à un benchmark mesuré.
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
                type="number"
                value={contextSize}
                onChange={(event) => setContextSize(event.target.value)}
                placeholder={String(getDefaultRequestedContextSize(selectedModel))}
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
              <span>Backend d&apos;inférence</span>
              <select
                value={selectedBackendKey}
                onChange={(event) => setSelectedBackendKey(event.target.value)}
              >
                {BACKEND_OPTIONS.map((option) => (
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
          {selectedGpuSceneImage ? (
            <figure className="calculator-scene">
              <img
                className="calculator-scene-image"
                src={selectedGpuSceneImage}
                alt={`Station LLM illustrative avec ${sceneGpuCount} carte${sceneGpuCount > 1 ? "s" : ""} graphique${sceneGpuCount > 1 ? "s" : ""}`}
              />
              <figcaption className="calculator-scene-caption">
                {selectedGpuCountNumber === sceneGpuCount
                  ? `Illustration de station avec ${sceneGpuCount} GPU.`
                  : `Illustration approchante: station avec ${sceneGpuCount} GPU pour une configuration saisie à ${selectedGpuCountNumber} GPU.`}
              </figcaption>
            </figure>
          ) : null}
        </article>

        <article className="card glass calculator-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">Estimation analytique</span>
              <h3>Projection non issue d&apos;un benchmark mesuré</h3>
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
                  <span>Backend</span>
                  <strong>{estimate.backendKey}</strong>
                </div>
                <div className="calculator-metric">
                  <span>Mémoire totale estimée</span>
                  <strong>{formatNumber(Number(estimate.memoryRequiredGb.toFixed(1)))} Go</strong>
                </div>
              </div>

              <div className="calculator-summary">
                <p className="calculator-subnote">
                  Estimation analytique uniquement. Ce résultat n&apos;est pas un benchmark mesuré.
                </p>
                {estimate.calibration?.label ? (
                  <p className="calculator-subnote">
                    {estimate.calibration.label}
                  </p>
                ) : null}
                <p>
                  GPU ciblé: <strong>{selectedGpuCount}x {selectedGpu.name}</strong>
                  {selectedGpu.priceUsedValue ? ` · prix occasion ≈ ${formatPrice(selectedGpu.priceUsedValue)}` : ""}
                </p>
                <p>
                  Backend retenu: <strong>{estimate.backendKey}</strong>.
                </p>
                <p>
                  Paramètres retenus: <strong>{formatNumber(getActiveParamsBillions(selectedModel))}B actifs</strong>
                  {" "}pour <strong>{formatNumber(getTotalParamsBillions(selectedModel))}B totaux</strong>.
                </p>
                <p>
                  CPU saisi: <strong>{cpuCores}</strong> cœurs / <strong>{cpuThreads}</strong> threads à{" "}
                  <strong>{cpuFrequency} GHz</strong> · RAM: <strong>{ramGb} Go</strong>
                </p>
                <p>
                  Contexte demandé: <strong>{formatNumber(requestedContextSize)}</strong> tokens · contexte effectif:{" "}
                  <strong>{formatNumber(effectiveContextSize)}</strong> tokens.
                </p>
                {selectedModel.max_context_size ? (
                  <p>Contexte max déclaré pour le modèle: <strong>{formatNumber(selectedModel.max_context_size)}</strong> tokens.</p>
                ) : null}
                {estimate.memoryBreakdown ? (
                  <p>
                    Décomposition mémoire: poids <strong>{formatNumber(Number(estimate.memoryBreakdown.modelMemoryGb.toFixed(1)))} Go</strong>,
                    {" "}KV cache <strong>{formatNumber(Number(estimate.memoryBreakdown.kvCacheGb.toFixed(1)))} Go</strong>,
                    {" "}runtime <strong>{formatNumber(Number(estimate.memoryBreakdown.runtimeMemoryGb.toFixed(1)))} Go</strong>.
                  </p>
                ) : null}
                <p>
                  Facteurs appliqués: contexte, RAM, CPU, VRAM, quantization et multi-GPU.
                </p>
                {selectedModel.analyticalAssumptions?.length ? (
                  <p>
                    Hypothèses modèle: <strong>{selectedModel.analyticalAssumptions.join(" ")}</strong>
                  </p>
                ) : null}
                {selectedGpu.analyticalAssumptions?.length ? (
                  <p>
                    Hypothèses GPU: <strong>{selectedGpu.analyticalAssumptions.join(" ")}</strong>
                  </p>
                ) : null}
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
          ) : isEstimateLoading ? (
            <p className="calculator-subnote">Calcul de l&apos;estimation en cours…</p>
          ) : estimateError ? (
            <div className="calculator-warnings">
              <p>{estimateError}</p>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
