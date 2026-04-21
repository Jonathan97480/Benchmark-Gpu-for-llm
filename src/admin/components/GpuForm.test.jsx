import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GpuForm } from "./GpuForm.jsx";

function createProps() {
  return {
    form: {
      id: null,
      name: "RTX 5090",
      vendor: "NVIDIA",
      architecture: "Blackwell",
      vram: "32",
      bandwidth: "1792",
      price_new_value: "0",
      price_used_value: "0",
      tier: "prosumer",
      score: "98",
      benchmarkRowsByModel: {
        "1": [
          {
            clientId: "row-1",
            resultId: 11,
            tokens_per_second: 71,
            context_size: "",
            precision: "",
            notes: "Inference reportee",
            removed: false,
          },
        ],
      },
    },
    models: [
      {
        id: 1,
        name: "DeepSeek R1 32B",
        params_billions: 32,
        description: "Modele de test",
      },
    ],
    newModelForm: {
      open: false,
      name: "",
      params_billions: "",
      description: "",
    },
    onAddBenchmarkRow: vi.fn(),
    onCancelNewModel: vi.fn(),
    onChangeBenchmarkRow: vi.fn(),
    onDeleteBenchmarkRow: vi.fn(),
    onNewModelFormChange: vi.fn(),
    onOpenNewModel: vi.fn(),
    onReset: vi.fn(),
    onSave: vi.fn(),
    onSaveModel: vi.fn(),
    onUpdateField: vi.fn(),
    saving: false,
  };
}

describe("GpuForm", () => {
  it("affiche les benchmarks existants du modèle courant", () => {
    const props = createProps();

    render(<GpuForm {...props} />);

    expect(screen.getByRole("heading", { name: "DeepSeek R1 32B" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("71")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Inference reportee")).toBeInTheDocument();
  });

  it("déclenche l'ajout d'une ligne benchmark pour un modèle", () => {
    const props = createProps();

    render(<GpuForm {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Benchmark" }));

    expect(props.onAddBenchmarkRow).toHaveBeenCalledWith("1");
  });
});
