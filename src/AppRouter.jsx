import { Suspense, lazy, useEffect, useState } from "react";
import { useDashboardData } from "./hooks/useDashboardData.js";
import "./admin/admin.css";

const App = lazy(() => import("./App.jsx"));
const AdminApp = lazy(() =>
  import("./admin/AdminApp.jsx").then((module) => ({ default: module.AdminApp }))
);
const FaqPage = lazy(() =>
  import("./components/pages/FaqPage.jsx").then((module) => ({ default: module.FaqPage }))
);
const GuidePage = lazy(() =>
  import("./components/pages/GuidePage.jsx").then((module) => ({ default: module.GuidePage }))
);
const GpuDetailPage = lazy(() =>
  import("./components/pages/GpuDetailPage.jsx").then((module) => ({ default: module.GpuDetailPage }))
);
const ModelPage = lazy(() =>
  import("./components/pages/ModelPage.jsx").then((module) => ({ default: module.ModelPage }))
);
const ComparisonPage = lazy(() =>
  import("./components/pages/ComparisonPage.jsx").then((module) => ({ default: module.ComparisonPage }))
);
const UsagePage = lazy(() =>
  import("./components/pages/UsagePage.jsx").then((module) => ({ default: module.UsagePage }))
);
const VendorPage = lazy(() =>
  import("./components/pages/VendorPage.jsx").then((module) => ({ default: module.VendorPage }))
);

function getCurrentPath() {
  return window.location.pathname;
}

function RouteSkeleton() {
  return (
    <main className="main-content route-loading-shell">
      <section className="section">
        <div className="card glass route-loading-card">
          <span className="section-kicker">Chargement</span>
          <h1>Préparation de la page</h1>
          <p>Les données publiques et les modules d’affichage sont en cours de chargement.</p>
        </div>
      </section>
    </main>
  );
}

function GpuDetailRoute({ slug }) {
  const dashboardData = useDashboardData();
  return <GpuDetailPage gpuData={dashboardData.gpuData} slug={slug} />;
}

function VendorRoute({ slug }) {
  const dashboardData = useDashboardData();
  return <VendorPage gpuData={dashboardData.gpuData} slug={slug} />;
}

function ModelRoute({ slug }) {
  const dashboardData = useDashboardData();
  return <ModelPage gpuData={dashboardData.gpuData} models={dashboardData.models} slug={slug} />;
}

function ComparisonRoute({ mode, slug }) {
  const dashboardData = useDashboardData();
  return <ComparisonPage gpuData={dashboardData.gpuData} mode={mode} slug={slug} />;
}

function UsageRoute({ slug }) {
  const dashboardData = useDashboardData();
  return <UsagePage gpuData={dashboardData.gpuData} slug={slug} />;
}

export default function AppRouter() {
  const [pathname, setPathname] = useState(getCurrentPath);

  useEffect(() => {
    const handleNavigation = () => setPathname(getCurrentPath());
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);

  if (pathname.startsWith("/admin")) {
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <AdminApp />
      </Suspense>
    );
  }

  if (pathname.startsWith("/gpu/")) {
    const slug = pathname.replace(/^\/gpu\//, "").replace(/\/$/, "");
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <GpuDetailRoute slug={slug} />
      </Suspense>
    );
  }

  if (pathname.startsWith("/vendor/")) {
    const slug = pathname.replace(/^\/vendor\//, "").replace(/\/$/, "");
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <VendorRoute slug={slug} />
      </Suspense>
    );
  }

  if (pathname.startsWith("/model/")) {
    const slug = pathname.replace(/^\/model\//, "").replace(/\/$/, "");
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <ModelRoute slug={slug} />
      </Suspense>
    );
  }

  if (pathname.startsWith("/comparatifs/gpu/")) {
    const slug = pathname.replace(/^\/comparatifs\/gpu\//, "").replace(/\/$/, "");
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <ComparisonRoute mode="gpu" slug={slug} />
      </Suspense>
    );
  }

  if (pathname.startsWith("/comparatifs/vram/")) {
    const slug = pathname.replace(/^\/comparatifs\/vram\//, "").replace(/\/$/, "");
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <ComparisonRoute mode="vram" slug={slug} />
      </Suspense>
    );
  }

  if (pathname.startsWith("/usages/")) {
    const slug = pathname.replace(/^\/usages\//, "").replace(/\/$/, "");
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <UsageRoute slug={slug} />
      </Suspense>
    );
  }

  if (pathname === "/guides/choisir-gpu-llm" || pathname === "/guides/choisir-gpu-llm/") {
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <GuidePage />
      </Suspense>
    );
  }

  if (pathname === "/faq" || pathname === "/faq/") {
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <FaqPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RouteSkeleton />}>
      <App />
    </Suspense>
  );
}
