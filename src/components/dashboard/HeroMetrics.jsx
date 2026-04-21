import { formatNumber } from "../../utils/formatters.js";

export function HeroMetrics({ gpuData, models, totals, quantizations }) {
  if (gpuData.length === 0 && models.length === 0) {
    return <p className="empty-state-text">Chargement des données...</p>;
  }

  const topVram = gpuData.length > 0
    ? gpuData.reduce((best, gpu) => (gpu.vram > best.vram ? gpu : best), gpuData[0])
    : null;
  const mostCoveredModel = [...models].sort(
    (a, b) => b.testedGpuCount - a.testedGpuCount || (a.params_billions || 0) - (b.params_billions || 0)
  )[0];
  const quantizationText = quantizations.length > 0 ? quantizations.join(", ") : "Aucune";

  return (
    <div className="hero-metrics">
      <div className="metric-box">
        <span>Benchmarks détaillés</span>
        <strong>{formatNumber(totals.benchmarkResults)}</strong>
        <span>{formatNumber(totals.coveragePercent)}% de couverture théorique</span>
      </div>
      <div className="metric-box">
        <span>Modèle le plus couvert</span>
        <strong>{mostCoveredModel ? mostCoveredModel.name : "—"}</strong>
        <span>
          {mostCoveredModel ? `${mostCoveredModel.testedGpuCount} GPU(s) testés` : "Aucun benchmark détaillé"}
        </span>
      </div>
      <div className="metric-box">
        <span>Quantizations présentes</span>
        <strong>{quantizations.length}</strong>
        <span>{quantizationText}</span>
      </div>
      {topVram ? (
        <div className="metric-box">
          <span>Max VRAM catalogue</span>
          <strong>{topVram.name}</strong>
          <span>{formatNumber(topVram.vram)} Go</span>
        </div>
      ) : null}
    </div>
  );
}
