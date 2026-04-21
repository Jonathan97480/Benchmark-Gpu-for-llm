export function StatusSection({ error, loading }) {
  if (!loading && !error) {
    return null;
  }

  return (
    <section className="section reveal visible">
      <article className="card glass status-card">
        {loading ? <p className="empty-state-text">Chargement des données...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </article>
    </section>
  );
}
