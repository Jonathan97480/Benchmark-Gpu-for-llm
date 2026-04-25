import { useEffect } from "react";
import { applyPublicSeo } from "../../utils/seo.js";
import { Breadcrumbs } from "../common/Breadcrumbs.jsx";
import { PublicPageShell } from "../common/PublicSiteChrome.jsx";

const breadcrumbs = [
  { href: "/", label: "Accueil" },
  { href: "/faq", label: "FAQ" },
];

const faqJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GPU LLM Benchmark",
    url: "https://gpubenchmark.jon-dev.fr",
    description:
      "Benchmark GPU pour LLM open source : comparez les cartes graphiques, les vendeurs et les performances mesurées pour choisir le bon matériel IA.",
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

const faqItems = [
  {
    question: "Comment choisir un GPU pour faire tourner un LLM en local ?",
    answer:
      "Il faut d’abord vérifier la VRAM nécessaire, puis comparer les benchmarks mesurés sur les modèles proches de votre usage. Le prix neuf et occasion sert ensuite à arbitrer le rapport coût/performance.",
  },
  {
    question: "Le score catalogue remplace-t-il les benchmarks ?",
    answer:
      "Non. Le score aide à lire rapidement le catalogue, mais les tokens par seconde mesurés restent la donnée la plus utile pour comparer des GPU sur un modèle précis.",
  },
  {
    question: "Pourquoi suivre séparément le prix neuf et le prix occasion ?",
    answer:
      "Parce qu’une carte peut être peu intéressante en neuf mais très compétitive en occasion. Le suivi séparé rend visible cette différence et améliore les décisions d’achat.",
  },
  {
    question: "Le calculateur donne-t-il un benchmark réel ?",
    answer:
      "Non. Le calculateur produit une estimation analytique à partir des métadonnées du GPU et du modèle. Les graphiques et tableaux du catalogue restent, eux, basés sur les résultats mesurés stockés dans la base.",
  },
  {
    question: "Quelles pages indexables le site propose déjà ?",
    answer:
      "Le site expose des fiches GPU, des pages vendor, des pages modèle LLM, ce guide d’achat et cette FAQ. Toutes ces URLs publiques sont intégrées au sitemap.",
  },
];

export function FaqPage() {
  useEffect(() => {
    applyPublicSeo({
      title: "FAQ GPU LLM Benchmark",
      description:
        "Questions fréquentes sur le benchmark GPU LLM : choix d’une carte graphique, lecture des benchmarks, prix neuf et occasion, calculateur et pages publiques.",
      path: "/faq",
      jsonLd: faqJsonLd,
    });
  }, []);

  return (
    <PublicPageShell>
      <main className="main-content gpu-detail-shell">
        <section className="section reveal visible">
          <div className="card glass gpu-detail-hero">
            <div className="gpu-detail-copy">
              <Breadcrumbs items={breadcrumbs} />
              <span className="section-kicker">FAQ</span>
              <h1>Questions fréquentes sur le benchmark GPU LLM</h1>
              <p>
                Cette FAQ répond aux questions les plus utiles pour comprendre le catalogue,
                lire les benchmarks et choisir un GPU adapté à vos usages LLM.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="/">
                  Retour au benchmark
                </a>
                <a className="btn btn-secondary" href="/guides/choisir-gpu-llm">
                  Lire le guide
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="faq-list">
            {faqItems.map((item) => (
              <article className="card glass faq-card" key={item.question}>
                <h2>{item.question}</h2>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Pour continuer</span>
                <h2>Les pages les plus utiles après la FAQ</h2>
              </div>
            </div>
            <div className="content-link-grid">
              <a className="content-link-card" href="/guides/choisir-gpu-llm">
                Lire le guide d'achat GPU LLM
              </a>
              <a className="content-link-card" href="/vendor/nvidia">
                Explorer les GPU NVIDIA
              </a>
              <a className="content-link-card" href="/vendor/amd">
                Explorer les GPU AMD
              </a>
              <a className="content-link-card" href="/vendor/intel">
                Explorer les GPU Intel
              </a>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
