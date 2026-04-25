import { useEffect, useRef } from "react";

export function ChartCanvas({ config, className = "chart-container" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let chart = null;
    let cancelled = false;

    async function loadChart() {
      if (!canvasRef.current || !config) {
        return;
      }

      const { default: Chart } = await import("chart.js/auto");

      if (cancelled || !canvasRef.current) {
        return;
      }

      chart = new Chart(canvasRef.current, config);
    }

    loadChart();

    return () => {
      cancelled = true;
      if (chart) {
        chart.destroy();
      }
    };
  }, [config]);

  return (
    <div className={className}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}
