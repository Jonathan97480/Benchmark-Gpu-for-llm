import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export function ChartCanvas({ config, className = "chart-container" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !config) {
      return undefined;
    }

    const chart = new Chart(canvasRef.current, config);
    return () => chart.destroy();
  }, [config]);

  return (
    <div className={className}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}
