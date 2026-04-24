import { useMemo } from "react";
import { createVendorChartConfig } from "../../utils/chartConfigs.js";
import { getVendorPath } from "../../utils/data.js";
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
          <a className="chart-legend-item chart-legend-link" href={getVendorPath(item.label)} key={item.label}>
            <div className="chart-legend-color" style={{ background: item.color }}></div>
            <span className="chart-legend-label">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
