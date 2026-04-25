import { useEffect, useMemo, useState } from "react";
import { fetchDashboardData, fetchPublicCatalogTableData } from "../services/dashboardApi.js";
import {
  filterGpuCatalog,
  getVendors,
  getBenchmarksForGpuAndModel,
  normalizeCatalogTableDataset,
  normalizePublicDataset,
  sortCatalogTableData,
} from "../utils/data.js";

export function useDashboardData() {
  const [gpuData, setGpuData] = useState([]);
  const [tableGpuData, setTableGpuData] = useState([]);
  const [models, setModels] = useState([]);
  const [benchmarkResults, setBenchmarkResults] = useState([]);
  const [totals, setTotals] = useState({
    gpus: 0,
    models: 0,
    benchmarkResults: 0,
    expectedBenchmarkCount: 0,
    coveragePercent: 0,
  });
  const [quantizations, setQuantizations] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState("all");
  const [tier, setTier] = useState("all");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [sort, setSort] = useState({ key: "coverageCount", direction: "desc" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [data, tableData] = await Promise.all([
          fetchDashboardData(),
          fetchPublicCatalogTableData(),
        ]);
        if (cancelled) {
          return;
        }

        const normalizedDataset = normalizePublicDataset(data.dataset);
        const normalizedTableDataset = normalizeCatalogTableDataset(tableData);

        setGpuData(normalizedDataset.gpus);
        setTableGpuData(normalizedTableDataset.gpus);
        setModels(normalizedDataset.models);
        setBenchmarkResults(normalizedDataset.benchmarkResults);
        setTotals(normalizedDataset.totals);
        setQuantizations(normalizedDataset.allQuantizations);
        setInsights(data.insights);
        setSelectedModelId((current) =>
          current && current !== "all"
            ? current
            : String(normalizedDataset.models[0]?.id ?? "all")
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedModel = useMemo(
    () => models.find((model) => String(model.id) === String(selectedModelId)) || null,
    [models, selectedModelId]
  );
  const sortedData = useMemo(() => {
    const filteredCatalog = filterGpuCatalog(
      tableGpuData.filter((gpu) => gpu.coverageCount > 0),
      { search, vendor, tier }
    );
    const enrichedCatalog = filteredCatalog.map((gpu) => {
      const selectedModelBenchmarks = selectedModel
        ? getBenchmarksForGpuAndModel(gpu, selectedModel.id)
        : [];
      const selectedModelBestBenchmark = selectedModelBenchmarks[0] || null;

      return {
        ...gpu,
        selectedModelBenchmarks,
        selectedModelCoverageCount: selectedModelBenchmarks.length,
        selectedModelBestBenchmark,
      };
    });
    const visibleCatalog = selectedModel
      ? enrichedCatalog.filter((gpu) => gpu.selectedModelCoverageCount > 0)
      : enrichedCatalog;

    return sortCatalogTableData(visibleCatalog, sort, selectedModelId);
  }, [search, selectedModel, selectedModelId, sort, tableGpuData, tier, vendor]);
  const vendors = useMemo(() => getVendors(gpuData), [gpuData]);

  return {
    benchmarkResults,
    error,
    gpuData,
    insights,
    loading,
    models,
    quantizations,
    search,
    selectedModel,
    selectedModelId,
    setSearch,
    setSelectedModelId,
    setSort,
    setTier,
    setVendor,
    sort,
    sortedData,
    tier,
    totals,
    vendor,
    vendors,
  };
}
