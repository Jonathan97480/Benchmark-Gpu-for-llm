export function GpuManagementTable({
  gpus,
  onDelete,
  onEdit,
  search,
  setSearch,
  setVendorFilter,
  vendorFilter,
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <p className="admin-kicker">Catalogue</p>
          <h2>Gestion des GPU</h2>
        </div>
      </div>

      <div className="admin-grid admin-grid-2 admin-toolbar">
        <label>
          <span>Recherche</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>

        <label>
          <span>Vendor</span>
          <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)}>
            <option value="all">Tous</option>
            <option value="NVIDIA">NVIDIA</option>
            <option value="AMD">AMD</option>
            <option value="Intel">Intel</option>
          </select>
        </label>
      </div>

      <div className="admin-table-shell">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Vendor</th>
              <th>Architecture</th>
              <th>VRAM</th>
              <th>Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {gpus.length === 0 ? (
              <tr>
                <td colSpan="6">Aucun GPU trouvé</td>
              </tr>
            ) : (
              gpus.map((gpu) => (
                <tr key={gpu.id}>
                  <td>{gpu.name}</td>
                  <td>{gpu.vendor}</td>
                  <td>{gpu.architecture}</td>
                  <td>{gpu.vram} Go</td>
                  <td>{gpu.score}/100</td>
                  <td>
                    <div className="admin-inline-actions">
                      <button className="admin-btn admin-btn-secondary admin-btn-small" type="button" onClick={() => onEdit(gpu.id)}>
                        Modifier
                      </button>
                      <button className="admin-btn admin-btn-danger admin-btn-small" type="button" onClick={() => onDelete(gpu.id)}>
                        Supprimer
                      </button>
                    </div>
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
