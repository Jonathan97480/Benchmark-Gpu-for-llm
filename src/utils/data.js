export {
  DEFAULT_MODEL_ANALYTICAL_PROFILE,
  normalizeCatalogTableDataset,
  normalizeGpuMetadata,
  normalizeModelMetadata,
  normalizePublicDataset,
  resolveModelAnalyticalProfile,
} from "./data/normalizers.js";

export function sortData(data, sort) {
  const order = sort.direction === "asc" ? 1 : -1;

  return [...data].sort((a, b) => {
    const aValue = a[sort.key];
    const bValue = b[sort.key];

    if (typeof aValue === "string") {
      return aValue.localeCompare(bValue) * order;
    }

    return ((aValue ?? 0) - (bValue ?? 0)) * order;
  });
}

export function sortCatalogTableData(data, sort, selectedModelId) {
  const order = sort.direction === "asc" ? 1 : -1;

  return [...data].sort((a, b) => {
    let aValue = a[sort.key];
    let bValue = b[sort.key];

    if (sort.key === "coverageCount") {
      aValue = selectedModelId && selectedModelId !== "all" ? a.selectedModelCoverageCount : a.coverageCount;
      bValue = selectedModelId && selectedModelId !== "all" ? b.selectedModelCoverageCount : b.coverageCount;
    }

    if (sort.key === "selectedModelTokens") {
      aValue = a.selectedModelBestBenchmark?.tokens_per_second ?? 0;
      bValue = b.selectedModelBestBenchmark?.tokens_per_second ?? 0;
    }

    if (typeof aValue === "string") {
      return aValue.localeCompare(bValue) * order;
    }

    return ((aValue ?? 0) - (bValue ?? 0)) * order;
  });
}

export function slugifyGpuName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getGpuPath(gpu) {
  return `/gpu/${slugifyGpuName(gpu?.name)}`;
}

export function slugifyVendorName(vendor) {
  return String(vendor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getVendorPath(vendor) {
  return `/vendor/${slugifyVendorName(vendor)}`;
}

export function slugifyModelName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getModelPath(model) {
  return `/model/${slugifyModelName(model?.name)}`;
}

export function findGpuBySlug(gpus, slug) {
  return gpus.find((gpu) => slugifyGpuName(gpu.name) === slug) || null;
}

export function findVendorBySlug(gpus, slug) {
  const vendor = getVendors(gpus).find((item) => slugifyVendorName(item) === slug);
  return vendor || null;
}

export function findModelBySlug(models, slug) {
  return models.find((model) => slugifyModelName(model.name) === slug) || null;
}

export function filterGpuCatalog(data, filters) {
  const normalizedSearch = filters.search.toLowerCase().trim();

  return data.filter((item) => {
    const matchesSearch = [
      item.name,
      item.vendor,
      item.architecture,
      item.tier,
      item.quantizations.join(" "),
      item.bestBenchmark?.model_name || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
    const matchesVendor = filters.vendor === "all" || item.vendor === filters.vendor;
    const matchesTier = filters.tier === "all" || item.tier === filters.tier;

    return matchesSearch && matchesVendor && matchesTier;
  });
}

export function getVendors(data) {
  return [...new Set(data.map((item) => item.vendor))];
}

export function getTopAveragePerformance(data) {
  return [...data]
    .filter((gpu) => gpu.averageTokens)
    .sort((a, b) => b.averageTokens - a.averageTokens)
    .slice(0, 3);
}

export function getTopCoverage(data) {
  return [...data]
    .sort((a, b) => b.coverageCount - a.coverageCount || b.score - a.score)
    .slice(0, 3);
}

export function getBenchmarkForGpuAndModel(gpu, modelId) {
  return gpu.benchmarkResults.find((result) => result.llm_model_id === modelId) || null;
}

export function getBenchmarksForGpuAndModel(gpu, modelId) {
  return gpu.benchmarkResults
    .filter((result) => result.llm_model_id === modelId)
    .sort((a, b) => b.tokens_per_second - a.tokens_per_second || a.id - b.id);
}
