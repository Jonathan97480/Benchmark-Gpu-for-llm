export function PublicSiteHeader() {
  return (
    <header className="page-header-shell">
      <nav className="topbar glass" aria-label="Navigation principale">
        <a className="brand" href="/" aria-label="GPU LLM Benchmark, retour à l'accueil">
          <img className="brand-logo" src="/logo.svg" alt="GPU LLM Benchmark" />
        </a>
        <div className="topbar-links">
          <a href="/#dashboard">Dashboard</a>
          <a href="/#tables">Tableaux</a>
          <a href="/guides/choisir-gpu-llm">Guide</a>
          <a href="/faq">FAQ</a>
          <a href="/#calculator" className="admin-link">Calculateur</a>
        </div>
      </nav>
    </header>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="footer">
      <p>
        GPU LLM Benchmark 2026, visualisation web React du dépôt Benchmark-Gpu-for-llm. Développé par{" "}
        <a href="https://portfolio.jon-dev.fr/" target="_blank" rel="noreferrer">
          jon-dev
        </a>
        .
      </p>
    </footer>
  );
}

export function PublicPageShell({ children, showHeader = true, showFooter = true }) {
  return (
    <div className="app-shell">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-grid"></div>
      {showHeader ? <PublicSiteHeader /> : null}
      {children}
      {showFooter ? <PublicSiteFooter /> : null}
    </div>
  );
}
