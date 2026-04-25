import { useEffect } from "react";
import { PurchaseCalculator } from "../calculator/PurchaseCalculator.jsx";
import { Breadcrumbs } from "../common/Breadcrumbs.jsx";
import { PublicPageShell } from "../common/PublicSiteChrome.jsx";
import { useDashboardData } from "../../hooks/useDashboardData.js";
import { applyPublicSeo } from "../../utils/seo.js";

const breadcrumbs = [
  { href: "/", label: "Accueil" },
  { href: "/calculateur-llm", label: "Calculateur LLM" },
];

const calculatorJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GPU LLM Benchmark",
    url: "https://gpubenchmark.jon-dev.fr",
    description:
      "Benchmark GPU LLM en français : comparez des cartes graphiques IA, les débits mesurés, la VRAM et les prix pour choisir le bon GPU pour Llama, DeepSeek et l'inférence locale.",
    inLanguage: "fr",
    publisher: {
      "@type": "Organization",
      name: "jon-dev",
      url: "https://portfolio.jon-dev.fr/",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `https://gpubenchmark.jon-dev.fr${item.href}`,
    })),
  },
];

const highlights = [
  {
    kicker: "Entrée",
    title: "Choisir un couple GPU + modèle avant d'acheter",
    body:
      "Le calculateur sert d'abord à tester un scénario concret: un GPU réel du catalogue, un modèle réel présent en base, une quantization et un contexte proche de votre usage.",
  },
  {
    kicker: "Lecture",
    title: "Voir rapidement si la mémoire tient",
    body:
      "La projection met en avant la mémoire estimée et les avertissements. C'est la manière la plus rapide d'écarter une configuration sous-dimensionnée avant de regarder les benchmarks mesurés.",
  },
  {
    kicker: "Décision",
    title: "Croiser ensuite avec les fiches GPU",
    body:
      "Une estimation isolée ne suffit pas pour acheter. Une fois un scénario plausible trouvé, il faut revenir aux fiches GPU, aux comparatifs et aux pages modèle pour valider le débit réellement observé.",
  },
];

export function CalculatorPage() {
  const { gpuData, models } = useDashboardData();

  useEffect(() => {
    applyPublicSeo({
      title: "Calculateur GPU LLM | Estimation VRAM et débit",
      description:
        "Calculateur GPU LLM en français : estimez VRAM, mémoire totale et débit attendu selon le GPU, le modèle, la quantization et le contexte avant d'ouvrir les benchmarks mesurés.",
      path: "/calculateur-llm",
      jsonLd: calculatorJsonLd,
    });
  }, []);

  return (
    <PublicPageShell>
      <main className="main-content gpu-detail-shell" id="main-content" tabIndex="-1">
        <section className="section reveal visible">
          <div className="card glass gpu-detail-hero">
            <div className="gpu-detail-copy">
              <Breadcrumbs items={breadcrumbs} />
              <span className="section-kicker">Calculateur</span>
              <h1>Calculateur GPU LLM</h1>
              <p>
                Cette page vous aide à tester rapidement une configuration plausible avant achat:
                modèle, quantization, contexte, RAM, CPU et nombre de GPU. Le résultat reste une
                estimation analytique, pas un benchmark mesuré.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="#calculator">
                  Ouvrir le calculateur
                </a>
                <a className="btn btn-secondary" href="/guides/choisir-gpu-llm">
                  Lire le guide
                </a>
              </div>
            </div>

            <div className="gpu-detail-stats">
              <div className="metric-box">
                <span>Mesure clé</span>
                <strong>VRAM</strong>
                <span>marge mémoire avant tout</span>
              </div>
              <div className="metric-box">
                <span>Projection</span>
                <strong>Débit estimé</strong>
                <span>selon le scénario saisi</span>
              </div>
              <div className="metric-box">
                <span>Validation</span>
                <strong>Benchmarks</strong>
                <span>à vérifier ensuite sur le site</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="editorial-grid">
            {highlights.map((section) => (
              <article className="card glass editorial-card" key={section.title}>
                <span className="card-kicker">{section.kicker}</span>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Méthode</span>
                <h2>Comment utiliser ce calculateur sans se tromper</h2>
              </div>
            </div>
            <p className="page-intro">
              Commencez par un modèle réellement présent dans la base, choisissez une quantization crédible,
              entrez le contexte que vous visez vraiment, puis regardez la mémoire estimée avant le débit.
              Si la configuration paraît cohérente, ouvrez ensuite les fiches GPU et les comparatifs pour vérifier
              les résultats mesurés les plus proches de votre cas.
            </p>
          </div>
        </section>

        <PurchaseCalculator gpuData={gpuData} models={models} />

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Pour continuer</span>
                <h2>Pages utiles après une estimation</h2>
              </div>
            </div>
            <div className="content-link-grid">
              <a className="content-link-card" href="/guides/choisir-gpu-llm">
                Lire le guide pour choisir un GPU LLM
              </a>
              <a className="content-link-card" href="/comparatifs/vram/24go">
                Comparer les cartes 24 Go
              </a>
              <a className="content-link-card" href="/usages/local-ai">
                Voir les GPU pour local AI
              </a>
              <a className="content-link-card" href="/faq">
                Lire la FAQ benchmark GPU LLM
              </a>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
