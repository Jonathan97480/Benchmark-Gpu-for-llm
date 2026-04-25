import { useEffect } from "react";
import { applyPublicSeo } from "../../utils/seo.js";
import { Breadcrumbs } from "../common/Breadcrumbs.jsx";
import { PublicPageShell } from "../common/PublicSiteChrome.jsx";

const breadcrumbs = [
  { href: "/", label: "Accueil" },
  { href: "/guides/choisir-gpu-llm", label: "Guide GPU LLM" },
];

const guideJsonLd = [
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

const guideSections = [
  {
    kicker: "1. VRAM",
    title: "Dimensionner d’abord la mémoire",
    body:
      "La VRAM reste le premier filtre. Un modèle compact quantifié peut tourner sur une carte grand public, mais les modèles plus lourds, les contextes longs et les usages multitâches demandent rapidement davantage de mémoire.",
  },
  {
    kicker: "2. Débit",
    title: "Regarder les benchmarks avant le score marketing",
    body:
      "Le site privilégie les mesures en tokens par seconde. Pour choisir un GPU LLM, il faut comparer le débit observé sur les modèles réellement testés, pas seulement la fiche technique brute.",
  },
  {
    kicker: "3. Prix",
    title: "Comparer neuf et occasion séparément",
    body:
      "L’historique de prix aide à distinguer une bonne carte d’un bon achat. Certaines références restent intéressantes en occasion alors qu’elles sont peu compétitives en neuf.",
  },
  {
    kicker: "4. Usage",
    title: "Choisir selon le contexte réel",
    body:
      "Inference locale, prototypage, workstation ou production n’impliquent pas les mêmes arbitrages. Le calculateur et les pages modèles servent justement à rapprocher le matériel d’un usage LLM concret.",
  },
];

const internalLinks = [
  { href: "/#calculator", label: "Ouvrir le calculateur" },
  { href: "/vendor/nvidia", label: "Explorer NVIDIA" },
  { href: "/vendor/amd", label: "Explorer AMD" },
  { href: "/vendor/intel", label: "Explorer Intel" },
  { href: "/faq", label: "Lire la FAQ benchmark GPU LLM" },
];

export function GuidePage() {
  useEffect(() => {
    applyPublicSeo({
      title: "Comment choisir un GPU pour LLM et Llama | Guide",
      description:
        "Guide pour choisir une carte graphique IA pour LLM et Llama : VRAM, débit mesuré, prix neuf, occasion et repères pour l'inférence locale.",
      path: "/guides/choisir-gpu-llm",
      jsonLd: guideJsonLd,
    });
  }, []);

  return (
    <PublicPageShell>
      <main className="main-content gpu-detail-shell" id="main-content" tabIndex="-1">
        <section className="section reveal visible">
          <div className="card glass gpu-detail-hero">
            <div className="gpu-detail-copy">
              <Breadcrumbs items={breadcrumbs} />
              <span className="section-kicker">Guide</span>
              <h1>Comment choisir un GPU pour LLM</h1>
              <p>
                Ce guide synthétise les critères qui comptent vraiment pour lire le catalogue public :
                mémoire, débit observé, niveaux de prix et adéquation avec vos modèles.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="/">
                  Retour au benchmark
                </a>
                <a className="btn btn-secondary" href="/faq">
                  Ouvrir la FAQ
                </a>
              </div>
            </div>

            <div className="gpu-detail-stats">
              <div className="metric-box">
                <span>Priorité 1</span>
                <strong>VRAM</strong>
                <span>compatibilité modèle</span>
              </div>
              <div className="metric-box">
                <span>Priorité 2</span>
                <strong>Débit réel</strong>
                <span>tokens/s mesurés</span>
              </div>
              <div className="metric-box">
                <span>Priorité 3</span>
                <strong>Prix</strong>
                <span>neuf et occasion</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="editorial-grid">
            {guideSections.map((section) => (
              <article className="card glass editorial-card" key={section.title}>
                <span className="card-kicker">{section.kicker}</span>
                <h3>{section.title}</h3>
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
                <h2>Comment utiliser le site pour choisir une carte</h2>
              </div>
            </div>
            <p className="page-intro">
              Commencez par vérifier si la carte a assez de VRAM pour votre modèle, puis regardez les benchmarks
              réellement mesurés sur des LLM proches de votre usage. Ensuite seulement, comparez le prix neuf,
              le prix occasion et les autres cartes du même vendor pour voir si le gain de performance vaut l’écart de budget.
            </p>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Aller plus loin</span>
                <h3>Où continuer selon votre besoin</h3>
              </div>
            </div>
            <div className="content-link-grid">
              {internalLinks.map((link) => (
                <a key={link.href} className="content-link-card" href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
