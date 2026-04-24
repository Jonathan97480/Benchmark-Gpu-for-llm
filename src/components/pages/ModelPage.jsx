import { useEffect, useMemo } from "react";
import { applyPublicSeo } from "../../utils/seo.js";
import { findModelBySlug, getGpuPath, getModelPath } from "../../utils/data.js";
import { formatNumber } from "../../utils/formatters.js";

export function ModelPage({ gpuData, models, slug }) {
  const model = useMemo(() => findModelBySlug(models, slug), [models, slug]);
  const benchmarks = useMemo(
    () =>
      model
        ? [...(model.benchmarks || [])].sort((left, right) => right.tokens_per_second - left.tokens_per_second)
        : [],
    [model]
  );

  const rankedGpus = useMemo(() => {
    if (!model) {
      return [];
    }

    return gpuData
      .map((gpu) => ({
        ...gpu,
        benchmark: gpu.benchmarkResults.find((entry) => entry.llm_model_id === model.id) || null,
      }))
      .filter((gpu) => gpu.benchmark)
      .sort((left, right) => right.benchmark.tokens_per_second - left.benchmark.tokens_per_second);
  }, [gpuData, model]);

  useEffect(() => {
    if (!model) {
      applyPublicSeo({
        title: "Modèle introuvable | GPU LLM Benchmark",
        description: "Le modèle LLM demandé est introuvable dans le catalogue public GPU LLM Benchmark.",
        path: window.location.pathname,
      });
      return;
    }

    applyPublicSeo({
      title: `${model.name} | Benchmark LLM`,
      description: `${model.name} : benchmarks GPU disponibles, débit mesuré, contexte max et cartes compatibles sur GPU LLM Benchmark.`,
      path: getModelPath(model),
    });
  }, [model]);

  if (!model) {
    return (
      <div className="app-shell">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-grid"></div>
        <main className="main-content">
          <section className="section reveal visible">
            <div className="card glass">
              <span className="section-kicker">404</span>
              <h1>Modèle introuvable</h1>
              <p>Le modèle demandé n’existe pas dans le catalogue public.</p>
              <a className="btn btn-primary" href="/">
                Retour au benchmark
              </a>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-grid"></div>

      <main className="main-content gpu-detail-shell">
        <section className="section reveal visible">
          <div className="card glass gpu-detail-hero">
            <div className="gpu-detail-copy">
              <span className="section-kicker">Modèle LLM</span>
              <h1>{model.name}</h1>
              <p>
                Cette page regroupe les benchmarks GPU disponibles pour {model.name},
                les débits observés et les cartes les mieux placées dans le catalogue public.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="/">
                  Retour au benchmark
                </a>
                <a className="btn btn-secondary" href="/#tables">
                  Retour au catalogue
                </a>
              </div>
            </div>

            <div className="gpu-detail-stats">
              <div className="metric-box">
                <span>Paramètres actifs</span>
                <strong>{formatNumber(model.params_billions)}B</strong>
                <span>LLM suivi publiquement</span>
              </div>
              <div className="metric-box">
                <span>Paramètres totaux</span>
                <strong>{formatNumber(model.total_params_billions)}B</strong>
                <span>charge mémoire théorique</span>
              </div>
              <div className="metric-box">
                <span>GPUs testés</span>
                <strong>{formatNumber(model.testedGpuCount)}</strong>
                <span>{model.max_context_size ? `${formatNumber(model.max_context_size)} tokens max` : "contexte max non précisé"}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Classement GPU</span>
                <h3>Meilleures cartes pour {model.name}</h3>
              </div>
            </div>

            {rankedGpus.length === 0 ? (
              <p className="empty-state-text">Aucun benchmark GPU n’est encore disponible pour ce modèle.</p>
            ) : (
              <div className="table-wrap">
                <table className="benchmark-details-table">
                  <thead>
                    <tr>
                      <th>GPU</th>
                      <th>Vendor</th>
                      <th>Débit</th>
                      <th>Précision</th>
                      <th>Contexte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedGpus.map((gpu) => (
                      <tr key={gpu.id}>
                        <td>
                          <a className="gpu-detail-link" href={getGpuPath(gpu)}>
                            {gpu.name}
                          </a>
                        </td>
                        <td>{gpu.vendor}</td>
                        <td>{formatNumber(gpu.benchmark.tokens_per_second)} t/s</td>
                        <td>{gpu.benchmark.precision || "—"}</td>
                        <td>{gpu.benchmark.context_size ? formatNumber(gpu.benchmark.context_size) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Benchmarks détaillés</span>
                <h3>Résultats mesurés pour {model.name}</h3>
              </div>
            </div>

            {benchmarks.length === 0 ? (
              <p className="empty-state-text">Aucune mesure détaillée n’est encore disponible pour ce modèle.</p>
            ) : (
              <div className="table-wrap">
                <table className="benchmark-details-table">
                  <thead>
                    <tr>
                      <th>GPU</th>
                      <th>Débit</th>
                      <th>Précision</th>
                      <th>Contexte</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarks.map((benchmark) => {
                      const gpu = gpuData.find((entry) => entry.id === benchmark.gpu_id);
                      return (
                        <tr key={benchmark.id}>
                          <td>
                            {gpu ? (
                              <a className="gpu-detail-link" href={getGpuPath(gpu)}>
                                {gpu.name}
                              </a>
                            ) : (
                              benchmark.gpu_name || "GPU inconnu"
                            )}
                          </td>
                          <td>{formatNumber(benchmark.tokens_per_second)} t/s</td>
                          <td>{benchmark.precision || "—"}</td>
                          <td>{benchmark.context_size ? formatNumber(benchmark.context_size) : "—"}</td>
                          <td>{benchmark.notes || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
