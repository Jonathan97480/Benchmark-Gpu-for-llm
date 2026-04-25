import { useEffect, useMemo, useState } from "react";
import { getBenchmarkForGpuAndModel, getGpuPath } from "../../utils/data.js";
import { formatNumber, formatPrice } from "../../utils/formatters.js";
import { fetchGpuPriceHistory } from "../../services/dashboardApi.js";
import { ChartCanvas } from "../common/ChartCanvas.jsx";
import { createGpuPriceHistoryChartConfig } from "../../utils/chartConfigs.js";

function GpuCountBadge({ count }) {
  return (
    <span className="gpu-count-badge" aria-label={`${count} carte${count > 1 ? "s" : ""} utilisee${count > 1 ? "s" : ""}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4" y="7" width="16" height="10" rx="2" />
        <rect x="7" y="10" width="6" height="4" rx="1" className="gpu-count-badge-screen" />
        <circle cx="16.5" cy="12" r="1.2" className="gpu-count-badge-dot" />
      </svg>
      <strong>{count}</strong>
    </span>
  );
}

function SelectedModelResult({ benchmark }) {
  if (!benchmark) {
    return <span className="matrix-empty">Non testé</span>;
  }

  return (
    <div className="table-benchmark">
      <strong>{formatNumber(benchmark.tokens_per_second)} t/s</strong>
      {benchmark.gpu_count > 1 ? <span>{benchmark.gpu_count}x GPU</span> : null}
      <span>{benchmark.precision || "Quantization non précisée"}</span>
    </div>
  );
}

function BenchmarkDetailsPanel({ gpu, onClose }) {
  const benchmarks = [...gpu.benchmarkResults].sort(
    (a, b) => b.tokens_per_second - a.tokens_per_second
  );

  return (
    <div className="benchmark-panel-overlay" role="dialog" aria-modal="true" aria-labelledby="benchmark-panel-title">
      <div className="benchmark-panel glass">
        <div className="benchmark-panel-header">
          <div>
            <span className="card-kicker">Benchmarks détaillés</span>
            <h3 id="benchmark-panel-title">{gpu.name}</h3>
          </div>
          <button className="benchmark-panel-close" type="button" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="table-wrap">
          <table className="benchmark-details-table">
            <caption className="sr-only">Benchmarks détaillés disponibles pour {gpu.name}</caption>
            <thead>
              <tr>
                <th scope="col">Modèle</th>
                <th scope="col">GPU</th>
                <th scope="col">Débit</th>
                <th scope="col">Précision</th>
                <th scope="col">Contexte</th>
                <th scope="col">Notes</th>
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
      </div>
    </div>
  );
}

function GpuPriceHistoryPanel({ gpu, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

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
    <div className="benchmark-panel-overlay" role="dialog" aria-modal="true" aria-labelledby="gpu-price-panel-title">
      <div className="benchmark-panel glass gpu-price-panel">
        <div className="benchmark-panel-header">
          <div>
            <span className="card-kicker">Historique des prix</span>
            <h3 id="gpu-price-panel-title">{gpu.name}</h3>
            <p className="table-note">
              Courbes séparées pour le prix neuf et le prix occasion de cette carte graphique.
            </p>
          </div>
          <button className="benchmark-panel-close" type="button" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        {loading ? <p className="empty-state-text">Chargement de l’historique…</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !error && newHistory.length === 0 && usedHistory.length === 0 ? (
          <p className="empty-state-text">Aucun historique de prix n’est encore disponible pour ce GPU.</p>
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
                  config={createGpuPriceHistoryChartConfig(newHistory, "Prix neuf", "#67e8f9")}
                />
              ) : (
                <p className="empty-state-text">Pas encore de points enregistrés pour le prix neuf.</p>
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
                  config={createGpuPriceHistoryChartConfig(usedHistory, "Prix occasion", "#22c55e")}
                />
              ) : (
                <p className="empty-state-text">Pas encore de points enregistrés pour le prix occasion.</p>
              )}
            </article>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function GpuTable({ selectedModel, setSort, sortedData }) {
  const [detailGpu, setDetailGpu] = useState(null);
  const [priceHistoryGpu, setPriceHistoryGpu] = useState(null);

  useEffect(() => {
    if (!detailGpu && !priceHistoryGpu) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }

      setDetailGpu(null);
      setPriceHistoryGpu(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [detailGpu, priceHistoryGpu]);

  function toggleSort(key) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" }
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table className="catalog-table">
          <caption className="sr-only">
            Catalogue public des GPU avec vendor, architecture, mémoire, prix et couverture benchmark
          </caption>
          <thead>
            <tr>
              <th scope="col"><button className="table-sort-button" type="button" onClick={() => toggleSort("name")}>Carte</button></th>
              <th scope="col"><button className="table-sort-button" type="button" onClick={() => toggleSort("vendor")}>Vendor</button></th>
              <th scope="col"><button className="table-sort-button" type="button" onClick={() => toggleSort("architecture")}>Architecture</button></th>
              <th scope="col"><button className="table-sort-button" type="button" onClick={() => toggleSort("vram")}>VRAM</button></th>
              <th scope="col"><button className="table-sort-button" type="button" onClick={() => toggleSort("bandwidth")}>Bande passante</button></th>
              <th scope="col"><button className="table-sort-button" type="button" onClick={() => toggleSort("coverageCount")}>Benchmarks</button></th>
              <th scope="col"><button className="table-sort-button" type="button" onClick={() => toggleSort("averageTokens")}>Moyenne mesurée</button></th>
              <th scope="col">{selectedModel ? selectedModel.name : "Résultat modèle sélectionné"}</th>
              <th scope="col"><button className="table-sort-button" type="button" onClick={() => toggleSort("priceNewValue")}>Prix neuf</button></th>
              <th scope="col"><button className="table-sort-button" type="button" onClick={() => toggleSort("priceUsedValue")}>Prix occasion</button></th>
              <th scope="col"><button className="table-sort-button" type="button" onClick={() => toggleSort("score")}>Score</button></th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={11}>Aucune donnée disponible</td>
              </tr>
            ) : (
              sortedData.map((item) => (
                <tr key={item.name}>
                  <th scope="row">
                    <div className="gpu-name-block">
                      <button
                        className="gpu-name-button"
                        type="button"
                        onClick={() => setPriceHistoryGpu(item)}
                      >
                        <strong>{item.name}</strong>
                      </button>
                      {(() => {
                        const countSource = selectedModel
                          ? getBenchmarkForGpuAndModel(item, selectedModel.id) || item.bestBenchmark
                          : item.bestBenchmark;

                        return <GpuCountBadge count={countSource?.gpu_count || 1} />;
                      })()}
                    </div>
                    <br />
                    <span className={`badge ${item.tier}`}>{item.tier}</span>
                    <div className="gpu-detail-link-row">
                      <a className="gpu-detail-link" href={getGpuPath(item)}>
                        Voir la fiche GPU
                      </a>
                    </div>
                  </th>
                  <td>{item.vendor}</td>
                  <td>{item.architecture}</td>
                  <td>{formatNumber(item.vram)} Go</td>
                  <td>{formatNumber(item.bandwidth)} Go/s</td>
                  <td>
                    <button
                      className="benchmark-count-button"
                      type="button"
                      onClick={() => setDetailGpu(item)}
                    >
                      {formatNumber(item.coverageCount)}
                    </button>
                  </td>
                  <td>{item.averageTokens ? `${formatNumber(item.averageTokens)} t/s` : "—"}</td>
                  <td>
                    <SelectedModelResult
                      benchmark={selectedModel ? getBenchmarkForGpuAndModel(item, selectedModel.id) : null}
                    />
                  </td>
                  <td>{formatPrice(item.priceNewValue)}</td>
                  <td>{formatPrice(item.priceUsedValue)}</td>
                  <td><span className="score-pill">{item.score}/100</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailGpu ? <BenchmarkDetailsPanel gpu={detailGpu} onClose={() => setDetailGpu(null)} /> : null}
      {priceHistoryGpu ? (
        <GpuPriceHistoryPanel gpu={priceHistoryGpu} onClose={() => setPriceHistoryGpu(null)} />
      ) : null}
    </>
  );
}
