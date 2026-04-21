import { useMemo } from "react";
import { createVendorChartConfig } from "../../utils/chartConfigs.js";
import { ChartCanvas } from "../common/ChartCanvas.jsx";
import { EmptyChart } from "../common/EmptyChart.jsx";

export function MarketShareChart({ gpuData }) {
  const chartData = useMemo(() => createVendorChartConfig(gpuData), [gpuData]);

  if (!chartData) {
    return <EmptyChart compact={true} />;
  }

  return (
    <div className="chart-stack">
      <ChartCanvas className="pie-chart-container" config={chartData.config} />
      <div className="chart-legend">
        {chartData.legendItems.map((item) => (
          <div className="chart-legend-item" key={item.label}>
            <div className="chart-legend-color" style={{ background: item.color }}></div>
            <span className="chart-legend-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
