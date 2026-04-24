import { useEffect, useMemo } from "react";
import { applyPublicSeo } from "../../utils/seo.js";
import { findVendorBySlug, getGpuPath, getVendorPath } from "../../utils/data.js";
import { formatNumber, formatPrice } from "../../utils/formatters.js";

export function VendorPage({ gpuData, slug }) {
  const vendor = useMemo(() => findVendorBySlug(gpuData, slug), [gpuData, slug]);
  const vendorGpus = useMemo(
    () =>
      gpuData
        .filter((gpu) => gpu.vendor === vendor)
        .sort((left, right) => right.score - left.score || right.coverageCount - left.coverageCount),
    [gpuData, vendor]
  );

  useEffect(() => {
    if (!vendor) {
      applyPublicSeo({
        title: "Vendor introuvable | GPU LLM Benchmark",
        description: "Le vendor demandé est introuvable dans le catalogue public GPU LLM Benchmark.",
        path: window.location.pathname,
      });
      return;
    }

    applyPublicSeo({
      title: `${vendor} | Catalogue GPU LLM`,
      description: `Catalogue public ${vendor} : cartes graphiques, benchmarks LLM, scores et repères de prix sur GPU LLM Benchmark.`,
      path: getVendorPath(vendor),
    });
  }, [vendor]);

  if (!vendor) {
    return (
      <div className="app-shell">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-grid"></div>
        <main className="main-content">
          <section className="section reveal visible">
            <div className="card glass">
              <span className="section-kicker">404</span>
              <h1>Vendor introuvable</h1>
              <p>Le constructeur demandé n’existe pas dans le catalogue public.</p>
              <a className="btn btn-primary" href="/">
                Retour au benchmark
              </a>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-grid"></div>

      <main className="main-content gpu-detail-shell">
        <section className="section reveal visible">
          <div className="card glass gpu-detail-hero">
            <div className="gpu-detail-copy">
              <span className="section-kicker">Vendor</span>
              <h1>{vendor}</h1>
              <p>
                Cette page regroupe les GPU {vendor} présents dans le catalogue public,
                avec leurs repères techniques, leurs benchmarks LLM et leurs niveaux de prix.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="/">
                  Retour au benchmark
                </a>
                <a className="btn btn-secondary" href="/#dashboard">
                  Retour au dashboard
                </a>
              </div>
            </div>

            <div className="gpu-detail-stats">
              <div className="metric-box">
                <span>GPU référencés</span>
                <strong>{formatNumber(vendorGpus.length)}</strong>
                <span>constructeur {vendor}</span>
              </div>
              <div className="metric-box">
                <span>Score max</span>
                <strong>{vendorGpus[0]?.score ? `${vendorGpus[0].score}/100` : "—"}</strong>
                <span>sur le catalogue public</span>
              </div>
              <div className="metric-box">
                <span>Benchmarks cumulés</span>
                <strong>{formatNumber(vendorGpus.reduce((sum, gpu) => sum + (gpu.coverageCount || 0), 0))}</strong>
                <span>données LLM disponibles</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Catalogue {vendor}</span>
                <h3>Cartes graphiques {vendor} indexables</h3>
              </div>
            </div>

            {vendorGpus.length === 0 ? (
              <p className="empty-state-text">Aucune carte n’est actuellement disponible pour ce vendor.</p>
            ) : (
              <div className="table-wrap">
                <table className="benchmark-details-table">
                  <thead>
                    <tr>
                      <th>GPU</th>
                      <th>Architecture</th>
                      <th>VRAM</th>
                      <th>Bande passante</th>
                      <th>Prix neuf</th>
                      <th>Prix occasion</th>
                      <th>Benchmarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorGpus.map((gpu) => (
                      <tr key={gpu.id}>
                        <td>
                          <a className="gpu-detail-link" href={getGpuPath(gpu)}>
                            {gpu.name}
                          </a>
                        </td>
                        <td>{gpu.architecture}</td>
                        <td>{formatNumber(gpu.vram)} Go</td>
                        <td>{formatNumber(gpu.bandwidth)} Go/s</td>
                        <td>{formatPrice(gpu.priceNewValue)}</td>
                        <td>{formatPrice(gpu.priceUsedValue)}</td>
                        <td>{formatNumber(gpu.coverageCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
