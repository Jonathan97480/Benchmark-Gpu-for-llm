function formatBytes(value) {
  if (!value) {
    return "0 o";
  }

  const units = ["o", "Ko", "Mo", "Go"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value) {
  if (!value) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function BackupManagementPanel({ backups, onCreateBackup, onDownloadBackup, saving }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <p className="admin-kicker">Backup</p>
          <h2>Sauvegardes du site</h2>
          <p className="admin-muted-text">
            Chaque archive contient la base SQLite et, si présents, les répertoires d’images configurés.
          </p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          type="button"
          disabled={saving}
          onClick={onCreateBackup}
        >
          Faire un backup
        </button>
      </div>

      {backups.length === 0 ? (
        <p className="admin-empty-hint">Aucun backup disponible pour le moment.</p>
      ) : (
        <div className="admin-backup-list">
          {backups.map((backup) => (
            <article key={backup.file_name} className="admin-backup-card">
              <div>
                <p className="admin-kicker">Archive</p>
                <h3>{backup.file_name}</h3>
                <p className="admin-muted-text">
                  {formatDate(backup.created_at)} · {formatBytes(backup.file_size)}
                </p>
              </div>

              <div className="admin-backup-meta">
                <span className="admin-chip">{backup.reason || "manual"}</span>
                <span className="admin-chip">
                  {backup.includes_images ? "BD + images" : "BD seule"}
                </span>
              </div>

              <button
                className="admin-btn admin-btn-secondary"
                type="button"
                disabled={saving}
                onClick={() => onDownloadBackup(backup.file_name)}
              >
                Télécharger
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
