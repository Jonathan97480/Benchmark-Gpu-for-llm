import { useEffect, useMemo, useState } from "react";
import { AdminAuthView } from "./components/AdminAuthView.jsx";
import { ApiKeysPanel } from "./components/ApiKeysPanel.jsx";
import { BackupManagementPanel } from "./components/BackupManagementPanel.jsx";
import { GpuForm } from "./components/GpuForm.jsx";
import { GpuManagementTable } from "./components/GpuManagementTable.jsx";
import { ModelManagementPanel } from "./components/ModelManagementPanel.jsx";
import { NotificationBar } from "./components/NotificationBar.jsx";
import { useAdminAuth } from "./hooks/useAdminAuth.js";
import { useAdminDashboard } from "./hooks/useAdminDashboard.js";
import { applyAdminSeo, applyPublicSeo, seoDefaults } from "../utils/seo.js";

export function AdminApp() {
  const auth = useAdminAuth();
  const dashboard = useAdminDashboard({
    authenticated: auth.authenticated,
    onUnauthorized: auth.handleUnauthorized,
  });

  useEffect(() => {
    applyAdminSeo();
    return () => {
      applyPublicSeo({
        title: seoDefaults.title,
        description: seoDefaults.description,
        path: "/",
      });
    };
  }, []);

  const [activeSection, setActiveSection] = useState("gpu-editor");

  const sections = useMemo(
    () => [
      {
        id: "gpu-editor",
        kicker: "Edition",
        title: "Ajouter ou modifier un GPU",
      },
      {
        id: "gpu-catalog",
        kicker: "Catalogue",
        title: "Gerer les GPU",
      },
      {
        id: "models",
        kicker: "Modeles",
        title: "Calibrer et maintenir les modeles",
      },
      {
        id: "api-keys",
        kicker: "Securite",
        title: "Gerer les acces API",
      },
      {
        id: "backups",
        kicker: "Backup",
        title: "Sauvegarder et telecharger le site",
      },
    ],
    []
  );

  const activeSectionMeta = sections.find((section) => section.id === activeSection) || sections[0];

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

      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-card">
            <div>
              <p className="admin-kicker">React Admin</p>
              <h1>GPU LLM Benchmark Back-Office</h1>
            </div>

            <nav className="admin-nav" aria-label="Navigation administration">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className={`admin-nav-item${activeSection === section.id ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                >
                  <span>{section.kicker}</span>
                  <strong>{section.title}</strong>
                </button>
              ))}
            </nav>

            <div className="admin-sidebar-actions">
              <button className="admin-btn admin-btn-primary" type="button" onClick={auth.logout}>
                Déconnexion
              </button>
            </div>
          </div>
        </aside>

        <main className="admin-content">
          <header className="admin-topbar">
            <div>
              <p className="admin-kicker">{activeSectionMeta.kicker}</p>
              <h1>{activeSectionMeta.title}</h1>
            </div>
          </header>

          {dashboard.error ? <div className="admin-banner-error">{dashboard.error}</div> : null}

          <div className="admin-layout">
            {activeSection === "gpu-editor" ? (
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
                    analytical_kv_cache_multiplier: "",
                    analytical_runtime_memory_multiplier: "",
                    analytical_runtime_memory_minimum: "",
                    analytical_context_penalty_multiplier: "",
                    analytical_context_penalty_floor: "",
                    analytical_offload_penalty_multiplier: "",
                    analytical_throughput_multiplier: "",
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
            ) : null}

            {activeSection === "gpu-catalog" ? (
              <GpuManagementTable
                gpus={dashboard.filteredGpus}
                onDelete={dashboard.removeGpu}
                onEdit={(gpuId) => {
                  dashboard.startEditGpu(gpuId);
                  setActiveSection("gpu-editor");
                }}
                search={dashboard.search}
                setSearch={dashboard.setSearch}
                setVendorFilter={dashboard.setVendorFilter}
                vendorFilter={dashboard.vendorFilter}
              />
            ) : null}

            {activeSection === "models" ? (
              <ModelManagementPanel
                models={dashboard.models}
                onDelete={dashboard.removeModel}
                onRecomputeCalibration={dashboard.recomputeModelCalibration}
                onUpdate={dashboard.saveExistingModel}
                saving={dashboard.saving}
              />
            ) : null}

            {activeSection === "api-keys" ? (
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
            ) : null}

            {activeSection === "backups" ? (
              <BackupManagementPanel
                backups={dashboard.backups}
                onCreateBackup={dashboard.saveBackup}
                onDownloadBackup={dashboard.downloadBackupFile}
                saving={dashboard.saving}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
