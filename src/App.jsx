import { Suspense, lazy, useEffect } from "react";
import { HeroSection } from "./components/sections/HeroSection.jsx";
import { TablesSection } from "./components/sections/TablesSection.jsx";
import { ContentHubSection } from "./components/sections/ContentHubSection.jsx";
import { StatusSection } from "./components/sections/StatusSection.jsx";
import { PublicPageShell } from "./components/common/PublicSiteChrome.jsx";
import { useDashboardData } from "./hooks/useDashboardData.js";
import { useReveal } from "./hooks/useReveal.js";
import { applyPublicSeo, seoDefaults } from "./utils/seo.js";

const DashboardSection = lazy(() =>
  import("./components/sections/DashboardSection.jsx").then((module) => ({
    default: module.DashboardSection,
  }))
);
const InsightsSection = lazy(() =>
  import("./components/sections/InsightsSection.jsx").then((module) => ({
    default: module.InsightsSection,
  }))
);
const PurchaseCalculator = lazy(() =>
  import("./components/calculator/PurchaseCalculator.jsx").then((module) => ({
    default: module.PurchaseCalculator,
  }))
);

function SectionSkeleton({ kicker, title, text }) {
  return (
    <section className="section reveal visible">
      <div className="card glass deferred-section-card">
        <span className="section-kicker">{kicker}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </section>
  );
}

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
    <PublicPageShell showHeader={false}>
      <HeroSection
        gpuData={gpuData}
        models={models}
        totals={totals}
        quantizations={quantizations}
      />

      <main className="main-content" id="main-content" tabIndex="-1">
        <Suspense
          fallback={
            <SectionSkeleton
              kicker="Dashboard"
              title="Chargement des visualisations"
              text="Les graphiques interactifs arrivent juste après les données essentielles de la page."
            />
          }
        >
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
        </Suspense>
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
        <ContentHubSection gpuData={gpuData} />
        <Suspense
          fallback={
            <SectionSkeleton
              kicker="Analyse"
              title="Chargement des synthèses"
              text="Les cartes de lecture rapide sont chargées après les tableaux et les pages éditoriales."
            />
          }
        >
          <InsightsSection insights={insights} loading={loading} />
        </Suspense>
        <section className="section reveal" aria-label="Distinction benchmarks et simulateur">
          <div className="card glass status-card">
            <p>
              Les sections ci-dessus affichent des <strong>benchmarks mesurés</strong> issus du dataset.
              Le module ci-dessous est un <strong>simulateur analytique</strong> qui projette un debit
              estime a partir des metadonnees materiel et modele.
            </p>
          </div>
        </section>
        <Suspense
          fallback={
            <SectionSkeleton
              kicker="Simulateur analytique"
              title="Chargement du simulateur"
              text="Le simulateur d’estimation se charge à part pour ne pas retarder l’ouverture du comparatif principal."
            />
          }
        >
          <PurchaseCalculator gpuData={gpuData} models={models} />
        </Suspense>
        <StatusSection error={error} loading={loading} />
      </main>
    </PublicPageShell>
  );
}
