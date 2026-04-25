import { HeroMetrics } from "../dashboard/HeroMetrics.jsx";

export function HeroSection({ gpuData, models, totals, quantizations }) {
  return (
    <header className="hero reveal">
      <nav className="topbar glass" aria-label="Navigation principale">
        <a className="brand" href="/" aria-label="GPU LLM Benchmark, retour à l'accueil">
          <img className="brand-logo" src="/logo.svg" alt="GPU LLM Benchmark" />
        </a>
        <div className="topbar-links">
          <a href="#dashboard">Dashboard</a>
          <a href="#tables">Tableaux</a>
          <a href="#guides">Guides</a>
          <a href="#insights">Insights</a>
          <a href="/faq">FAQ</a>
          <a href="#calculator" className="admin-link">Calculateur</a>
        </div>
      </nav>

      <section className="hero-content">
        <div className="hero-copy reveal">
          <span className="eyebrow">Benchmark matériel pour LLM open source</span>
          <h1>Trouvez en un coup d&apos;oeil le meilleur GPU pour vos modèles LLM</h1>
          <p>
            Comparez les cartes graphiques, explorez les performances par modèle et repérez
            rapidement les configurations qui comptent vraiment pour vos usages IA, du labo perso
            aux déploiements plus ambitieux.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#dashboard">Voir le dashboard</a>
            <a className="btn btn-secondary" href="#calculator">Ouvrir le calculateur</a>
            <a className="btn btn-secondary" href="/guides/choisir-gpu-llm">Lire le guide</a>
          </div>
        </div>

        <div className="hero-panel glass reveal">
          <div className="panel-tag">Highlights base publique</div>
          <HeroMetrics
            gpuData={gpuData}
            models={models}
            totals={totals}
            quantizations={quantizations}
          />
        </div>
      </section>
    </header>
  );
}
