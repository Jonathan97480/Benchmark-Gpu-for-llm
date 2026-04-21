import { useMemo } from "react";
import { createModelPerformanceChartConfig } from "../../utils/chartConfigs.js";
import { ChartCanvas } from "../common/ChartCanvas.jsx";
import { EmptyChart } from "../common/EmptyChart.jsx";

export function PerformanceChart({ gpuData, selectedModel }) {
  const config = useMemo(
    () => createModelPerformanceChartConfig(gpuData, selectedModel),
    [gpuData, selectedModel]
  );

  return config ? <ChartCanvas config={config} /> : <EmptyChart />;
}
