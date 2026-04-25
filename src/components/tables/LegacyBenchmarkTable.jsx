import { formatNumber } from "../../utils/formatters.js";

export function LegacyBenchmarkTable({ gpus }) {
  return (
    <div className="table-wrap">
      <table className="legacy-table">
        <caption className="sr-only">Tableau historique des débits 8B, 32B et 70B par GPU</caption>
        <thead>
          <tr>
            <th scope="col">GPU</th>
            <th scope="col">Tokens/s 8B</th>
            <th scope="col">Tokens/s 32B</th>
            <th scope="col">Tokens/s 70B</th>
          </tr>
        </thead>
        <tbody>
          {gpus.map((gpu) => (
            <tr key={`legacy-${gpu.id}`}>
              <th scope="row">
                <strong>{gpu.name}</strong>
                <br />
                <span className={`badge ${gpu.tier}`}>{gpu.tier}</span>
              </th>
              <td>{formatNumber(gpu.tokens_8b)}</td>
              <td>{formatNumber(gpu.tokens_32b)}</td>
              <td>{formatNumber(gpu.tokens_70b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
