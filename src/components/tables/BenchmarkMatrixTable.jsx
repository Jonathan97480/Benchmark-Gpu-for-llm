import { getBenchmarkForGpuAndModel } from "../../utils/data.js";
import { formatNumber } from "../../utils/formatters.js";

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

function BenchmarkCell({ benchmark }) {
  if (!benchmark) {
    return <span className="matrix-empty">Non testé</span>;
  }

  return (
    <div className="matrix-cell">
      <strong>{formatNumber(benchmark.tokens_per_second)} t/s</strong>
      {benchmark.gpu_count > 1 ? <span>{benchmark.gpu_count}x GPU</span> : null}
      <span>{benchmark.precision || "Quantization non précisée"}</span>
      {benchmark.context_size ? <span>ctx {formatNumber(benchmark.context_size)}</span> : null}
    </div>
  );
}

export function BenchmarkMatrixTable({ gpus, models }) {
  return (
    <div className="table-wrap matrix-wrap">
      <table className="matrix-table">
        <caption className="sr-only">Matrice des benchmarks GPU par modèle LLM</caption>
        <thead>
          <tr>
            <th scope="col">GPU</th>
            {models.map((model) => (
              <th key={model.id} scope="col">
                {model.name}
                <br />
                <span className="th-subtle">
                  {model.params_billions ? `${model.params_billions}B` : "taille inconnue"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gpus.map((gpu) => (
            <tr key={gpu.id}>
              <th scope="row">
                <div className="gpu-name-block">
                  <strong>{gpu.name}</strong>
                  <GpuCountBadge count={gpu.bestBenchmark?.gpu_count || 1} />
                </div>
                <br />
                <span className={`badge ${gpu.tier}`}>{gpu.tier}</span>
              </th>
              {models.map((model) => (
                <td key={`${gpu.id}-${model.id}`}>
                  <BenchmarkCell benchmark={getBenchmarkForGpuAndModel(gpu, model.id)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
