export function EmptyChart({ compact = false }) {
  return (
    <div className={compact ? "pie-chart-container empty-chart" : "chart-container empty-chart"}>
      <p className="empty-state-text">Aucune donnée exploitable pour ce graphique.</p>
    </div>
  );
}
