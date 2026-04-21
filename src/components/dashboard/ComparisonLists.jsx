import { getTopAveragePerformance, getTopCoverage } from "../../utils/data.js";
import { formatNumber } from "../../utils/formatters.js";

export function ComparisonLists({ gpuData }) {
  const topPerformance = getTopAveragePerformance(gpuData);
  const topCoverage = getTopCoverage(gpuData);

  return (
    <div className="comparison-grid reveal">
      <div className="comparison-card">
        <h3>🏆 Top 3 Moyennes mesurées</h3>
        <div className="comparison-list">
          {topPerformance.map((gpu, index) => (
            <div className="comparison-item" key={gpu.name}>
              <span className="comparison-item-name">#{index + 1} {gpu.name}</span>
              <span className="comparison-item-value">{formatNumber(gpu.averageTokens)} t/s</span>
            </div>
          ))}
        </div>
      </div>
      <div className="comparison-card">
        <h3>📚 Top 3 Couvertures</h3>
        <div className="comparison-list">
          {topCoverage.map((gpu, index) => (
            <div className="comparison-item" key={gpu.name}>
              <span className="comparison-item-name">#{index + 1} {gpu.name}</span>
              <span className="comparison-item-value">{formatNumber(gpu.coverageCount)} benchmark(s)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
