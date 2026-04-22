import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AdminApp } from "./AdminApp.jsx";

vi.mock("./hooks/useAdminAuth.js", () => ({
  useAdminAuth: vi.fn(),
}));

vi.mock("./hooks/useAdminDashboard.js", () => ({
  useAdminDashboard: vi.fn(),
}));

const { useAdminAuth } = await import("./hooks/useAdminAuth.js");
const { useAdminDashboard } = await import("./hooks/useAdminDashboard.js");

function createDashboardState() {
  return {
    apiKeyForm: { name: "" },
    apiKeys: [],
    notification: null,
    error: "",
    gpuForm: {
      id: null,
      name: "",
      vendor: "NVIDIA",
      architecture: "",
      vram: "",
      bandwidth: "",
      price_new_value: "",
      price_used_value: "",
      tier: "prosumer",
      score: "",
      benchmarkRowsByModel: { "1": [] },
    },
    models: [
      {
        id: 1,
        name: "DeepSeek R1 32B",
        params_billions: 32,
        total_params_billions: 32,
        description: "Modele de test",
      },
    ],
    newModelForm: {
      open: false,
      name: "",
      params_billions: "",
      max_context_size: "",
      total_params_billions: "",
      description: "",
    },
    addBenchmarkRow: vi.fn(),
    removeApiKey: vi.fn(),
    removeBenchmarkRow: vi.fn(),
    upsertBenchmarkRow: vi.fn(),
    setNewModelForm: vi.fn(),
    resetGpuForm: vi.fn(),
    saveGpu: vi.fn(),
    saveApiKey: vi.fn(),
    saveModel: vi.fn(),
    updateGpuField: vi.fn(),
    setApiKeyForm: vi.fn(),
    setLatestCreatedApiKey: vi.fn(),
    saving: false,
    filteredGpus: [],
    removeGpu: vi.fn(),
    startEditGpu: vi.fn(),
    search: "",
    setSearch: vi.fn(),
    setVendorFilter: vi.fn(),
    vendorFilter: "all",
    latestCreatedApiKey: "",
    removeModel: vi.fn(),
  };
}

describe("AdminApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche l'écran de chargement pendant le bootstrap de session", () => {
    useAdminAuth.mockReturnValue({
      bootstrapping: true,
      authenticated: false,
    });
    useAdminDashboard.mockReturnValue(createDashboardState());

    render(<AdminApp />);

    expect(screen.getByText("Chargement de l’administration")).toBeInTheDocument();
  });

  it("affiche le formulaire de connexion quand l'admin n'est pas authentifié", () => {
    useAdminAuth.mockReturnValue({
      adminExists: true,
      authenticated: false,
      bootstrapping: false,
      createFirstAdmin: vi.fn(),
      error: "",
      handleUnauthorized: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      pending: false,
      setError: vi.fn(),
    });
    useAdminDashboard.mockReturnValue(createDashboardState());

    render(<AdminApp />);

    expect(screen.getByRole("heading", { name: "Connexion administrateur" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connexion" })).toBeInTheDocument();
  });

  it("affiche le back-office React quand l'utilisateur est authentifié", () => {
    useAdminAuth.mockReturnValue({
      adminExists: true,
      authenticated: true,
      bootstrapping: false,
      createFirstAdmin: vi.fn(),
      error: "",
      handleUnauthorized: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      pending: false,
      setError: vi.fn(),
    });
    useAdminDashboard.mockReturnValue(createDashboardState());

    render(<AdminApp />);

    expect(screen.getByRole("heading", { name: "GPU LLM Benchmark Back-Office" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ajouter un GPU" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accès externe sécurisé" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Déconnexion" })).toBeInTheDocument();
  });
});
