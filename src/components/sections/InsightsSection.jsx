export function InsightsSection({ insights, loading }) {
  return (
    <section className="section reveal" id="insights">
      <div className="section-heading">
        <span className="section-kicker">Analyse</span>
        <h2>Insights de lecture rapide</h2>
        <p>
          Les données du dépôt sont résumées ici sous forme de cartes éditoriales pour aider à
          la décision sans relire tout le rapport source.
        </p>
      </div>

      <div className="insight-grid">
        {insights.length === 0 && !loading ? (
          <p className="empty-state-text">Aucun insight disponible.</p>
        ) : (
          insights.map((item, index) => (
            <article className="card insight-card glass reveal visible" key={`${item.title}-${index}`}>
              <span className="card-kicker">Insight</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
