import { getBenchmarkForGpuAndModel } from "../../utils/data.js";
import { formatNumber } from "../../utils/formatters.js";

function BenchmarkCell({ benchmark }) {
  if (!benchmark) {
    return <span className="matrix-empty">Non testé</span>;
  }

  return (
    <div className="matrix-cell">
      <strong>{formatNumber(benchmark.tokens_per_second)} t/s</strong>
      <span>{benchmark.precision || "Quantization non précisée"}</span>
      {benchmark.context_size ? <span>ctx {formatNumber(benchmark.context_size)}</span> : null}
    </div>
  );
}

export function BenchmarkMatrixTable({ gpus, models }) {
  return (
    <div className="table-wrap matrix-wrap">
      <table className="matrix-table">
        <thead>
          <tr>
            <th>GPU</th>
            {models.map((model) => (
              <th key={model.id}>
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
              <td>
                <strong>{gpu.name}</strong>
                <br />
                <span className={`badge ${gpu.tier}`}>{gpu.tier}</span>
              </td>
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
