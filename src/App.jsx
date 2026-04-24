import { HeroSection } from "./components/sections/HeroSection.jsx";
import { DashboardSection } from "./components/sections/DashboardSection.jsx";
import { TablesSection } from "./components/sections/TablesSection.jsx";
import { InsightsSection } from "./components/sections/InsightsSection.jsx";
import { PurchaseCalculator } from "./components/calculator/PurchaseCalculator.jsx";
import { StatusSection } from "./components/sections/StatusSection.jsx";
import { useDashboardData } from "./hooks/useDashboardData.js";
import { useReveal } from "./hooks/useReveal.js";
import { applyPublicSeo, seoDefaults } from "./utils/seo.js";
import { useEffect } from "react";

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

  useEffect(() => {
    applyPublicSeo({
      title: seoDefaults.title,
      description: seoDefaults.description,
      path: "/",
    });
  }, []);

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
        <section className="section reveal" aria-label="Distinction benchmarks et simulateur">
          <div className="card glass status-card">
            <p>
              Les sections ci-dessus affichent des <strong>benchmarks mesurés</strong> issus du dataset.
              Le module ci-dessous est un <strong>simulateur analytique</strong> qui projette un debit
              estime a partir des metadonnees materiel et modele.
            </p>
          </div>
        </section>
        <PurchaseCalculator gpuData={gpuData} models={models} />
        <StatusSection error={error} loading={loading} />
      </main>

      <footer className="footer">
        <p>
          GPU LLM Benchmark 2026, visualisation web React du dépôt Benchmark-Gpu-for-llm. Développé par{" "}
          <a href="https://portfolio.jon-dev.fr/" target="_blank" rel="noreferrer">
            jon-dev
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
