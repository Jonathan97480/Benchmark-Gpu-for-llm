function renderRowLabel(row) {
  const parts = [];

  if (row.context_size) {
    parts.push(`ctx ${row.context_size}`);
  }

  if (row.precision) {
    parts.push(row.precision);
  }

  return parts.join(" | ");
}

export function BenchmarkModelCard({
  model,
  onAddRow,
  onChangeRow,
  onRemoveRow,
  rows,
}) {
  const visibleRows = rows.filter((row) => !row.removed);

  return (
    <article className="admin-benchmark-card">
      <header className="admin-benchmark-card-header">
        <div>
          <h4>{model.name}</h4>
          <p>{model.description || "Aucune description"}</p>
        </div>
        <div className="admin-benchmark-actions">
          {model.params_billions ? <span className="admin-chip">{model.params_billions}B</span> : null}
          <button
            className="admin-btn admin-btn-secondary admin-btn-small"
            type="button"
            onClick={() => onAddRow(String(model.id))}
          >
            + Benchmark
          </button>
        </div>
      </header>

      {visibleRows.length === 0 ? (
        <p className="admin-empty-hint">Aucun benchmark saisi pour ce modèle.</p>
      ) : null}

      <div className="admin-benchmark-rows">
        {visibleRows.map((row) => (
          <div className="admin-benchmark-row" key={row.clientId}>
            <div className="admin-benchmark-row-meta">
              <span>{renderRowLabel(row) || "Nouveau benchmark"}</span>
              <button
                className="admin-btn admin-btn-danger admin-btn-small"
                type="button"
                onClick={() => onRemoveRow(String(model.id), row.clientId)}
              >
                Supprimer
              </button>
            </div>

            <div className="admin-grid admin-grid-3">
              <label>
                <span>Tokens/s</span>
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={row.tokens_per_second}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "tokens_per_second", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Taille contexte</span>
                <input
                  min="1"
                  type="number"
                  value={row.context_size}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "context_size", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Précision</span>
                <select
                  value={row.precision}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "precision", event.target.value)
                  }
                >
                  <option value="">Non spécifié</option>
                  <option value="FP16">FP16</option>
                  <option value="FP8">FP8</option>
                  <option value="INT4">INT4</option>
                  <option value="INT8">INT8</option>
                </select>
              </label>
            </div>

            <label>
              <span>Notes</span>
              <textarea
                rows="3"
                value={row.notes}
                onChange={(event) =>
                  onChangeRow(String(model.id), row.clientId, "notes", event.target.value)
                }
              />
            </label>
          </div>
        ))}
      </div>
    </article>
  );
}
