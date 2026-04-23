import { BenchmarkModelCard } from "./BenchmarkModelCard.jsx";

export function GpuForm({
  form,
  models,
  newModelForm,
  onAddBenchmarkRow,
  onCancelNewModel,
  onChangeBenchmarkRow,
  onDeleteBenchmarkRow,
  onNewModelFormChange,
  onOpenNewModel,
  onReset,
  onSave,
  onSaveModel,
  onUpdateField,
  saving,
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <p className="admin-kicker">GPU Editor</p>
          <h2>{form.id ? "Modifier un GPU" : "Ajouter un GPU"}</h2>
        </div>
        <div className="admin-inline-actions">
          <button className="admin-btn admin-btn-secondary" type="button" onClick={onReset}>
            Réinitialiser
          </button>
          <button className="admin-btn admin-btn-primary" type="button" disabled={saving} onClick={onSave}>
            {saving ? "Enregistrement..." : form.id ? "Mettre à jour" : "Créer GPU"}
          </button>
        </div>
      </div>

      <div className="admin-form-stack">
        <div className="admin-panel-block">
          <h3>Informations GPU</h3>

          <div className="admin-grid admin-grid-2">
            <label>
              <span>Nom GPU</span>
              <input
                required
                type="text"
                value={form.name}
                onChange={(event) => onUpdateField("name", event.target.value)}
              />
            </label>

            <label>
              <span>Vendor</span>
              <select value={form.vendor} onChange={(event) => onUpdateField("vendor", event.target.value)}>
                <option value="NVIDIA">NVIDIA</option>
                <option value="AMD">AMD</option>
                <option value="Intel">Intel</option>
              </select>
            </label>

            <label>
              <span>Architecture</span>
              <input
                required
                type="text"
                value={form.architecture}
                onChange={(event) => onUpdateField("architecture", event.target.value)}
              />
            </label>

            <label>
              <span>VRAM (Go)</span>
              <input
                min="1"
                required
                type="number"
                value={form.vram}
                onChange={(event) => onUpdateField("vram", event.target.value)}
              />
            </label>

            <label>
              <span>Bande passante (Go/s)</span>
              <input
                min="0"
                required
                type="number"
                value={form.bandwidth}
                onChange={(event) => onUpdateField("bandwidth", event.target.value)}
              />
            </label>

            <label>
              <span>Prix neuf (€)</span>
              <input
                min="0"
                type="number"
                value={form.price_new_value}
                onChange={(event) => onUpdateField("price_new_value", event.target.value)}
              />
            </label>

            <label>
              <span>Prix occasion (€)</span>
              <input
                min="0"
                type="number"
                value={form.price_used_value}
                onChange={(event) => onUpdateField("price_used_value", event.target.value)}
              />
            </label>

            <label>
              <span>Catégorie</span>
              <select value={form.tier} onChange={(event) => onUpdateField("tier", event.target.value)}>
                <option value="budget">Budget</option>
                <option value="prosumer">Prosumer</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <label>
              <span>Score</span>
              <input
                max="100"
                min="0"
                type="number"
                value={form.score}
                onChange={(event) => onUpdateField("score", event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="admin-panel-block">
          <div className="admin-panel-block-header">
            <div>
              <h3>Benchmarks par modèle</h3>
              <p>Plusieurs lignes sont possibles par modèle selon le contexte, la quantization et les notes.</p>
            </div>
            <button className="admin-btn admin-btn-secondary" type="button" onClick={onOpenNewModel}>
              + Nouveau modèle LLM
            </button>
          </div>

          {newModelForm.open ? (
            <div className="admin-inline-form">
              <div className="admin-grid admin-grid-2">
                <label>
                  <span>Nom du modèle</span>
                  <input
                    type="text"
                    value={newModelForm.name}
                    onChange={(event) => onNewModelFormChange("name", event.target.value)}
                  />
                </label>

                <label>
                  <span>Paramètres actifs (B)</span>
                  <input
                    min="1"
                    type="number"
                    value={newModelForm.params_billions}
                    onChange={(event) => onNewModelFormChange("params_billions", event.target.value)}
                  />
                </label>

                <label>
                  <span>Paramètres totaux (B)</span>
                  <input
                    min="1"
                    type="number"
                    value={newModelForm.total_params_billions}
                    onChange={(event) => onNewModelFormChange("total_params_billions", event.target.value)}
                  />
                </label>

                <label>
                  <span>Contexte max</span>
                  <input
                    min="1"
                    type="number"
                    value={newModelForm.max_context_size}
                    onChange={(event) => onNewModelFormChange("max_context_size", event.target.value)}
                  />
                </label>

                <label>
                  <span>Coeff KV cache</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={newModelForm.analytical_kv_cache_multiplier}
                    onChange={(event) => onNewModelFormChange("analytical_kv_cache_multiplier", event.target.value)}
                  />
                </label>

                <label>
                  <span>Coeff runtime</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={newModelForm.analytical_runtime_memory_multiplier}
                    onChange={(event) => onNewModelFormChange("analytical_runtime_memory_multiplier", event.target.value)}
                  />
                </label>

                <label>
                  <span>Runtime min</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={newModelForm.analytical_runtime_memory_minimum}
                    onChange={(event) => onNewModelFormChange("analytical_runtime_memory_minimum", event.target.value)}
                  />
                </label>

                <label>
                  <span>Coeff pénalité contexte</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={newModelForm.analytical_context_penalty_multiplier}
                    onChange={(event) => onNewModelFormChange("analytical_context_penalty_multiplier", event.target.value)}
                  />
                </label>

                <label>
                  <span>Plancher contexte</span>
                  <input
                    min="0"
                    max="1"
                    step="0.01"
                    type="number"
                    value={newModelForm.analytical_context_penalty_floor}
                    onChange={(event) => onNewModelFormChange("analytical_context_penalty_floor", event.target.value)}
                  />
                </label>

                <label>
                  <span>Coeff offload</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={newModelForm.analytical_offload_penalty_multiplier}
                    onChange={(event) => onNewModelFormChange("analytical_offload_penalty_multiplier", event.target.value)}
                  />
                </label>

                <label>
                  <span>Coeff débit</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={newModelForm.analytical_throughput_multiplier}
                    onChange={(event) => onNewModelFormChange("analytical_throughput_multiplier", event.target.value)}
                  />
                </label>
              </div>

              <label>
                <span>Description</span>
                <textarea
                  rows="3"
                  value={newModelForm.description}
                  onChange={(event) => onNewModelFormChange("description", event.target.value)}
                />
              </label>

              <div className="admin-inline-actions">
                <button className="admin-btn admin-btn-secondary" type="button" onClick={onCancelNewModel}>
                  Annuler
                </button>
                <button className="admin-btn admin-btn-primary" type="button" disabled={saving} onClick={onSaveModel}>
                  Enregistrer le modèle
                </button>
              </div>
            </div>
          ) : null}

          <div className="admin-benchmark-list">
            {models.map((model) => (
              <BenchmarkModelCard
                key={model.id}
                model={model}
                rows={form.benchmarkRowsByModel[String(model.id)] || []}
                onAddRow={onAddBenchmarkRow}
                onChangeRow={onChangeBenchmarkRow}
                onRemoveRow={onDeleteBenchmarkRow}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
