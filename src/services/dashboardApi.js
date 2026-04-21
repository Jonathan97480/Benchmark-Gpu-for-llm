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
