import { useState } from "react";
import { getBenchmarkForGpuAndModel } from "../../utils/data.js";
import { formatNumber, formatPrice } from "../../utils/formatters.js";

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
      </div>
    </div>
  );
}

export function GpuTable({ selectedModel, setSort, sortedData }) {
  const [detailGpu, setDetailGpu] = useState(null);

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
          <thead>
            <tr>
              <th onClick={() => toggleSort("name")}>Carte</th>
              <th onClick={() => toggleSort("vendor")}>Vendor</th>
              <th onClick={() => toggleSort("architecture")}>Architecture</th>
              <th onClick={() => toggleSort("vram")}>VRAM</th>
              <th onClick={() => toggleSort("bandwidth")}>Bande passante</th>
              <th onClick={() => toggleSort("coverageCount")}>Benchmarks</th>
              <th onClick={() => toggleSort("averageTokens")}>Moyenne mesurée</th>
              <th>{selectedModel ? selectedModel.name : "Résultat modèle sélectionné"}</th>
              <th onClick={() => toggleSort("priceNewValue")}>Prix neuf</th>
              <th onClick={() => toggleSort("priceUsedValue")}>Prix occasion</th>
              <th onClick={() => toggleSort("score")}>Score</th>
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
                  <td>
                    <div className="gpu-name-block">
                      <strong>{item.name}</strong>
                      {(() => {
                        const countSource = selectedModel
                          ? getBenchmarkForGpuAndModel(item, selectedModel.id) || item.bestBenchmark
                          : item.bestBenchmark;

                        return <GpuCountBadge count={countSource?.gpu_count || 1} />;
                      })()}
                    </div>
                    <br />
                    <span className={`badge ${item.tier}`}>{item.tier}</span>
                  </td>
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
    </>
  );
}
