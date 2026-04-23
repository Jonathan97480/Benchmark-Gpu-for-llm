import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiRefreshCw, FiTrash2, FiX } from "react-icons/fi";

function createDraft(model) {
  return {
    name: model.name,
    params_billions: model.params_billions ?? "",
    total_params_billions: model.total_params_billions ?? "",
    max_context_size: model.max_context_size ?? "",
    analytical_kv_cache_multiplier: model.analytical_kv_cache_multiplier ?? "",
    analytical_runtime_memory_multiplier: model.analytical_runtime_memory_multiplier ?? "",
    analytical_runtime_memory_minimum: model.analytical_runtime_memory_minimum ?? "",
    analytical_context_penalty_multiplier: model.analytical_context_penalty_multiplier ?? "",
    analytical_context_penalty_floor: model.analytical_context_penalty_floor ?? "",
    analytical_offload_penalty_multiplier: model.analytical_offload_penalty_multiplier ?? "",
    analytical_throughput_multiplier: model.analytical_throughput_multiplier ?? "",
    description: model.description ?? "",
  };
}

function getModelBadge(model) {
  const source = String(model.name || "?").trim();
  return source.slice(0, 2).toUpperCase();
}

function buildPayload(draft) {
  return {
    name: draft.name?.trim(),
    params_billions: draft.params_billions === "" ? null : Number(draft.params_billions),
    total_params_billions: draft.total_params_billions === "" ? null : Number(draft.total_params_billions),
    max_context_size: draft.max_context_size === "" ? null : Number(draft.max_context_size),
    analytical_kv_cache_multiplier:
      draft.analytical_kv_cache_multiplier === "" ? null : Number(draft.analytical_kv_cache_multiplier),
    analytical_runtime_memory_multiplier:
      draft.analytical_runtime_memory_multiplier === "" ? null : Number(draft.analytical_runtime_memory_multiplier),
    analytical_runtime_memory_minimum:
      draft.analytical_runtime_memory_minimum === "" ? null : Number(draft.analytical_runtime_memory_minimum),
    analytical_context_penalty_multiplier:
      draft.analytical_context_penalty_multiplier === "" ? null : Number(draft.analytical_context_penalty_multiplier),
    analytical_context_penalty_floor:
      draft.analytical_context_penalty_floor === "" ? null : Number(draft.analytical_context_penalty_floor),
    analytical_offload_penalty_multiplier:
      draft.analytical_offload_penalty_multiplier === "" ? null : Number(draft.analytical_offload_penalty_multiplier),
    analytical_throughput_multiplier:
      draft.analytical_throughput_multiplier === "" ? null : Number(draft.analytical_throughput_multiplier),
    description: draft.description?.trim() || null,
  };
}

export function ModelManagementPanel({ models, onDelete, onRecomputeCalibration, onUpdate, saving }) {
  const [drafts, setDrafts] = useState({});
  const [editingModelId, setEditingModelId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(models.map((model) => [model.id, createDraft(model)]))
    );
  }, [models]);

  const editingModel = useMemo(
    () => models.find((model) => model.id === editingModelId) || null,
    [editingModelId, models]
  );
  const deleteTarget = useMemo(
    () => models.find((model) => model.id === deleteTargetId) || null,
    [deleteTargetId, models]
  );

  useEffect(() => {
    if (!editingModel) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setEditingModelId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingModel]);

  function updateDraft(modelId, field, value) {
    setDrafts((current) => ({
      ...current,
      [modelId]: {
        ...current[modelId],
        [field]: value,
      },
    }));
  }

  function handleSave(modelId) {
    onUpdate(modelId, buildPayload(drafts[modelId]));
    setEditingModelId(null);
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <p className="admin-kicker">LLM</p>
          <h2>Modèles enregistrés</h2>
        </div>
      </div>

      {editingModel ? (
        <div
          aria-label="Edition du modele"
          aria-modal="true"
          className="admin-modal-overlay"
          role="dialog"
          onClick={() => setEditingModelId(null)}
        >
          <div className="admin-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="admin-model-editor">
              <div className="admin-panel-header">
                <div>
                  <p className="admin-kicker">Edition</p>
                  <h3>{editingModel.name}</h3>
                </div>
                <div className="admin-inline-actions">
                  <button
                    aria-label="Fermer l'edition"
                    className="admin-icon-btn"
                    type="button"
                    onClick={() => setEditingModelId(null)}
                  >
                    <FiX aria-hidden="true" />
                  </button>
                  <button
                    className="admin-btn admin-btn-primary admin-btn-small"
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave(editingModel.id)}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>

              <div className="admin-grid admin-grid-3">
                <label>
                  <span>Nom</span>
                  <input
                    type="text"
                    value={drafts[editingModel.id]?.name ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "name", event.target.value)}
                  />
                </label>

                <label>
                  <span>Paramètres actifs</span>
                  <input
                    min="1"
                    type="number"
                    value={drafts[editingModel.id]?.params_billions ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "params_billions", event.target.value)}
                  />
                </label>

                <label>
                  <span>Paramètres totaux</span>
                  <input
                    min="1"
                    type="number"
                    value={drafts[editingModel.id]?.total_params_billions ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "total_params_billions", event.target.value)}
                  />
                </label>

                <label>
                  <span>Contexte max</span>
                  <input
                    min="1"
                    type="number"
                    value={drafts[editingModel.id]?.max_context_size ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "max_context_size", event.target.value)}
                  />
                </label>

                <label>
                  <span>Coeff débit</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={drafts[editingModel.id]?.analytical_throughput_multiplier ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "analytical_throughput_multiplier", event.target.value)}
                  />
                </label>

                <label>
                  <span>Coeff KV cache</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={drafts[editingModel.id]?.analytical_kv_cache_multiplier ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "analytical_kv_cache_multiplier", event.target.value)}
                  />
                </label>

                <label>
                  <span>Coeff runtime</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={drafts[editingModel.id]?.analytical_runtime_memory_multiplier ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "analytical_runtime_memory_multiplier", event.target.value)}
                  />
                </label>

                <label>
                  <span>Runtime min</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={drafts[editingModel.id]?.analytical_runtime_memory_minimum ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "analytical_runtime_memory_minimum", event.target.value)}
                  />
                </label>

                <label>
                  <span>Coeff contexte</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={drafts[editingModel.id]?.analytical_context_penalty_multiplier ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "analytical_context_penalty_multiplier", event.target.value)}
                  />
                </label>

                <label>
                  <span>Plancher contexte</span>
                  <input
                    min="0"
                    max="1"
                    step="0.01"
                    type="number"
                    value={drafts[editingModel.id]?.analytical_context_penalty_floor ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "analytical_context_penalty_floor", event.target.value)}
                  />
                </label>

                <label>
                  <span>Coeff offload</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={drafts[editingModel.id]?.analytical_offload_penalty_multiplier ?? ""}
                    onChange={(event) => updateDraft(editingModel.id, "analytical_offload_penalty_multiplier", event.target.value)}
                  />
                </label>
              </div>

              <label>
                <span>Description</span>
                <textarea
                  rows="4"
                  value={drafts[editingModel.id]?.description ?? ""}
                  onChange={(event) => updateDraft(editingModel.id, "description", event.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="admin-delete-warning" role="alert">
          <div>
            <p className="admin-kicker">Suppression</p>
            <h3>{deleteTarget.name}</h3>
            <p>Cette action supprimera le modèle et ses références associées. Confirme la suppression.</p>
          </div>
          <div className="admin-inline-actions">
            <button
              className="admin-btn admin-btn-secondary admin-btn-small"
              type="button"
              onClick={() => setDeleteTargetId(null)}
            >
              Annuler
            </button>
            <button
              className="admin-btn admin-btn-danger admin-btn-small"
              type="button"
              disabled={saving}
              onClick={() => {
                onDelete(deleteTarget.id);
                setDeleteTargetId(null);
                if (editingModelId === deleteTarget.id) {
                  setEditingModelId(null);
                }
              }}
            >
              Confirmer la suppression
            </button>
          </div>
        </div>
      ) : null}

      <div className="admin-model-grid">
        {models.length === 0 ? (
          <p className="admin-empty-hint">Aucun modèle trouvé.</p>
        ) : (
          models.map((model) => (
            <article key={model.id} className="admin-model-card">
              <div className="admin-model-card-top">
                <div className="admin-model-badge" aria-hidden="true">
                  {getModelBadge(model)}
                </div>
                <div className="admin-model-actions">
                  <button
                    className="admin-icon-btn"
                    type="button"
                    aria-label={`Modifier ${model.name}`}
                    title="Modifier le modèle"
                    onClick={() => setEditingModelId(model.id)}
                  >
                    <FiEdit2 aria-hidden="true" />
                  </button>
                  <button
                    className="admin-icon-btn"
                    type="button"
                    aria-label={`Calculer le coefficient de ${model.name}`}
                    title="Calculer le coefficient"
                    disabled={saving}
                    onClick={() => onRecomputeCalibration(model.id)}
                  >
                    <FiRefreshCw aria-hidden="true" />
                  </button>
                  <button
                    className="admin-icon-btn admin-icon-btn-danger"
                    type="button"
                    aria-label={`Supprimer ${model.name}`}
                    title="Supprimer le modèle"
                    onClick={() => setDeleteTargetId(model.id)}
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="admin-model-copy">
                <h3>{model.name}</h3>
                <p>{model.description || "Aucune description fournie."}</p>
              </div>

              <div className="admin-model-meta">
                <span className="admin-chip">{model.params_billions || "?"}B actifs</span>
                <span className="admin-chip">{model.total_params_billions || "?"}B totaux</span>
                <span className="admin-chip">
                  coeff {model.analytical_throughput_multiplier ?? "defaut"}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
