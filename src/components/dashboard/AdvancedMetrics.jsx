import { formatNumber } from "../../utils/formatters.js";

export function AdvancedMetrics({ gpuData, models, totals, quantizations }) {
  if (gpuData.length === 0 && models.length === 0) {
    return null;
  }

  const testedGpuCount = gpuData.filter((gpu) => gpu.coverageCount > 0).length;
  const averageBenchmarksPerGpu =
    gpuData.length > 0 ? (totals.benchmarkResults / gpuData.length).toFixed(1) : "0";

  const cards = [
    { icon: "🧠", value: formatNumber(models.length), label: "Modèles LLM" },
    { icon: "🖥️", value: formatNumber(gpuData.length), label: "Cartes GPU" },
    { icon: "📊", value: formatNumber(totals.benchmarkResults), label: "Résultats détaillés" },
    {
      icon: "🧪",
      value: `${formatNumber(testedGpuCount)}/${formatNumber(gpuData.length)}`,
      label: "GPUs avec benchmarks",
    },
    { icon: "📚", value: averageBenchmarksPerGpu, label: "Benchmarks par GPU" },
    { icon: "⚙️", value: formatNumber(quantizations.length), label: "Quantizations distinctes" },
  ];

  return (
    <div className="advanced-metrics">
      {cards.map((card) => (
        <div className="metric-card" key={card.label}>
          <div className="metric-card-icon">{card.icon}</div>
          <div className="metric-card-value">{card.value}</div>
          <div className="metric-card-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
