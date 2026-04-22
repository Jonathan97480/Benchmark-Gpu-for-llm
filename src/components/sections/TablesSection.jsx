import { BenchmarkMatrixTable } from "../tables/BenchmarkMatrixTable.jsx";
import { GpuTable } from "../tables/GpuTable.jsx";
import { getBenchmarkForGpuAndModel } from "../../utils/data.js";

export function TablesSection({
  gpuData,
  models,
  search,
  selectedModel,
  selectedModelId,
  setSearch,
  setSelectedModelId,
  setSort,
  setTier,
  setVendor,
  sortedData,
  tier,
  vendor,
  vendors,
}) {
  const hasSelectedModelBenchmarks =
    !selectedModel ||
    sortedData.some((gpu) => getBenchmarkForGpuAndModel(gpu, selectedModel.id));

  return (
    <section className="section reveal" id="tables">
      <div className="section-heading">
        <span className="section-kicker">Exploration</span>
        <h2>Catalogue GPU et matrice complète des benchmarks</h2>
        <p>
          La vue publique sépare maintenant le catalogue matériel et la matrice GPU × modèle LLM,
          avec affichage explicite des trous de couverture et de la quantization stockée.
        </p>
      </div>

      <div className="controls glass">
        <div className="control">
          <label htmlFor="searchInput">Recherche</label>
          <input
            id="searchInput"
            type="search"
            placeholder="Ex. RTX, AMD, budget, H100"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="control">
          <label htmlFor="vendorFilter">Constructeur</label>
          <select
            id="vendorFilter"
            value={vendor}
            onChange={(event) => setVendor(event.target.value)}
          >
            <option value="all">Tous</option>
            {vendors.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="control">
          <label htmlFor="tierFilter">Segment</label>
          <select
            id="tierFilter"
            value={tier}
            onChange={(event) => setTier(event.target.value)}
          >
            <option value="all">Tous</option>
            <option value="budget">Budget</option>
            <option value="prosumer">Prosumer</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div className="control">
          <label htmlFor="selectedModelFilter">Modèle mis en avant</label>
          <select
            id="selectedModelFilter"
            value={selectedModelId}
            onChange={(event) => setSelectedModelId(event.target.value)}
          >
            <option value="all">Aucun</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}{model.params_billions ? ` (${model.params_billions}B)` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tables-layout">
        <article className="card glass reveal table-card">
          <div className="card-header split">
            <div>
              <span className="card-kicker">Catalogue public</span>
              <h3>Cartes GPU enrichies par la couverture réelle des benchmarks</h3>
              <p className="table-note">
                Le catalogue distingue maintenant le prix neuf et le prix occasion quand ces données
                existent dans la base.
              </p>
            </div>
            <div className="legend">
              <span><i className="dot dot-budget"></i>Budget</span>
              <span><i className="dot dot-pro"></i>Prosumer</span>
              <span><i className="dot dot-enterprise"></i>Enterprise</span>
            </div>
          </div>
          {hasSelectedModelBenchmarks ? (
            <GpuTable selectedModel={selectedModel} setSort={setSort} sortedData={sortedData} />
          ) : (
            <p className="empty-state-text">
              Aucun benchmark n&apos;est disponible pour le modèle sélectionné dans la vue actuelle.
            </p>
          )}
        </article>

        <article className="card glass reveal table-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">Matrice complète</span>
              <h3>Résultats par GPU et par modèle LLM</h3>
            </div>
          </div>
          <BenchmarkMatrixTable gpus={gpuData} models={models} />
        </article>
      </div>
    </section>
  );
}
