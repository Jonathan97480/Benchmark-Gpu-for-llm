import { useEffect, useMemo } from "react";
import { applyPublicSeo } from "../../utils/seo.js";
import { Breadcrumbs } from "../common/Breadcrumbs.jsx";
import { PublicPageShell } from "../common/PublicSiteChrome.jsx";
import { getGpuPath } from "../../utils/data.js";
import { formatNumber, formatPrice } from "../../utils/formatters.js";

function getKnownPrice(gpu) {
  return gpu.priceUsedValue || gpu.priceNewValue || gpu.priceValue || 0;
}

function buildUsageConfig(slug, gpuData) {
  const tested = gpuData.filter((gpu) => gpu.coverageCount > 0);

  if (slug === "local-ai") {
    const candidates = [...tested]
      .filter((gpu) => gpu.vram >= 16)
      .sort((left, right) => right.coverageCount - left.coverageCount || right.score - left.score);

    if (candidates.length === 0) {
      return null;
    }

    return {
      path: "/usages/local-ai",
      title: "Quels GPU regarder pour du local AI",
      description:
        "Sélection dynamique des GPU pertinents pour le local AI à partir des cartes réellement benchmarkées dans la base : VRAM, prix et couverture benchmark.",
      breadcrumbs: [
        { href: "/", label: "Accueil" },
        { href: "/usages/local-ai", label: "Local AI" },
      ],
      heroTitle: "Quels GPU regarder pour faire du local AI",
      heroBody:
        "Pour un poste local sérieux, il faut assez de VRAM pour vos modèles, une couverture benchmark utile et un prix cohérent avec votre budget. Cette page met en avant les cartes qui répondent le mieux à ces critères dans les données actuellement disponibles.",
      highlights: [
        { label: "Cartes retenues", value: `${formatNumber(candidates.length)} références` },
        { label: "La plus couverte", value: candidates[0].name },
        { label: "VRAM minimale ici", value: `${formatNumber(Math.min(...candidates.map((gpu) => gpu.vram)))} Go` },
      ],
      sections: [
        {
          title: "Ce qui compte pour une machine locale",
          body:
            "En local, la VRAM et la stabilité d'usage comptent souvent plus qu'un pic de performance isolé. Une carte bien couverte par les benchmarks vous donne aussi plus de repères concrets pour éviter d'acheter à l'aveugle.",
        },
        {
          title: "Comment lire cette sélection",
          body:
            "Commencez par les cartes qui cumulent assez de VRAM et plusieurs benchmarks. Ensuite, regardez leur prix réel, puis ouvrez leurs fiches pour vérifier les modèles testés et les débits mesurés qui ressemblent à votre usage.",
        },
        {
          title: `Repère concret dans la base actuelle`,
          body: `${candidates[0].name} est aujourd'hui la carte la plus couverte de cette sélection avec ${formatNumber(candidates[0].coverageCount)} benchmarks stockés. Elle donne donc davantage de matière pour juger un achat qu'une carte encore peu documentée.`,
        },
      ],
      tableRows: candidates.slice(0, 8).map((gpu) => ({
        metric: gpu.name,
        left: `${formatNumber(gpu.vram)} Go · ${formatNumber(gpu.bandwidth)} Go/s`,
        right: `${formatNumber(gpu.coverageCount)} benchmark(s) · ${formatPrice(getKnownPrice(gpu))}`,
      })),
      links: candidates.slice(0, 4).map((gpu) => ({ href: getGpuPath(gpu), label: `Voir la fiche ${gpu.name}` })),
    };
  }

  if (slug === "budget") {
    const candidates = [...tested]
      .filter((gpu) => getKnownPrice(gpu) > 0)
      .sort((left, right) => getKnownPrice(left) - getKnownPrice(right) || right.coverageCount - left.coverageCount);

    if (candidates.length === 0) {
      return null;
    }

    return {
      path: "/usages/budget",
      title: "Quels GPU regarder avec un budget serré",
      description:
        "Sélection dynamique des GPU avec prix renseigné et benchmarks disponibles pour repérer les cartes les plus intéressantes quand le budget compte vraiment.",
      breadcrumbs: [
        { href: "/", label: "Accueil" },
        { href: "/usages/budget", label: "Budget" },
      ],
      heroTitle: "Quels GPU regarder avec un budget serré",
      heroBody:
        "Cette sélection vise les cartes dont le prix est réellement renseigné dans la base. L'idée n'est pas de prendre la moins chère à tout prix, mais d'identifier celles qui gardent un usage LLM crédible sans faire exploser le budget.",
      highlights: [
        { label: "Cartes retenues", value: `${formatNumber(candidates.length)} références` },
        { label: "La moins chère observée", value: `${candidates[0].name} · ${formatPrice(getKnownPrice(candidates[0]))}` },
        { label: "Meilleure couverture prix/benchmarks", value: candidates.sort((a, b) => b.coverageCount - a.coverageCount || getKnownPrice(a) - getKnownPrice(b))[0].name },
      ],
      sections: [
        {
          title: "Le bon achat n'est pas toujours la carte la moins chère",
          body:
            "Une carte très peu chère peut vite devenir limitée si elle manque de VRAM ou de benchmarks utiles. Le plus pertinent est souvent de viser un palier où le prix reste raisonnable mais où la carte reste exploitable sur plusieurs usages LLM.",
        },
        {
          title: "Comment trier ces cartes",
          body:
            "Regardez d'abord le prix observé, puis la VRAM, puis le nombre de benchmarks déjà disponibles. Une carte un peu plus chère mais mieux couverte peut être plus sûre qu'une option très bon marché mais presque sans données.",
        },
        {
          title: "Ce que montre cette sélection aujourd'hui",
          body: `${candidates[0].name} ouvre actuellement la liste des cartes les moins chères observées à ${formatPrice(getKnownPrice(candidates[0]))}, mais ce n'est pas automatiquement la meilleure affaire si une autre carte ajoute plus de VRAM ou davantage de benchmarks pour un faible écart de prix.`,
        },
      ],
      tableRows: candidates.slice(0, 8).map((gpu) => ({
        metric: gpu.name,
        left: `${formatPrice(getKnownPrice(gpu))} · ${formatNumber(gpu.vram)} Go`,
        right: `${formatNumber(gpu.coverageCount)} benchmark(s) · score ${gpu.score}/100`,
      })),
      links: candidates.slice(0, 4).map((gpu) => ({ href: getGpuPath(gpu), label: `Voir la fiche ${gpu.name}` })),
    };
  }

  if (slug === "entreprise") {
    const candidates = [...tested]
      .filter((gpu) => gpu.tier === "enterprise" || gpu.vram >= 80)
      .sort((left, right) => right.vram - left.vram || right.bandwidth - left.bandwidth);

    if (candidates.length === 0) {
      return null;
    }

    return {
      path: "/usages/entreprise",
      title: "Quels GPU regarder pour un usage entreprise",
      description:
        "Sélection dynamique des GPU orientés entreprise ou très haute capacité mémoire, à partir des cartes réellement présentes dans la base.",
      breadcrumbs: [
        { href: "/", label: "Accueil" },
        { href: "/usages/entreprise", label: "Entreprise" },
      ],
      heroTitle: "Quels GPU regarder pour un usage entreprise",
      heroBody:
        "Pour un usage plus lourd, la question n'est plus seulement le prix d'entrée. Il faut regarder la capacité mémoire, la bande passante et la place de la carte dans un environnement plus exigeant, notamment pour les modèles très gros ou les charges plus continues.",
      highlights: [
        { label: "Cartes retenues", value: `${formatNumber(candidates.length)} références` },
        { label: "VRAM la plus élevée", value: `${formatNumber(candidates[0].vram)} Go` },
        { label: "Référence la mieux notée", value: [...candidates].sort((a, b) => b.score - a.score)[0].name },
      ],
      sections: [
        {
          title: "Quand regarder cette catégorie",
          body:
            "Ces cartes deviennent pertinentes si vous dépassez les usages de poste local classique, si vous ciblez des modèles beaucoup plus lourds ou si vous cherchez une marge mémoire que les cartes grand public n'offrent pas.",
        },
        {
          title: "Comment les comparer utilement",
          body:
            "La VRAM reste le premier filtre, mais elle ne suffit pas. Il faut aussi regarder la bande passante, les quelques benchmarks déjà disponibles et le contexte réel du déploiement avant d'arbitrer.",
        },
        {
          title: "Repère mémoire dans cette catégorie",
          body: `${candidates[0].name} offre actuellement la marge mémoire la plus haute de cette page avec ${formatNumber(candidates[0].vram)} Go. C'est utile si vous cherchez d'abord à éviter les compromis de chargement sur les modèles les plus lourds.`,
        },
      ],
      tableRows: candidates.slice(0, 8).map((gpu) => ({
        metric: gpu.name,
        left: `${formatNumber(gpu.vram)} Go · ${formatNumber(gpu.bandwidth)} Go/s`,
        right: `score ${gpu.score}/100 · ${formatPrice(getKnownPrice(gpu))}`,
      })),
      links: candidates.slice(0, 4).map((gpu) => ({ href: getGpuPath(gpu), label: `Voir la fiche ${gpu.name}` })),
    };
  }

  return null;
}

export function UsagePage({ gpuData, slug }) {
  const usage = useMemo(() => buildUsageConfig(slug, gpuData), [gpuData, slug]);

  useEffect(() => {
    if (!usage) {
      applyPublicSeo({
        title: "Page usage introuvable | GPU LLM Benchmark",
        description: "La page usage demandée est introuvable sur GPU LLM Benchmark.",
        path: window.location.pathname,
      });
      return;
    }

    applyPublicSeo({
      title: usage.title,
      description: usage.description,
      path: usage.path,
      jsonLd: [
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
          itemListElement: usage.breadcrumbs.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            item: `https://gpubenchmark.jon-dev.fr${item.href}`,
          })),
        },
      ],
    });
  }, [usage]);

  if (!usage) {
    return (
      <PublicPageShell>
        <main className="main-content" id="main-content" tabIndex="-1">
          <section className="section reveal visible">
            <div className="card glass">
              <span className="section-kicker">404</span>
              <h1>Page usage introuvable</h1>
              <p>Cette page n'est pas disponible avec les données actuelles.</p>
              <a className="btn btn-primary" href="/">
                Retour au benchmark
              </a>
            </div>
          </section>
        </main>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <main className="main-content gpu-detail-shell" id="main-content" tabIndex="-1">
        <section className="section reveal visible">
          <div className="card glass gpu-detail-hero">
            <div className="gpu-detail-copy">
              <Breadcrumbs items={usage.breadcrumbs} />
              <span className="section-kicker">Usage</span>
              <h1>{usage.heroTitle}</h1>
              <p>{usage.heroBody}</p>
            </div>

            <div className="gpu-detail-stats">
              {usage.highlights.map((item) => (
                <div className="metric-box" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="editorial-grid">
            {usage.sections.map((section) => (
              <article className="card glass editorial-card" key={section.title}>
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
                <span className="card-kicker">Sélection</span>
                <h2>Cartes à regarder dans cette catégorie</h2>
              </div>
            </div>

            <div className="table-wrap">
              <table className="benchmark-details-table">
                <caption className="sr-only">Sélection de GPU pour cet usage</caption>
                <thead>
                  <tr>
                    <th scope="col">GPU</th>
                    <th scope="col">Repère 1</th>
                    <th scope="col">Repère 2</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.tableRows.map((row) => (
                    <tr key={row.metric}>
                      <th scope="row">{row.metric}</th>
                      <td>{row.left}</td>
                      <td>{row.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Continuer</span>
                <h2>Ouvrir les fiches utiles</h2>
              </div>
            </div>
            <div className="content-link-grid">
              {usage.links.map((link) => (
                <a className="content-link-card" href={link.href} key={link.href}>
                  {link.label}
                </a>
              ))}
              <a className="content-link-card" href="/guides/choisir-gpu-llm">
                Lire le guide d'achat GPU LLM
              </a>
              <a className="content-link-card" href="/faq">
                Ouvrir la FAQ benchmark GPU LLM
              </a>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
