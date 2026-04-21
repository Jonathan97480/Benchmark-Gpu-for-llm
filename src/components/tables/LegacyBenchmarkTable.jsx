import { formatNumber } from "../../utils/formatters.js";

export function LegacyBenchmarkTable({ gpus }) {
  return (
    <div className="table-wrap">
      <table className="legacy-table">
        <thead>
          <tr>
            <th>GPU</th>
            <th>Tokens/s 8B</th>
            <th>Tokens/s 32B</th>
            <th>Tokens/s 70B</th>
          </tr>
        </thead>
        <tbody>
          {gpus.map((gpu) => (
            <tr key={`legacy-${gpu.id}`}>
              <td>
                <strong>{gpu.name}</strong>
                <br />
                <span className={`badge ${gpu.tier}`}>{gpu.tier}</span>
              </td>
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
