import { useMemo } from "react";
import { createModelCoverageChartConfig } from "../../utils/chartConfigs.js";
import { ChartCanvas } from "../common/ChartCanvas.jsx";
import { EmptyChart } from "../common/EmptyChart.jsx";

export function BandwidthChart({ models, totalGpus }) {
  const config = useMemo(
    () => createModelCoverageChartConfig(models, totalGpus),
    [models, totalGpus]
  );

  return config ? <ChartCanvas config={config} /> : <EmptyChart />;
}
