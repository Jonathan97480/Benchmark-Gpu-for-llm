import { useEffect, useMemo, useState } from "react";
import { fetchDashboardData } from "../services/dashboardApi.js";
import {
  filterGpuCatalog,
  getVendors,
  normalizePublicDataset,
  sortData,
} from "../utils/data.js";

export function useDashboardData() {
  const [gpuData, setGpuData] = useState([]);
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

        const data = await fetchDashboardData();
        if (cancelled) {
          return;
        }

        const normalizedDataset = normalizePublicDataset(data.dataset);

        setGpuData(normalizedDataset.gpus);
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

  const sortedData = useMemo(
    () =>
      sortData(
        filterGpuCatalog(
          gpuData.filter((gpu) => gpu.coverageCount > 0),
          { search, vendor, tier }
        ),
        sort
      ),
    [gpuData, search, sort, tier, vendor]
  );
  const vendors = useMemo(() => getVendors(gpuData), [gpuData]);
  const selectedModel = useMemo(
    () => models.find((model) => String(model.id) === String(selectedModelId)) || null,
    [models, selectedModelId]
  );

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
