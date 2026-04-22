import { AdvancedMetrics } from "../dashboard/AdvancedMetrics.jsx";
import { ComparisonLists } from "../dashboard/ComparisonLists.jsx";
import { BandwidthChart } from "../charts/BandwidthChart.jsx";
import { MarketShareChart } from "../charts/MarketShareChart.jsx";
import { PerformanceChart } from "../charts/PerformanceChart.jsx";
import { PricePerformanceChart } from "../charts/PricePerformanceChart.jsx";

export function DashboardSection({
  benchmarkResults,
  gpuData,
  models,
  quantizations,
  selectedModel,
  selectedModelId,
  setSelectedModelId,
  totals,
}) {
  return (
    <section className="section reveal" id="dashboard">
      <div className="section-heading">
        <span className="section-kicker">Dashboard</span>
        <h2>Lecture réelle de la base de benchmarks</h2>
        <p>
          Les graphiques utilisent les benchmarks détaillés quand ils existent, et rendent visible
          le niveau de couverture ainsi que la quantization réellement stockée.
        </p>
      </div>

      <div className="dashboard-layout">
        <AdvancedMetrics
          gpuData={gpuData}
          models={models}
          totals={totals}
          quantizations={quantizations}
        />

        <div className="controls glass dashboard-controls">
          <div className="control">
            <label htmlFor="dashboardModelFilter">Modèle LLM pour le comparatif</label>
            <select
              id="dashboardModelFilter"
              value={selectedModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
            >
              <option value="all">Choisir un modèle</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}{model.params_billions ? ` (${model.params_billions}B)` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="dashboard-panel-grid">
          <article className="card glass reveal dashboard-card">
            <div className="card-header">
              <div>
                <span className="card-kicker">Performance</span>
                <h3>
                  {selectedModel
                    ? `Débit mesuré sur ${selectedModel.name}`
                    : "Sélectionner un modèle pour comparer les GPUs"}
                </h3>
              </div>
            </div>
            <PerformanceChart gpuData={gpuData} selectedModel={selectedModel} />
          </article>

          <article className="card glass reveal dashboard-card">
            <div className="card-header">
              <div>
                <span className="card-kicker">Catalogue</span>
                <h3>Répartition du catalogue par vendor</h3>
              </div>
            </div>
            <MarketShareChart gpuData={gpuData} />
          </article>
        </div>

        <div className="dashboard-panel-grid">
          <article className="card glass reveal dashboard-card">
            <div className="card-header">
              <div>
                <span className="card-kicker">Couverture</span>
                <h3>Nombre de GPUs testés par modèle</h3>
              </div>
            </div>
            <BandwidthChart models={models} totalGpus={gpuData.length} />
          </article>

          <article className="card glass reveal dashboard-card">
            <div className="card-header">
              <div>
                <span className="card-kicker">Quantization</span>
                <h3>Distribution des précisions stockées</h3>
              </div>
            </div>
            <PricePerformanceChart benchmarkResults={benchmarkResults} />
          </article>
        </div>

        {gpuData.length > 0 ? <ComparisonLists gpuData={gpuData} /> : null}
      </div>
    </section>
  );
}
