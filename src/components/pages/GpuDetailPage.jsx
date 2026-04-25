import { useEffect, useMemo, useState } from "react";
import { applyPublicSeo } from "../../utils/seo.js";
import { findGpuBySlug, getGpuPath, getModelPath, getVendorPath } from "../../utils/data.js";
import { fetchGpuPriceHistory } from "../../services/dashboardApi.js";
import { createGpuPriceHistoryChartConfig } from "../../utils/chartConfigs.js";
import { ChartCanvas } from "../common/ChartCanvas.jsx";
import { Breadcrumbs } from "../common/Breadcrumbs.jsx";
import { PublicPageShell } from "../common/PublicSiteChrome.jsx";
import { formatNumber, formatPrice } from "../../utils/formatters.js";

function GpuPriceHistorySection({ gpu }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchGpuPriceHistory(gpu.id);
        if (!cancelled) {
          setHistory(response.history || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [gpu.id]);

  const newHistory = useMemo(
    () =>
      history
        .filter((entry) => Number(entry.price_new_value) > 0)
        .map((entry) => ({ recorded_at: entry.recorded_at, value: Number(entry.price_new_value) })),
    [history]
  );
  const usedHistory = useMemo(
    () =>
      history
        .filter((entry) => Number(entry.price_used_value) > 0)
        .map((entry) => ({ recorded_at: entry.recorded_at, value: Number(entry.price_used_value) })),
    [history]
  );

  return (
    <section className="section reveal">
      <div className="card glass">
        <div className="card-header">
          <div>
            <span className="card-kicker">Prix GPU</span>
            <h3>Historique du neuf et de l’occasion</h3>
          </div>
        </div>

        {loading ? <p className="empty-state-text">Chargement de l’historique de prix…</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !error && newHistory.length === 0 && usedHistory.length === 0 ? (
          <p className="empty-state-text">Aucun historique de prix n’est encore disponible pour cette carte.</p>
        ) : null}

        {!loading && !error && (newHistory.length > 0 || usedHistory.length > 0) ? (
          <div className="gpu-price-chart-grid">
            <article className="gpu-price-chart-card">
              <div className="card-header">
                <div>
                  <span className="card-kicker">Commerce</span>
                  <h3>Évolution du prix neuf</h3>
                </div>
              </div>
              {newHistory.length > 0 ? (
                <ChartCanvas
                  className="chart-container gpu-price-chart"
                  config={createGpuPriceHistoryChartConfig(newHistory, "Prix neuf", "#22c55e")}
                />
              ) : (
                <p className="empty-state-text">Pas de points disponibles pour le prix neuf.</p>
              )}
            </article>

            <article className="gpu-price-chart-card">
              <div className="card-header">
                <div>
                  <span className="card-kicker">Occasion</span>
                  <h3>Évolution du prix occasion</h3>
                </div>
              </div>
              {usedHistory.length > 0 ? (
                <ChartCanvas
                  className="chart-container gpu-price-chart"
                  config={createGpuPriceHistoryChartConfig(usedHistory, "Prix occasion", "#3b82f6")}
                />
              ) : (
                <p className="empty-state-text">Pas de points disponibles pour le prix occasion.</p>
              )}
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function GpuDetailPage({ gpuData, slug }) {
  const gpu = useMemo(() => findGpuBySlug(gpuData, slug), [gpuData, slug]);
  const benchmarks = useMemo(
    () => [...(gpu?.benchmarkResults || [])].sort((left, right) => right.tokens_per_second - left.tokens_per_second),
    [gpu]
  );
  const breadcrumbs = useMemo(
    () =>
      gpu
        ? [
            { href: "/", label: "Accueil" },
            { href: getVendorPath(gpu.vendor), label: gpu.vendor },
            { href: getGpuPath(gpu), label: gpu.name },
          ]
        : [],
    [gpu]
  );
  const relatedModels = useMemo(() => {
    if (!gpu) {
      return [];
    }

    const modelMap = new Map();
    benchmarks.forEach((benchmark) => {
      if (!modelMap.has(benchmark.model_name)) {
        modelMap.set(benchmark.model_name, {
          name: benchmark.model_name,
          href: getModelPath({ name: benchmark.model_name }),
        });
      }
    });

    return [...modelMap.values()].slice(0, 6);
  }, [benchmarks, gpu]);

  useEffect(() => {
    if (!gpu) {
      applyPublicSeo({
        title: "GPU introuvable | GPU LLM Benchmark",
        description: "La carte graphique demandée est introuvable dans le catalogue public GPU LLM Benchmark.",
        path: window.location.pathname,
      });
      return;
    }

    applyPublicSeo({
      title: `${gpu.name} | Benchmark GPU LLM`,
      description: `${gpu.name} (${gpu.vendor}) : VRAM, bande passante, score, benchmarks LLM et historique de prix neuf et occasion.`,
      path: getGpuPath(gpu),
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
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: "https://gpubenchmark.jon-dev.fr/" },
            {
              "@type": "ListItem",
              position: 2,
              name: gpu.vendor,
              item: `https://gpubenchmark.jon-dev.fr${getVendorPath(gpu.vendor)}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: gpu.name,
              item: `https://gpubenchmark.jon-dev.fr${getGpuPath(gpu)}`,
            },
          ],
        },
      ],
    });
  }, [gpu]);

  if (!gpu) {
    return (
      <PublicPageShell>
        <main className="main-content">
          <section className="section reveal visible">
            <div className="card glass">
              <span className="section-kicker">404</span>
              <h1>GPU introuvable</h1>
              <p>La fiche demandée n’existe pas ou n’est plus disponible dans le catalogue public.</p>
              <a className="btn btn-primary" href="/">
                Retour au catalogue
              </a>
            </div>
          </section>
        </main>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <main className="main-content gpu-detail-shell">
        <section className="section reveal visible">
          <div className="card glass gpu-detail-hero">
            <div className="gpu-detail-copy">
              <Breadcrumbs items={breadcrumbs} />
              <span className="section-kicker">Fiche GPU</span>
              <h1>{gpu.name}</h1>
              <p>
                {gpu.vendor} · {gpu.architecture} · {formatNumber(gpu.vram)} Go de VRAM.
                Cette page regroupe les repères techniques, les benchmarks LLM disponibles et le suivi des prix.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="/">
                  Retour au benchmark
                </a>
                <a className="btn btn-secondary" href="/#calculator">
                  Ouvrir le calculateur
                </a>
              </div>
            </div>

            <div className="gpu-detail-stats">
              <div className="metric-box">
                <span>Vendor</span>
                <strong>{gpu.vendor}</strong>
                <span>{gpu.architecture}</span>
              </div>
              <div className="metric-box">
                <span>VRAM</span>
                <strong>{formatNumber(gpu.vram)} Go</strong>
                <span>{formatNumber(gpu.bandwidth)} Go/s</span>
              </div>
              <div className="metric-box">
                <span>Prix repère</span>
                <strong>{formatPrice(gpu.priceNewValue || gpu.priceUsedValue || gpu.priceValue)}</strong>
                <span>score {gpu.score}/100</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Comparer</span>
                <h2>Étapes suivantes pour évaluer cette carte</h2>
              </div>
            </div>
            <div className="content-link-grid">
              <a className="content-link-card" href={getVendorPath(gpu.vendor)}>
                Voir tout le catalogue {gpu.vendor}
              </a>
              <a className="content-link-card" href="/guides/choisir-gpu-llm">
                Lire le guide pour choisir un GPU LLM
              </a>
              <a className="content-link-card" href="/faq">
                Ouvrir la FAQ benchmark GPU LLM
              </a>
              {relatedModels.map((model) => (
                <a className="content-link-card" href={model.href} key={model.href}>
                  Benchmarks pour {model.name}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Résumé</span>
                <h3>Points clés de {gpu.name}</h3>
              </div>
            </div>

            <div className="gpu-summary-grid">
              <div className="gpu-summary-card">
                <strong>Segment</strong>
                <p>{gpu.tier}</p>
              </div>
              <div className="gpu-summary-card">
                <strong>Benchmarks stockés</strong>
                <p>{formatNumber(gpu.coverageCount)}</p>
              </div>
              <div className="gpu-summary-card">
                <strong>Débit moyen mesuré</strong>
                <p>{gpu.averageTokens ? `${formatNumber(gpu.averageTokens)} t/s` : "Non disponible"}</p>
              </div>
              <div className="gpu-summary-card">
                <strong>Quantizations observées</strong>
                <p>{gpu.quantizations.length > 0 ? gpu.quantizations.join(", ") : "Non précisées"}</p>
              </div>
            </div>
          </div>
        </section>

        <GpuPriceHistorySection gpu={gpu} />

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Benchmarks LLM</span>
                <h3>Résultats mesurés disponibles pour {gpu.name}</h3>
              </div>
            </div>

            {benchmarks.length === 0 ? (
              <p className="empty-state-text">Aucun benchmark LLM n’est encore disponible pour cette carte.</p>
            ) : (
              <div className="table-wrap">
                <table className="benchmark-details-table">
                  <thead>
                    <tr>
                      <th>Modèle</th>
                      <th>GPU</th>
                      <th>Débit</th>
                      <th>Précision</th>
                      <th>Contexte</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarks.map((benchmark) => (
                      <tr key={benchmark.id}>
                        <td>{benchmark.model_name}</td>
                        <td>{benchmark.gpu_count || 1}x</td>
                        <td>{formatNumber(benchmark.tokens_per_second)} t/s</td>
                        <td>{benchmark.precision || "—"}</td>
                        <td>{benchmark.context_size ? formatNumber(benchmark.context_size) : "—"}</td>
                        <td>{benchmark.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
