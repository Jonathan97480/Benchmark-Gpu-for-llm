export async function fetchDashboardData() {
  const [datasetResponse, insightsResponse] = await Promise.all([
    fetch("/api/v1/gpu/public-dataset"),
    fetch("/api/v1/insights"),
  ]);

  if (!datasetResponse.ok || !insightsResponse.ok) {
    throw new Error("Impossible de charger les données publiques depuis l'API.");
  }

  const dataset = await datasetResponse.json();
  const insightsResult = await insightsResponse.json();

  return {
    dataset,
    insights: insightsResult.insights || [],
  };
}

export async function fetchPublicCatalogTableData() {
  const response = await fetch("/api/v1/gpu/public-catalog-table");

  if (!response.ok) {
    throw new Error("Impossible de charger les données de la table publique depuis l'API.");
  }

  return response.json();
}

export async function fetchGpuPriceHistory(gpuId) {
  const response = await fetch(`/api/v1/gpu/${gpuId}/price-history`);

  if (!response.ok) {
    throw new Error("Impossible de charger l'historique de prix de ce GPU.");
  }

  return response.json();
}
