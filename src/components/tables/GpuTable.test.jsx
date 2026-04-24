import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GpuTable } from "./GpuTable.jsx";

vi.mock("../../services/dashboardApi.js", () => ({
  fetchGpuPriceHistory: vi.fn(),
}));

vi.mock("../common/ChartCanvas.jsx", () => ({
  ChartCanvas: ({ config }) => (
    <div data-testid="chart-canvas">{config?.data?.datasets?.[0]?.label || "chart"}</div>
  ),
}));

const { fetchGpuPriceHistory } = await import("../../services/dashboardApi.js");

function createGpu(overrides = {}) {
  return {
    id: 1,
    name: "RTX 4090",
    vendor: "NVIDIA",
    architecture: "Ada Lovelace",
    vram: 24,
    bandwidth: 1008,
    coverageCount: 2,
    averageTokens: 120,
    priceNewValue: 1800,
    priceUsedValue: 1200,
    score: 82,
    tier: "prosumer",
    benchmarkResults: [
      {
        id: 10,
        llm_model_id: 7,
        model_name: "DeepSeek R1 32B",
        gpu_count: 1,
        tokens_per_second: 120,
        precision: "INT4",
        context_size: 8192,
        notes: "Mesure de test",
      },
    ],
    bestBenchmark: {
      gpu_count: 1,
    },
    ...overrides,
  };
}

describe("GpuTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ouvre le panneau des courbes de prix quand le nom du GPU est cliqué", async () => {
    fetchGpuPriceHistory.mockResolvedValue({
      history: [
        { recorded_at: "2026-04-20T12:00:00.000Z", price_new_value: 1850, price_used_value: 1180 },
        { recorded_at: "2026-04-21T12:00:00.000Z", price_new_value: 1820, price_used_value: 1160 },
      ],
    });

    render(
      <GpuTable
        selectedModel={{ id: 7, name: "DeepSeek R1 32B" }}
        setSort={vi.fn()}
        sortedData={[createGpu()]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "RTX 4090" }));

    expect(await screen.findByRole("heading", { name: "Évolution du prix neuf" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Évolution du prix occasion" })).toBeInTheDocument();
    expect(screen.getAllByTestId("chart-canvas")).toHaveLength(2);
    expect(fetchGpuPriceHistory).toHaveBeenCalledWith(1);
  });

  it("affiche un message vide quand aucun historique n'est disponible", async () => {
    fetchGpuPriceHistory.mockResolvedValue({
      history: [],
    });

    render(
      <GpuTable
        selectedModel={{ id: 7, name: "DeepSeek R1 32B" }}
        setSort={vi.fn()}
        sortedData={[createGpu()]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "RTX 4090" }));

    await waitFor(() => {
      expect(
        screen.getByText("Aucun historique de prix n’est encore disponible pour ce GPU.")
      ).toBeInTheDocument();
    });
  });
});
