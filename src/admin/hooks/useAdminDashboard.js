import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createApiKey,
  createBackup,
  createBenchmark,
  createGpu,
  createModel,
  deleteBenchmark,
  deleteGpu,
  deleteModel,
  downloadBackup,
  fetchApiKeys,
  fetchBackups,
  fetchGpuById,
  fetchGpuList,
  fetchModels,
  recomputeModelAnalyticalProfile,
  revokeApiKey,
  updateBenchmark,
  updateGpu,
  updateModel,
} from "../services/adminApi.js";

let benchmarkRowCounter = 0;

function createBenchmarkRow(overrides = {}) {
  benchmarkRowCounter += 1;

  return {
    clientId: `benchmark-row-${benchmarkRowCounter}`,
    resultId: null,
    gpu_count: "1",
    tokens_per_second: "",
    context_size: "",
    precision: "",
    inference_backend: "",
    measurement_type: "",
    vram_used_gb: "",
    ram_used_gb: "",
    kv_cache_precision: "",
    batch_size: "",
    concurrency: "",
    gpu_power_limit_watts: "",
    gpu_core_clock_mhz: "",
    gpu_memory_clock_mhz: "",
    notes: "",
    removed: false,
    ...overrides,
  };
}

function buildBenchmarkRowsByModel(models, benchmarkResults = []) {
  const groupedRows = Object.fromEntries(models.map((model) => [String(model.id), []]));

  benchmarkResults.forEach((benchmark) => {
    const key = String(benchmark.llm_model_id);
    if (!groupedRows[key]) {
      groupedRows[key] = [];
    }

    groupedRows[key].push(
      createBenchmarkRow({
        resultId: benchmark.id,
        gpu_count: String(benchmark.gpu_count ?? 1),
        tokens_per_second: benchmark.tokens_per_second ?? "",
        context_size: benchmark.context_size ?? "",
        precision: benchmark.precision || "",
        inference_backend: benchmark.inference_backend || "",
        measurement_type: benchmark.measurement_type || "",
        vram_used_gb: benchmark.vram_used_gb ?? "",
        ram_used_gb: benchmark.ram_used_gb ?? "",
        kv_cache_precision: benchmark.kv_cache_precision || "",
        batch_size: benchmark.batch_size ?? "",
        concurrency: benchmark.concurrency ?? "",
        gpu_power_limit_watts: benchmark.gpu_power_limit_watts ?? "",
        gpu_core_clock_mhz: benchmark.gpu_core_clock_mhz ?? "",
        gpu_memory_clock_mhz: benchmark.gpu_memory_clock_mhz ?? "",
        notes: benchmark.notes || "",
      })
    );
  });

  return groupedRows;
}

function createEmptyGpuForm(models = []) {
  return {
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
    benchmarkRowsByModel: buildBenchmarkRowsByModel(models),
  };
}

function flattenBenchmarkRows(benchmarkRowsByModel) {
  return Object.entries(benchmarkRowsByModel).flatMap(([modelId, rows]) =>
    rows.map((row) => ({
      ...row,
      llm_model_id: Number(modelId),
    }))
  );
}

function resetNewModelForm() {
  return {
    open: false,
    name: "",
    params_billions: "",
    total_params_billions: "",
    max_context_size: "",
    analytical_kv_cache_multiplier: "",
    analytical_runtime_memory_multiplier: "",
    analytical_runtime_memory_minimum: "",
    analytical_context_penalty_multiplier: "",
    analytical_context_penalty_floor: "",
    analytical_offload_penalty_multiplier: "",
    analytical_throughput_multiplier: "",
    description: "",
  };
}

export function useAdminDashboard({ authenticated, onUnauthorized }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);
  const [gpus, setGpus] = useState([]);
  const [models, setModels] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [backups, setBackups] = useState([]);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [gpuForm, setGpuForm] = useState(() => createEmptyGpuForm());
  const [newModelForm, setNewModelForm] = useState(resetNewModelForm);
  const [apiKeyForm, setApiKeyForm] = useState({ name: "" });
  const [latestCreatedApiKey, setLatestCreatedApiKey] = useState("");

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
  }, []);

  const handleActionError = useCallback(async (actionError, fallbackMessage) => {
    if (actionError.status === 401) {
      await onUnauthorized();
      return true;
    }

    showNotification(actionError.message || fallbackMessage, "error");
    return false;
  }, [onUnauthorized, showNotification]);

  useEffect(() => {
    if (!notification) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setNotification(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  const resetGpuForm = useCallback((modelList = models) => {
    setGpuForm(createEmptyGpuForm(modelList));
  }, [models]);

  const loadDashboardData = useCallback(async () => {
    if (!authenticated) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [gpuResponse, modelResponse, apiKeysResponse, backupsResponse] = await Promise.all([
        fetchGpuList(),
        fetchModels(),
        fetchApiKeys(),
        fetchBackups(),
      ]);
      const gpuList = gpuResponse.gpus || [];
      const modelList = modelResponse.models || [];
      const keyList = apiKeysResponse.api_keys || [];

      setGpus(gpuList);
      setModels(modelList);
      setApiKeys(keyList);
      setBackups(backupsResponse.backups || []);
      setGpuForm((currentForm) => {
        if (currentForm.id) {
          return {
            ...currentForm,
            benchmarkRowsByModel: buildBenchmarkRowsByModel(
              modelList,
              flattenBenchmarkRows(currentForm.benchmarkRowsByModel)
                .filter((row) =>
                  row.resultId ||
                  row.tokens_per_second ||
                  row.context_size ||
                  row.precision ||
                  row.inference_backend ||
                  row.measurement_type ||
                  row.vram_used_gb ||
                  row.ram_used_gb ||
                  row.kv_cache_precision ||
                  row.batch_size ||
                  row.concurrency ||
                  row.gpu_power_limit_watts ||
                  row.gpu_core_clock_mhz ||
                  row.gpu_memory_clock_mhz ||
                  row.notes
                )
                .map((row) => ({
                  id: row.resultId,
                  llm_model_id: row.llm_model_id,
                  gpu_count: row.gpu_count === "" ? 1 : Number(row.gpu_count),
                  tokens_per_second: row.tokens_per_second,
                  context_size: row.context_size,
                  precision: row.precision,
                  inference_backend: row.inference_backend,
                  measurement_type: row.measurement_type,
                  vram_used_gb: row.vram_used_gb,
                  ram_used_gb: row.ram_used_gb,
                  kv_cache_precision: row.kv_cache_precision,
                  batch_size: row.batch_size,
                  concurrency: row.concurrency,
                  gpu_power_limit_watts: row.gpu_power_limit_watts,
                  gpu_core_clock_mhz: row.gpu_core_clock_mhz,
                  gpu_memory_clock_mhz: row.gpu_memory_clock_mhz,
                  notes: row.notes,
                }))
            ),
          };
        }

        return createEmptyGpuForm(modelList);
      });
    } catch (loadError) {
      if (loadError.status === 401) {
        await onUnauthorized();
        return;
      }

      setError(loadError.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [authenticated, onUnauthorized]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const filteredGpus = useMemo(() => {
    return gpus.filter((gpu) => {
      const matchesVendor = vendorFilter === "all" || gpu.vendor === vendorFilter;
      const matchesSearch =
        search.trim() === "" ||
        gpu.name.toLowerCase().includes(search.toLowerCase()) ||
        gpu.architecture.toLowerCase().includes(search.toLowerCase());

      return matchesVendor && matchesSearch;
    });
  }, [gpus, search, vendorFilter]);

  const updateGpuField = useCallback((field, value) => {
    setGpuForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }, []);

  const startEditGpu = useCallback(async (gpuId) => {
    setSaving(true);
    setError("");

    try {
      const gpu = await fetchGpuById(gpuId);
      setGpuForm({
        id: gpu.id,
        name: gpu.name,
        vendor: gpu.vendor,
        architecture: gpu.architecture,
        vram: String(gpu.vram ?? ""),
        bandwidth: String(gpu.bandwidth ?? ""),
        price_new_value: String(gpu.price_new_value ?? ""),
        price_used_value: String(gpu.price_used_value ?? ""),
        tier: gpu.tier,
        score: String(gpu.score ?? ""),
        benchmarkRowsByModel: buildBenchmarkRowsByModel(models, gpu.benchmark_results || []),
      });

      showNotification("GPU chargé pour modification", "info");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (loadError) {
      if (await handleActionError(loadError, "Failed to load GPU")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [handleActionError, models, showNotification]);

  const upsertBenchmarkRow = useCallback((modelId, clientId, field, value) => {
    setGpuForm((currentForm) => ({
      ...currentForm,
      benchmarkRowsByModel: {
        ...currentForm.benchmarkRowsByModel,
        [modelId]: (currentForm.benchmarkRowsByModel[modelId] || []).map((row) =>
          row.clientId === clientId ? { ...row, [field]: value } : row
        ),
      },
    }));
  }, []);

  const addBenchmarkRow = useCallback((modelId) => {
    setGpuForm((currentForm) => ({
      ...currentForm,
      benchmarkRowsByModel: {
        ...currentForm.benchmarkRowsByModel,
        [modelId]: [...(currentForm.benchmarkRowsByModel[modelId] || []), createBenchmarkRow()],
      },
    }));
  }, []);

  const removeBenchmarkRow = useCallback((modelId, clientId) => {
    setGpuForm((currentForm) => ({
      ...currentForm,
      benchmarkRowsByModel: {
        ...currentForm.benchmarkRowsByModel,
        [modelId]: (currentForm.benchmarkRowsByModel[modelId] || [])
          .map((row) => {
            if (row.clientId !== clientId) {
              return row;
            }

            if (row.resultId) {
              return { ...row, removed: true };
            }

            return null;
          })
          .filter(Boolean),
      },
    }));
  }, []);

  async function syncBenchmarks(gpuId, benchmarkRowsByModel) {
    const rows = flattenBenchmarkRows(benchmarkRowsByModel);

    for (const row of rows) {
      const payload = {
        llm_model_id: row.llm_model_id,
        gpu_count: row.gpu_count === "" ? 1 : Number(row.gpu_count),
        tokens_per_second: row.tokens_per_second === "" ? null : Number(row.tokens_per_second),
        context_size: row.context_size === "" ? null : Number(row.context_size),
        precision: row.precision || null,
        inference_backend: row.inference_backend || null,
        measurement_type: row.measurement_type || null,
        vram_used_gb: row.vram_used_gb === "" ? null : Number(row.vram_used_gb),
        ram_used_gb: row.ram_used_gb === "" ? null : Number(row.ram_used_gb),
        kv_cache_precision: row.kv_cache_precision || null,
        batch_size: row.batch_size === "" ? null : Number(row.batch_size),
        concurrency: row.concurrency === "" ? null : Number(row.concurrency),
        gpu_power_limit_watts:
          row.gpu_power_limit_watts === "" ? null : Number(row.gpu_power_limit_watts),
        gpu_core_clock_mhz:
          row.gpu_core_clock_mhz === "" ? null : Number(row.gpu_core_clock_mhz),
        gpu_memory_clock_mhz:
          row.gpu_memory_clock_mhz === "" ? null : Number(row.gpu_memory_clock_mhz),
        notes: row.notes || null,
      };

      if (row.resultId && row.removed) {
        await deleteBenchmark(gpuId, row.resultId);
        continue;
      }

      if (!payload.tokens_per_second || payload.tokens_per_second <= 0) {
        continue;
      }

      if (row.resultId) {
        await updateBenchmark(gpuId, row.resultId, payload);
        continue;
      }

      await createBenchmark(gpuId, payload);
    }
  }

  const saveGpu = useCallback(async () => {
    setSaving(true);
    setError("");

    const payload = {
      name: gpuForm.name.trim(),
      vendor: gpuForm.vendor,
      architecture: gpuForm.architecture.trim(),
      vram: Number(gpuForm.vram),
      bandwidth: Number(gpuForm.bandwidth),
      price_value:
        gpuForm.price_new_value === ""
          ? gpuForm.price_used_value === ""
            ? 0
            : Number(gpuForm.price_used_value)
          : Number(gpuForm.price_new_value),
      price_new_value: gpuForm.price_new_value === "" ? 0 : Number(gpuForm.price_new_value),
      price_used_value: gpuForm.price_used_value === "" ? 0 : Number(gpuForm.price_used_value),
      tier: gpuForm.tier,
      score: gpuForm.score === "" ? 0 : Number(gpuForm.score),
      tokens_8b: 0,
      tokens_32b: 0,
      tokens_70b: 0,
    };

    try {
      const gpuResponse = gpuForm.id
        ? await updateGpu(gpuForm.id, payload)
        : await createGpu(payload);

      const savedGpuId = gpuForm.id || gpuResponse.gpu.id;
      await syncBenchmarks(savedGpuId, gpuForm.benchmarkRowsByModel);
      await loadDashboardData();
      resetGpuForm();
      showNotification(gpuForm.id ? "GPU modifié avec succès" : "GPU ajouté avec succès");
    } catch (saveError) {
      if (await handleActionError(saveError, "Failed to save GPU")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [gpuForm, handleActionError, loadDashboardData, resetGpuForm, showNotification]);

  const removeGpu = useCallback(async (gpuId) => {
    setSaving(true);
    setError("");

    try {
      await deleteGpu(gpuId);
      await loadDashboardData();
      if (gpuForm.id === gpuId) {
        resetGpuForm();
      }
      showNotification("GPU supprimé avec succès");
    } catch (deleteError) {
      if (await handleActionError(deleteError, "Failed to delete GPU")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [gpuForm.id, handleActionError, loadDashboardData, resetGpuForm, showNotification]);

  const saveModel = useCallback(async () => {
    setSaving(true);
    setError("");

    try {
      await createModel({
        name: newModelForm.name.trim(),
        params_billions: newModelForm.params_billions === "" ? null : Number(newModelForm.params_billions),
        total_params_billions:
          newModelForm.total_params_billions === "" ? null : Number(newModelForm.total_params_billions),
        max_context_size: newModelForm.max_context_size === "" ? null : Number(newModelForm.max_context_size),
        analytical_kv_cache_multiplier:
          newModelForm.analytical_kv_cache_multiplier === "" ? null : Number(newModelForm.analytical_kv_cache_multiplier),
        analytical_runtime_memory_multiplier:
          newModelForm.analytical_runtime_memory_multiplier === "" ? null : Number(newModelForm.analytical_runtime_memory_multiplier),
        analytical_runtime_memory_minimum:
          newModelForm.analytical_runtime_memory_minimum === "" ? null : Number(newModelForm.analytical_runtime_memory_minimum),
        analytical_context_penalty_multiplier:
          newModelForm.analytical_context_penalty_multiplier === "" ? null : Number(newModelForm.analytical_context_penalty_multiplier),
        analytical_context_penalty_floor:
          newModelForm.analytical_context_penalty_floor === "" ? null : Number(newModelForm.analytical_context_penalty_floor),
        analytical_offload_penalty_multiplier:
          newModelForm.analytical_offload_penalty_multiplier === "" ? null : Number(newModelForm.analytical_offload_penalty_multiplier),
        analytical_throughput_multiplier:
          newModelForm.analytical_throughput_multiplier === "" ? null : Number(newModelForm.analytical_throughput_multiplier),
        description: newModelForm.description.trim() || null,
      });

      setNewModelForm(resetNewModelForm());
      await loadDashboardData();
      showNotification("Modèle ajouté avec succès");
    } catch (modelError) {
      if (await handleActionError(modelError, "Failed to save model")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [handleActionError, loadDashboardData, newModelForm, showNotification]);

  const removeModel = useCallback(async (modelId) => {
    setSaving(true);
    setError("");

    try {
      await deleteModel(modelId);
      await loadDashboardData();
      showNotification("Modèle supprimé avec succès");
    } catch (modelError) {
      if (await handleActionError(modelError, "Failed to delete model")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [handleActionError, loadDashboardData, showNotification]);

  const saveExistingModel = useCallback(async (modelId, payload) => {
    setSaving(true);
    setError("");

    try {
      await updateModel(modelId, payload);
      await loadDashboardData();
      showNotification("Modèle mis à jour avec succès");
    } catch (modelError) {
      if (await handleActionError(modelError, "Failed to update model")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [handleActionError, loadDashboardData, showNotification]);

  const recomputeModelCalibration = useCallback(async (modelId) => {
    setSaving(true);
    setError("");

    try {
      const response = await recomputeModelAnalyticalProfile(modelId);
      await loadDashboardData();
      showNotification(
        `Coefficient recalculé depuis ${response.calibration?.benchmark_count ?? 0} benchmark(s)`,
        "success"
      );
    } catch (modelError) {
      if (await handleActionError(modelError, "Failed to recompute model calibration")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [handleActionError, loadDashboardData, showNotification]);

  const saveApiKey = useCallback(async () => {
    setSaving(true);
    setError("");

    try {
      const response = await createApiKey({
        name: apiKeyForm.name.trim(),
      });

      setApiKeyForm({ name: "" });
      setLatestCreatedApiKey(response.api_key);
      await loadDashboardData();
      showNotification("Clé API créée avec succès");
    } catch (apiKeyError) {
      if (await handleActionError(apiKeyError, "Failed to create API key")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [apiKeyForm.name, handleActionError, loadDashboardData, showNotification]);

  const removeApiKey = useCallback(async (apiKeyId) => {
    setSaving(true);
    setError("");

    try {
      await revokeApiKey(apiKeyId);
      await loadDashboardData();
      showNotification("Clé API révoquée");
    } catch (apiKeyError) {
      if (await handleActionError(apiKeyError, "Failed to revoke API key")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [handleActionError, loadDashboardData, showNotification]);

  const saveBackup = useCallback(async () => {
    setSaving(true);
    setError("");

    try {
      const response = await createBackup({ include_images: true });
      await loadDashboardData();
      showNotification(`Backup créé: ${response.backup.file_name}`, "success");
    } catch (backupError) {
      if (await handleActionError(backupError, "Failed to create backup")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [handleActionError, loadDashboardData, showNotification]);

  const downloadBackupFile = useCallback(async (fileName) => {
    setSaving(true);
    setError("");

    try {
      const { blob } = await downloadBackup(fileName);
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      showNotification(`Téléchargement lancé: ${fileName}`, "info");
    } catch (backupError) {
      if (await handleActionError(backupError, "Failed to download backup")) {
        return;
      }
    } finally {
      setSaving(false);
    }
  }, [handleActionError, showNotification]);

  return {
    addBenchmarkRow,
    apiKeyForm,
    apiKeys,
    backups,
    downloadBackupFile,
    error,
    filteredGpus,
    gpuForm,
    latestCreatedApiKey,
    loading,
    models,
    newModelForm,
    notification,
    removeApiKey,
    removeBenchmarkRow,
    removeGpu,
    removeModel,
    recomputeModelCalibration,
    resetGpuForm,
    saveApiKey,
    saveBackup,
    saveExistingModel,
    saveGpu,
    saveModel,
    saving,
    search,
    setApiKeyForm,
    setLatestCreatedApiKey,
    setNewModelForm,
    setSearch,
    setVendorFilter,
    showNotification,
    startEditGpu,
    updateGpuField,
    upsertBenchmarkRow,
    vendorFilter,
  };
}
