function renderRowLabel(row) {
  const parts = [];

  if (row.gpu_count && Number(row.gpu_count) > 1) {
    parts.push(`${row.gpu_count}x GPU`);
  }

  if (row.context_size) {
    parts.push(`ctx ${row.context_size}`);
  }

  if (row.precision) {
    parts.push(row.precision);
  }

  if (row.inference_backend) {
    parts.push(row.inference_backend);
  }

  if (row.measurement_type) {
    parts.push(row.measurement_type);
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

            <div className="admin-grid admin-grid-2">
              <label>
                <span>Nombre de GPU</span>
                <input
                  min="1"
                  step="1"
                  type="number"
                  value={row.gpu_count}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "gpu_count", event.target.value)
                  }
                />
              </label>

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

              <label>
                <span>Backend</span>
                <select
                  value={row.inference_backend}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "inference_backend", event.target.value)
                  }
                >
                  <option value="">Non spécifié</option>
                  <option value="llama.cpp">llama.cpp</option>
                  <option value="Ollama">Ollama</option>
                  <option value="vLLM">vLLM</option>
                  <option value="exllamav2">exllamav2</option>
                  <option value="tabbyAPI">tabbyAPI</option>
                  <option value="SGLang">SGLang</option>
                  <option value="Autre">Autre</option>
                </select>
              </label>

              <label>
                <span>Type de mesure</span>
                <select
                  value={row.measurement_type}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "measurement_type", event.target.value)
                  }
                >
                  <option value="">Non spécifié</option>
                  <option value="decode">decode</option>
                  <option value="prefill">prefill</option>
                  <option value="mixed">mixed</option>
                </select>
              </label>

              <label>
                <span>VRAM utilisée (Go)</span>
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={row.vram_used_gb}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "vram_used_gb", event.target.value)
                  }
                />
              </label>

              <label>
                <span>RAM utilisée (Go)</span>
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={row.ram_used_gb}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "ram_used_gb", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Précision KV cache</span>
                <select
                  value={row.kv_cache_precision}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "kv_cache_precision", event.target.value)
                  }
                >
                  <option value="">Non spécifié</option>
                  <option value="FP16">FP16</option>
                  <option value="FP8">FP8</option>
                  <option value="INT8">INT8</option>
                  <option value="INT4">INT4</option>
                  <option value="Non spécifié">Non spécifié</option>
                </select>
              </label>

              <label>
                <span>Batch size</span>
                <input
                  min="1"
                  step="1"
                  type="number"
                  value={row.batch_size}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "batch_size", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Concurrence</span>
                <input
                  min="1"
                  step="1"
                  type="number"
                  value={row.concurrency}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "concurrency", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Power limit GPU (W)</span>
                <input
                  min="1"
                  step="1"
                  type="number"
                  value={row.gpu_power_limit_watts}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "gpu_power_limit_watts", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Core clock GPU (MHz)</span>
                <input
                  min="1"
                  step="1"
                  type="number"
                  value={row.gpu_core_clock_mhz}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "gpu_core_clock_mhz", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Memory clock GPU (MHz)</span>
                <input
                  min="1"
                  step="1"
                  type="number"
                  value={row.gpu_memory_clock_mhz}
                  onChange={(event) =>
                    onChangeRow(String(model.id), row.clientId, "gpu_memory_clock_mhz", event.target.value)
                  }
                />
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
