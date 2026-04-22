import { useEffect, useState } from "react";

export function ModelManagementPanel({ models, onDelete, onUpdate, saving }) {
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        models.map((model) => [
          model.id,
          {
            name: model.name,
            params_billions: model.params_billions ?? "",
            total_params_billions: model.total_params_billions ?? "",
            max_context_size: model.max_context_size ?? "",
            description: model.description ?? "",
          },
        ])
      )
    );
  }, [models]);

  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <p className="admin-kicker">LLM</p>
          <h2>Modèles enregistrés</h2>
        </div>
      </div>

      <div className="admin-table-shell">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Paramètres actifs</th>
              <th>Paramètres totaux</th>
              <th>Contexte max</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr>
                <td colSpan="6">Aucun modèle trouvé</td>
              </tr>
            ) : (
              models.map((model) => (
                <tr key={model.id}>
                  <td>
                    <input
                      className="admin-table-input"
                      type="text"
                      value={drafts[model.id]?.name ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [model.id]: { ...current[model.id], name: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="admin-table-input"
                      min="1"
                      type="number"
                      value={drafts[model.id]?.params_billions ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [model.id]: { ...current[model.id], params_billions: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="admin-table-input"
                      min="1"
                      type="number"
                      value={drafts[model.id]?.total_params_billions ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [model.id]: { ...current[model.id], total_params_billions: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="admin-table-input"
                      min="1"
                      type="number"
                      value={drafts[model.id]?.max_context_size ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [model.id]: { ...current[model.id], max_context_size: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <textarea
                      className="admin-table-input"
                      rows="2"
                      value={drafts[model.id]?.description ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [model.id]: { ...current[model.id], description: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="admin-btn admin-btn-secondary admin-btn-small"
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        onUpdate(model.id, {
                          name: drafts[model.id]?.name?.trim(),
                          params_billions:
                            drafts[model.id]?.params_billions === ""
                              ? null
                              : Number(drafts[model.id]?.params_billions),
                          total_params_billions:
                            drafts[model.id]?.total_params_billions === ""
                              ? null
                              : Number(drafts[model.id]?.total_params_billions),
                          max_context_size:
                            drafts[model.id]?.max_context_size === ""
                              ? null
                              : Number(drafts[model.id]?.max_context_size),
                          description: drafts[model.id]?.description?.trim() || null,
                        })
                      }
                    >
                      Enregistrer
                    </button>
                    <button className="admin-btn admin-btn-danger admin-btn-small" type="button" onClick={() => onDelete(model.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
