import { useEffect } from "react";
import { AdminAuthView } from "./components/AdminAuthView.jsx";
import { ApiKeysPanel } from "./components/ApiKeysPanel.jsx";
import { GpuForm } from "./components/GpuForm.jsx";
import { GpuManagementTable } from "./components/GpuManagementTable.jsx";
import { ModelManagementPanel } from "./components/ModelManagementPanel.jsx";
import { NotificationBar } from "./components/NotificationBar.jsx";
import { useAdminAuth } from "./hooks/useAdminAuth.js";
import { useAdminDashboard } from "./hooks/useAdminDashboard.js";

export function AdminApp() {
  const auth = useAdminAuth();
  const dashboard = useAdminDashboard({
    authenticated: auth.authenticated,
    onUnauthorized: auth.handleUnauthorized,
  });

  useEffect(() => {
    document.title = "Admin | GPU LLM Benchmark";
    return () => {
      document.title = "GPU LLM Benchmark 2026";
    };
  }, []);

  if (auth.bootstrapping) {
    return (
      <div className="admin-auth-shell">
        <div className="admin-auth-card">
          <h1>Chargement de l’administration</h1>
          <p className="admin-auth-copy">Initialisation de la session et du back-office React.</p>
        </div>
      </div>
    );
  }

  if (!auth.authenticated) {
    return (
      <AdminAuthView
        adminExists={auth.adminExists}
        error={auth.error}
        onCreateAdmin={auth.createFirstAdmin}
        onLogin={auth.login}
        pending={auth.pending}
      />
    );
  }

  return (
    <div className="admin-shell">
      <NotificationBar notification={dashboard.notification} />

      <header className="admin-topbar">
        <div>
          <p className="admin-kicker">React Admin</p>
          <h1>GPU LLM Benchmark Back-Office</h1>
        </div>
        <div className="admin-inline-actions">
          <a className="admin-btn admin-btn-secondary" href="/">
            Voir le frontend public
          </a>
          <button className="admin-btn admin-btn-primary" type="button" onClick={auth.logout}>
            Déconnexion
          </button>
        </div>
      </header>

      {dashboard.error ? <div className="admin-banner-error">{dashboard.error}</div> : null}

      <main className="admin-layout">
        <GpuForm
          form={dashboard.gpuForm}
          models={dashboard.models}
          newModelForm={dashboard.newModelForm}
          onAddBenchmarkRow={dashboard.addBenchmarkRow}
          onCancelNewModel={() =>
            dashboard.setNewModelForm({
              open: false,
              name: "",
              params_billions: "",
              total_params_billions: "",
              max_context_size: "",
              description: "",
            })
          }
          onChangeBenchmarkRow={dashboard.upsertBenchmarkRow}
          onDeleteBenchmarkRow={dashboard.removeBenchmarkRow}
          onNewModelFormChange={(field, value) =>
            dashboard.setNewModelForm((currentForm) => ({
              ...currentForm,
              [field]: value,
            }))
          }
          onOpenNewModel={() =>
            dashboard.setNewModelForm((currentForm) => ({
              ...currentForm,
              open: true,
            }))
          }
          onReset={dashboard.resetGpuForm}
          onSave={dashboard.saveGpu}
          onSaveModel={dashboard.saveModel}
          onUpdateField={dashboard.updateGpuField}
          saving={dashboard.saving}
        />

        <GpuManagementTable
          gpus={dashboard.filteredGpus}
          onDelete={dashboard.removeGpu}
          onEdit={dashboard.startEditGpu}
          search={dashboard.search}
          setSearch={dashboard.setSearch}
          setVendorFilter={dashboard.setVendorFilter}
          vendorFilter={dashboard.vendorFilter}
        />

        <ModelManagementPanel
          models={dashboard.models}
          onDelete={dashboard.removeModel}
          onUpdate={dashboard.saveExistingModel}
          saving={dashboard.saving}
        />

        <ApiKeysPanel
          apiKeyForm={dashboard.apiKeyForm}
          apiKeys={dashboard.apiKeys}
          latestCreatedApiKey={dashboard.latestCreatedApiKey}
          onApiKeyFormChange={(value) => dashboard.setApiKeyForm({ name: value })}
          onClearLatestApiKey={() => dashboard.setLatestCreatedApiKey("")}
          onCreateApiKey={dashboard.saveApiKey}
          onRevokeApiKey={dashboard.removeApiKey}
          saving={dashboard.saving}
        />
      </main>
    </div>
  );
}
