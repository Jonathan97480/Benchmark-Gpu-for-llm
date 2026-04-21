import { getBenchmarkForGpuAndModel } from "../../utils/data.js";
import { formatNumber, formatPrice } from "../../utils/formatters.js";

function SelectedModelResult({ benchmark }) {
  if (!benchmark) {
    return <span className="matrix-empty">Non testé</span>;
  }

  return (
    <div className="table-benchmark">
      <strong>{formatNumber(benchmark.tokens_per_second)} t/s</strong>
      <span>{benchmark.precision || "Quantization non précisée"}</span>
    </div>
  );
}

export function GpuTable({ selectedModel, setSort, sortedData }) {
  function toggleSort(key) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" }
    );
  }

  return (
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
            <th onClick={() => toggleSort("bestTokens")}>Meilleur benchmark</th>
            <th>{selectedModel ? selectedModel.name : "Résultat modèle sélectionné"}</th>
            <th onClick={() => toggleSort("priceNewValue")}>Prix neuf</th>
            <th onClick={() => toggleSort("priceUsedValue")}>Prix occasion</th>
            <th onClick={() => toggleSort("score")}>Score</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={12}>Aucune donnée disponible</td>
            </tr>
          ) : (
            sortedData.map((item) => (
              <tr key={item.name}>
                <td>
                  <strong>{item.name}</strong>
                  <br />
                  <span className={`badge ${item.tier}`}>{item.tier}</span>
                </td>
                <td>{item.vendor}</td>
                <td>{item.architecture}</td>
                <td>{formatNumber(item.vram)} Go</td>
                <td>{formatNumber(item.bandwidth)} Go/s</td>
                <td>{formatNumber(item.coverageCount)}</td>
                <td>{item.averageTokens ? `${formatNumber(item.averageTokens)} t/s` : "—"}</td>
                <td>
                  {item.bestBenchmark ? (
                    <div className="table-benchmark">
                      <strong>{formatNumber(item.bestBenchmark.tokens_per_second)} t/s</strong>
                      <span>
                        {item.bestBenchmark.model_name}
                        {item.bestBenchmark.precision ? ` · ${item.bestBenchmark.precision}` : ""}
                      </span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
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
  );
}
