import { HeroSection } from "./components/sections/HeroSection.jsx";
import { DashboardSection } from "./components/sections/DashboardSection.jsx";
import { TablesSection } from "./components/sections/TablesSection.jsx";
import { InsightsSection } from "./components/sections/InsightsSection.jsx";
import { StatusSection } from "./components/sections/StatusSection.jsx";
import { useDashboardData } from "./hooks/useDashboardData.js";
import { useReveal } from "./hooks/useReveal.js";

export default function App() {
  const {
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
  } = useDashboardData();

  useReveal([
    gpuData.length,
    models.length,
    benchmarkResults.length,
    insights.length,
    loading,
    search,
    vendor,
    tier,
    sort.key,
    sort.direction,
    selectedModelId,
  ]);

  return (
    <div className="app-shell">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-grid"></div>

      <HeroSection
        gpuData={gpuData}
        models={models}
        totals={totals}
        quantizations={quantizations}
      />

      <main className="main-content">
        <DashboardSection
          benchmarkResults={benchmarkResults}
          gpuData={gpuData}
          models={models}
          quantizations={quantizations}
          selectedModel={selectedModel}
          selectedModelId={selectedModelId}
          setSelectedModelId={setSelectedModelId}
          totals={totals}
        />
        <TablesSection
          gpuData={gpuData}
          models={models}
          search={search}
          selectedModel={selectedModel}
          selectedModelId={selectedModelId}
          setSearch={setSearch}
          setSelectedModelId={setSelectedModelId}
          setSort={setSort}
          setTier={setTier}
          setVendor={setVendor}
          sortedData={sortedData}
          tier={tier}
          vendor={vendor}
          vendors={vendors}
        />
        <InsightsSection insights={insights} loading={loading} />
        <StatusSection error={error} loading={loading} />
      </main>

      <footer className="footer">
        <p>GPU LLM Benchmark 2026, visualisation web React du dépôt Benchmark-Gpu-for-llm.</p>
      </footer>
    </div>
  );
}
