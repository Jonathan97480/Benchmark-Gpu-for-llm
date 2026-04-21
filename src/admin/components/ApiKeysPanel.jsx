export function ApiKeysPanel({
  apiKeyForm,
  apiKeys,
  latestCreatedApiKey,
  onApiKeyFormChange,
  onClearLatestApiKey,
  onCreateApiKey,
  onRevokeApiKey,
  saving,
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <p className="admin-kicker">API Keys</p>
          <h2>Accès externe sécurisé</h2>
        </div>
      </div>

      <div className="admin-inline-form">
        <div className="admin-grid admin-grid-2">
          <label>
            <span>Nom de la clé</span>
            <input
              type="text"
              value={apiKeyForm.name}
              onChange={(event) => onApiKeyFormChange(event.target.value)}
              placeholder="Ex: ingestion-service-prod"
            />
          </label>
          <div className="admin-api-help">
            <strong>Header à utiliser</strong>
            <code>x-api-key: VOTRE_CLE</code>
          </div>
        </div>

        <div className="admin-inline-actions">
          <button className="admin-btn admin-btn-primary" type="button" disabled={saving} onClick={onCreateApiKey}>
            Créer une clé API
          </button>
        </div>
      </div>

      {latestCreatedApiKey ? (
        <div className="admin-created-key">
          <div>
            <strong>Clé générée</strong>
            <p>Cette valeur n’est affichée qu’une seule fois. Enregistrez-la dans votre service externe.</p>
          </div>
          <code>{latestCreatedApiKey}</code>
          <button className="admin-btn admin-btn-secondary admin-btn-small" type="button" onClick={onClearLatestApiKey}>
            Masquer
          </button>
        </div>
      ) : null}

      <div className="admin-table-shell">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Préfixe</th>
              <th>Statut</th>
              <th>Dernière utilisation</th>
              <th>Créée le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.length === 0 ? (
              <tr>
                <td colSpan="6">Aucune clé API</td>
              </tr>
            ) : (
              apiKeys.map((apiKey) => (
                <tr key={apiKey.id}>
                  <td>{apiKey.name}</td>
                  <td><code>{apiKey.key_prefix}</code></td>
                  <td>{apiKey.is_active ? "Active" : "Révoquée"}</td>
                  <td>{apiKey.last_used_at || "Jamais"}</td>
                  <td>{apiKey.created_at}</td>
                  <td>
                    {apiKey.is_active ? (
                      <button className="admin-btn admin-btn-danger admin-btn-small" type="button" onClick={() => onRevokeApiKey(apiKey.id)}>
                        Révoquer
                      </button>
                    ) : (
                      <span className="admin-muted-text">Clé inactive</span>
                    )}
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
