import { useEffect, useMemo } from "react";
import { applyPublicSeo } from "../../utils/seo.js";
import { Breadcrumbs } from "../common/Breadcrumbs.jsx";
import { PublicPageShell } from "../common/PublicSiteChrome.jsx";
import { getGpuPath, slugifyGpuName } from "../../utils/data.js";
import { formatNumber, formatPrice } from "../../utils/formatters.js";

function parseVramSlug(slug) {
  const match = String(slug || "").match(/^(\d+)go$/i);
  return match ? Number(match[1]) : null;
}

function buildGpuPairComparison(slug, gpuData) {
  const [leftSlug, rightSlug] = String(slug || "").split("-vs-");
  if (!leftSlug || !rightSlug) {
    return null;
  }

  const leftGpu = gpuData.find((gpu) => slugifyGpuName(gpu.name) === leftSlug) || null;
  const rightGpu = gpuData.find((gpu) => slugifyGpuName(gpu.name) === rightSlug) || null;

  if (!leftGpu || !rightGpu) {
    return null;
  }

  const sharedBenchmarks = leftGpu.benchmarkResults
    .map((leftBenchmark) => {
      const rightBenchmark = rightGpu.benchmarkResults.find(
        (candidate) =>
          candidate.llm_model_id === leftBenchmark.llm_model_id &&
          candidate.precision === leftBenchmark.precision
      );

      if (!rightBenchmark) {
        return null;
      }

      return {
        modelName: leftBenchmark.model_name,
        left: leftBenchmark,
        right: rightBenchmark,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.left.tokens_per_second - left.left.tokens_per_second);

  const topShared = sharedBenchmarks[0] || null;
  const throughputGain = topShared
    ? Math.round(
        ((topShared.right.tokens_per_second - topShared.left.tokens_per_second) / topShared.left.tokens_per_second) * 100
      )
    : null;
  const leftKnownPrice = leftGpu.priceUsedValue || leftGpu.priceNewValue || leftGpu.priceValue || 0;
  const rightKnownPrice = rightGpu.priceUsedValue || rightGpu.priceNewValue || rightGpu.priceValue || 0;
  const priceGap =
    leftKnownPrice > 0 && rightKnownPrice > 0 ? Math.abs(rightKnownPrice - leftKnownPrice) : null;

  return {
    path: `/comparatifs/gpu/${slug}`,
    title: `${leftGpu.name} vs ${rightGpu.name} pour LLM`,
    description: `Comparatif entre ${leftGpu.name} et ${rightGpu.name} pour LLM : VRAM, bande passante, prix et benchmarks réellement disponibles dans la base.`,
    breadcrumbs: [
      { href: "/", label: "Accueil" },
      { href: `/comparatifs/gpu/${slug}`, label: `${leftGpu.name} vs ${rightGpu.name}` },
    ],
    heroTitle: `${leftGpu.name} vs ${rightGpu.name} pour faire tourner des LLM`,
    heroBody:
      "Ce comparatif se base uniquement sur les cartes présentes dans la base et sur les benchmarks actuellement disponibles. L'objectif est de voir ce que vous gagnez réellement en mémoire, en débit et en souplesse d'usage avant d'arbitrer un achat.",
    highlights: [
      { label: leftGpu.name, value: `${formatNumber(leftGpu.vram)} Go · score ${leftGpu.score}/100` },
      { label: rightGpu.name, value: `${formatNumber(rightGpu.vram)} Go · score ${rightGpu.score}/100` },
      {
        label: "Benchmark commun",
        value: topShared
          ? `${topShared.modelName} · ${formatNumber(topShared.left.tokens_per_second)} t/s vs ${formatNumber(topShared.right.tokens_per_second)} t/s`
          : "Aucune mesure commune",
      },
    ],
    sections: [
      {
        title: "Ce qui change vraiment à l'usage",
        body: topShared
          ? `Sur ${topShared.modelName}, ${rightGpu.name} atteint ${formatNumber(topShared.right.tokens_per_second)} t/s contre ${formatNumber(topShared.left.tokens_per_second)} t/s pour ${leftGpu.name}. Le gain observé est d'environ ${throughputGain} %, ce qui aide à voir si l'écart de gamme se ressent réellement sur un modèle partagé.`
          : `Ces deux cartes ne partagent pas encore assez de benchmarks strictement comparables dans la base. Le plus fiable est alors de comparer la VRAM, la bande passante et les modèles déjà mesurés sur chacune avant d'en tirer une conclusion.`,
      },
      {
        title: `Quand préférer ${leftGpu.name}`,
        body: `${leftGpu.name} a du sens si sa VRAM, son prix observé et les benchmarks déjà disponibles couvrent vos usages cibles. C'est souvent le bon choix si vous voulez rester sur une carte plus connue, plus facile à trouver ou déjà suffisamment rapide pour vos modèles.`,
      },
      {
        title: `Quand préférer ${rightGpu.name}`,
        body: `${rightGpu.name} devient plus pertinente si vous cherchez davantage de marge mémoire, plus de bande passante ou une meilleure tenue sur des modèles lourds. Elle sera surtout intéressante si le budget suit et si vous voulez réduire les compromis sur les usages LLM les plus exigeants.`,
      },
      {
        title: "Écart budget contre écart mesuré",
        body:
          priceGap !== null
            ? `Dans les prix actuellement connus, l'écart entre ces deux cartes tourne autour de ${formatPrice(priceGap)}. L'intérêt réel dépend donc de la manière dont ce surcoût se transforme en marge mémoire ou en débit sur le benchmark commun déjà enregistré.`
            : "La lecture prix reste incomplète tant que les deux cartes n'ont pas chacune un repère neuf ou occasion exploitable. Dans ce cas, le benchmark commun et la VRAM deviennent les meilleurs points d'appui.",
      },
    ],
    tableRows: [
      { metric: "VRAM", left: `${formatNumber(leftGpu.vram)} Go`, right: `${formatNumber(rightGpu.vram)} Go` },
      { metric: "Bande passante", left: `${formatNumber(leftGpu.bandwidth)} Go/s`, right: `${formatNumber(rightGpu.bandwidth)} Go/s` },
      { metric: "Score catalogue", left: `${leftGpu.score}/100`, right: `${rightGpu.score}/100` },
      { metric: "Prix neuf", left: formatPrice(leftGpu.priceNewValue), right: formatPrice(rightGpu.priceNewValue) },
      { metric: "Prix occasion", left: formatPrice(leftGpu.priceUsedValue), right: formatPrice(rightGpu.priceUsedValue) },
      {
        metric: topShared ? topShared.modelName : "Benchmark commun",
        left: topShared ? `${formatNumber(topShared.left.tokens_per_second)} t/s` : "—",
        right: topShared ? `${formatNumber(topShared.right.tokens_per_second)} t/s` : "—",
      },
    ],
    links: [
      { href: getGpuPath(leftGpu), label: `Voir la fiche ${leftGpu.name}` },
      { href: getGpuPath(rightGpu), label: `Voir la fiche ${rightGpu.name}` },
      { href: "/guides/choisir-gpu-llm", label: "Lire le guide d'achat GPU LLM" },
      { href: "/faq", label: "Ouvrir la FAQ benchmark GPU LLM" },
    ],
  };
}

function buildVramComparison(slug, gpuData) {
  const targetVram = parseVramSlug(slug);
  if (!targetVram) {
    return null;
  }

  const candidates = gpuData
    .filter((gpu) => gpu.vram === targetVram)
    .sort((left, right) => right.score - left.score || (right.coverageCount || 0) - (left.coverageCount || 0));

  if (candidates.length === 0) {
    return null;
  }

  const topGpu = candidates[0];
  const cheapestGpu = [...candidates]
    .filter((gpu) => (gpu.priceNewValue || gpu.priceUsedValue || gpu.priceValue) > 0)
    .sort((left, right) => (left.priceNewValue || left.priceUsedValue || left.priceValue) - (right.priceNewValue || right.priceUsedValue || right.priceValue))[0] || null;
  const bestCoveredGpu = [...candidates].sort(
    (left, right) => (right.coverageCount || 0) - (left.coverageCount || 0) || right.score - left.score
  )[0] || null;

  return {
    path: `/comparatifs/vram/${slug}`,
    title: `Quel GPU ${targetVram} Go choisir pour LLM`,
    description: `Comparatif des GPU ${targetVram} Go présents dans la base : VRAM, prix, bande passante et benchmarks disponibles pour mieux choisir une carte LLM.`,
    breadcrumbs: [
      { href: "/", label: "Accueil" },
      { href: `/comparatifs/vram/${slug}`, label: `GPU ${targetVram} Go` },
    ],
    heroTitle: `Quel GPU ${targetVram} Go choisir pour faire tourner des LLM`,
    heroBody:
      "Cette page regroupe automatiquement les cartes de même capacité mémoire présentes dans la base. C'est utile quand vous cherchez une famille de GPU cohérente pour un budget ou une contrainte de modèle, sans comparer des cartes qui ne jouent pas dans la même catégorie.",
    highlights: [
      { label: "Cartes comparées", value: `${formatNumber(candidates.length)} référence(s)` },
      { label: "Référence la mieux notée", value: topGpu.name },
      { label: "Prix le plus bas observé", value: cheapestGpu ? `${cheapestGpu.name} · ${formatPrice(cheapestGpu.priceNewValue || cheapestGpu.priceUsedValue || cheapestGpu.priceValue)}` : "Non renseigné" },
    ],
    sections: [
      {
        title: `Pourquoi regarder d'abord les cartes ${targetVram} Go`,
        body: `À ${targetVram} Go, vous comparez des cartes qui peuvent souvent viser des modèles et des contextes similaires. Cela évite de mélanger une carte trop courte en mémoire avec une carte beaucoup plus large, ce qui fausse vite les arbitrages.`,
      },
      {
        title: "Le meilleur choix n'est pas toujours la carte la plus rapide",
        body: "Une carte peut avoir un meilleur score global tout en étant moins intéressante à l'achat si son prix est mal placé ou si elle dispose de peu de benchmarks sur les modèles que vous ciblez. Le bon choix dépend du compromis entre mémoire, débit disponible et budget réel.",
      },
      {
        title: "Comment utiliser ce tableau",
        body: "Commencez par repérer les cartes qui ont à la fois une couverture benchmark suffisante et un prix connu. Ensuite, ouvrez leurs fiches pour vérifier les modèles testés, la précision utilisée et l'écart entre neuf et occasion avant de décider.",
      },
      {
        title: "Repère concret dans cette famille mémoire",
        body: bestCoveredGpu
          ? `${bestCoveredGpu.name} est actuellement la carte ${targetVram} Go la mieux documentée dans la base avec ${formatNumber(bestCoveredGpu.coverageCount)} benchmarks. C'est souvent un meilleur point de départ qu'une carte un peu plus rapide mais encore peu couverte.`
          : `Le bon point de départ est la carte ${targetVram} Go qui cumule assez de benchmarks et un prix exploitable.`,
      },
    ],
    tableRows: candidates.map((gpu) => ({
      metric: gpu.name,
      left: `${formatNumber(gpu.bandwidth)} Go/s · score ${gpu.score}/100`,
      right: `${formatPrice(gpu.priceNewValue || gpu.priceUsedValue || gpu.priceValue)} · ${formatNumber(gpu.coverageCount)} benchmark(s)`,
    })),
    links: [
      ...candidates.slice(0, 4).map((gpu) => ({ href: getGpuPath(gpu), label: `Voir la fiche ${gpu.name}` })),
      { href: "/guides/choisir-gpu-llm", label: "Lire le guide d'achat GPU LLM" },
      { href: "/faq", label: "Ouvrir la FAQ benchmark GPU LLM" },
    ],
  };
}

function getComparisonConfig(mode, slug, gpuData) {
  if (mode === "gpu") {
    return buildGpuPairComparison(slug, gpuData);
  }

  if (mode === "vram") {
    return buildVramComparison(slug, gpuData);
  }

  return null;
}

export function ComparisonPage({ gpuData, mode, slug }) {
  const comparison = useMemo(() => getComparisonConfig(mode, slug, gpuData), [gpuData, mode, slug]);

  useEffect(() => {
    if (!comparison) {
      applyPublicSeo({
        title: "Comparatif introuvable | GPU LLM Benchmark",
        description: "Le comparatif demandé est introuvable sur GPU LLM Benchmark.",
        path: window.location.pathname,
      });
      return;
    }

    applyPublicSeo({
      title: comparison.title,
      description: comparison.description,
      path: comparison.path,
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
          itemListElement: comparison.breadcrumbs.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            item: `https://gpubenchmark.jon-dev.fr${item.href}`,
          })),
        },
      ],
    });
  }, [comparison]);

  if (!comparison) {
    return (
      <PublicPageShell>
        <main className="main-content" id="main-content" tabIndex="-1">
          <section className="section reveal visible">
            <div className="card glass">
              <span className="section-kicker">404</span>
              <h1>Comparatif introuvable</h1>
              <p>La page demandée n'existe pas ou n'est pas encore disponible avec les données actuelles.</p>
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
              <Breadcrumbs items={comparison.breadcrumbs} />
              <span className="section-kicker">Comparatif</span>
              <h1>{comparison.heroTitle}</h1>
              <p>{comparison.heroBody}</p>
            </div>

            <div className="gpu-detail-stats">
              {comparison.highlights.map((item) => (
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
            {comparison.sections.map((section) => (
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
                <span className="card-kicker">Tableau de lecture</span>
                <h2>Résumé rapide du comparatif</h2>
              </div>
            </div>

            <div className="table-wrap">
              <table className="benchmark-details-table">
                <caption className="sr-only">Résumé tabulaire du comparatif</caption>
                <thead>
                  <tr>
                    <th scope="col">Critère</th>
                    <th scope="col">Repère 1</th>
                    <th scope="col">Repère 2</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.tableRows.map((row) => (
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
                <h2>Pages utiles après ce comparatif</h2>
              </div>
            </div>
            <div className="content-link-grid">
              {comparison.links.map((link) => (
                <a className="content-link-card" href={link.href} key={link.href}>
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
