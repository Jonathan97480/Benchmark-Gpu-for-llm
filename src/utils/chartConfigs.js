import { formatNumber } from "./formatters.js";

export const tierColors = {
  budget: "#22c55e",
  prosumer: "#67e8f9",
  enterprise: "#8b5cf6",
};

export const vendorColors = {
  NVIDIA: "#67e8f9",
  AMD: "#8b5cf6",
  Intel: "#22c55e",
};

export function createModelPerformanceChartConfig(gpus, selectedModel) {
  if (!selectedModel) {
    return null;
  }

  const points = gpus
    .map((gpu) => {
      const benchmark = gpu.benchmarkResults.find(
        (result) => result.llm_model_id === selectedModel.id
      );

      return benchmark
        ? {
            gpuName: gpu.name,
            vendor: gpu.vendor,
            gpuCount: benchmark.gpu_count || 1,
            tokens: benchmark.tokens_per_second,
            precision: benchmark.precision || "Non spécifié",
            contextSize: benchmark.context_size,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.tokens - a.tokens);

  if (points.length === 0) {
    return null;
  }

  return {
    type: "bar",
    data: {
      labels: points.map((item) => item.gpuName),
      datasets: [
        {
          label: `${selectedModel.name} (${selectedModel.params_billions || "?"}B)`,
          data: points.map((item) => item.tokens),
          backgroundColor: points.map((item) => vendorColors[item.vendor] || "#67e8f9"),
          borderRadius: 8,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const point = points[context.dataIndex];
              const labels = [
                `GPU: ${point.gpuName}`,
                `Débit: ${formatNumber(point.tokens)} tokens/s`,
                `Quantization: ${point.precision}`,
              ];

              if (point.gpuCount > 1) {
                labels.push(`Configuration: ${point.gpuCount}x GPU`);
              }

              if (point.contextSize) {
                labels.push(`Contexte: ${formatNumber(point.contextSize)}`);
              }

              return labels;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#edf2ff" },
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.1)" },
          ticks: { color: "#9eb1d1" },
        },
      },
    },
  };
}

export function createModelCoverageChartConfig(models, totalGpus) {
  if (models.length === 0) {
    return null;
  }

  return {
    type: "bar",
    data: {
      labels: models.map((model) => model.name),
      datasets: [
        {
          label: "GPUs testés",
          data: models.map((model) => model.testedGpuCount),
          backgroundColor: "rgba(139, 92, 246, 0.75)",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.raw}/${totalGpus} GPUs testés`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#edf2ff" },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.1)" },
          ticks: { color: "#9eb1d1", precision: 0 },
        },
      },
    },
  };
}

export function createVendorChartConfig(gpus) {
  const vendorCounts = gpus.reduce((accumulator, gpu) => {
    accumulator[gpu.vendor] = (accumulator[gpu.vendor] || 0) + 1;
    return accumulator;
  }, {});

  const labels = Object.keys(vendorCounts);

  if (labels.length === 0) {
    return null;
  }

  return {
    labels,
    legendItems: labels.map((vendor) => ({
      label: vendor,
      color: vendorColors[vendor] || "#67e8f9",
    })),
    config: {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: Object.values(vendorCounts),
            backgroundColor: labels.map((vendor) => vendorColors[vendor] || "#67e8f9"),
            borderWidth: 0,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
        },
      },
    },
  };
}

export function createQuantizationChartConfig(benchmarkResults) {
  const precisionCounts = benchmarkResults.reduce((accumulator, result) => {
    const key = result.precision || "Non spécifié";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const labels = Object.keys(precisionCounts);

  if (labels.length === 0) {
    return null;
  }

  const colors = ["#67e8f9", "#8b5cf6", "#22c55e", "#fbbf24", "#fb7185", "#3b82f6"];

  return {
    labels,
    legendItems: labels.map((label, index) => ({
      label,
      color: colors[index % colors.length],
    })),
    config: {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: labels.map((label) => precisionCounts[label]),
            backgroundColor: labels.map((_, index) => colors[index % colors.length]),
            borderWidth: 0,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
        },
      },
    },
  };
}

export function createGpuPriceHistoryChartConfig(history, label, color) {
  if (!history || history.length === 0) {
    return null;
  }

  return {
    type: "line",
    data: {
      labels: history.map((entry) =>
        new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(entry.recorded_at))
      ),
      datasets: [
        {
          label,
          data: history.map((entry) => entry.value),
          borderColor: color,
          backgroundColor: `${color}33`,
          pointBackgroundColor: color,
          pointBorderColor: color,
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 3,
          fill: true,
          tension: 0.28,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return `${label}: ${formatNumber(context.raw)} EUR`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.06)" },
          ticks: { color: "#edf2ff" },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.1)" },
          ticks: {
            color: "#9eb1d1",
            callback(value) {
              return `${formatNumber(value)} EUR`;
            },
          },
        },
      },
    },
  };
}
