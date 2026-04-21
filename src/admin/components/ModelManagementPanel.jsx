export function ModelManagementPanel({ models, onDelete }) {
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
              <th>Paramètres</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr>
                <td colSpan="4">Aucun modèle trouvé</td>
              </tr>
            ) : (
              models.map((model) => (
                <tr key={model.id}>
                  <td>{model.name}</td>
                  <td>{model.params_billions ? `${model.params_billions}B` : "N/A"}</td>
                  <td>{model.description || "N/A"}</td>
                  <td>
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
