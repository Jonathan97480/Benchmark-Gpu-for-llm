import { useEffect, useState } from "react";
import App from "./App.jsx";
import { AdminApp } from "./admin/AdminApp.jsx";
import { FaqPage } from "./components/pages/FaqPage.jsx";
import { GuidePage } from "./components/pages/GuidePage.jsx";
import { GpuDetailPage } from "./components/pages/GpuDetailPage.jsx";
import { ModelPage } from "./components/pages/ModelPage.jsx";
import { ComparisonPage } from "./components/pages/ComparisonPage.jsx";
import { UsagePage } from "./components/pages/UsagePage.jsx";
import { VendorPage } from "./components/pages/VendorPage.jsx";
import { useDashboardData } from "./hooks/useDashboardData.js";
import "./admin/admin.css";

function getCurrentPath() {
  return window.location.pathname;
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
    return <AdminApp />;
  }

  if (pathname.startsWith("/gpu/")) {
    const slug = pathname.replace(/^\/gpu\//, "").replace(/\/$/, "");
    return <GpuDetailRoute slug={slug} />;
  }

  if (pathname.startsWith("/vendor/")) {
    const slug = pathname.replace(/^\/vendor\//, "").replace(/\/$/, "");
    return <VendorRoute slug={slug} />;
  }

  if (pathname.startsWith("/model/")) {
    const slug = pathname.replace(/^\/model\//, "").replace(/\/$/, "");
    return <ModelRoute slug={slug} />;
  }

  if (pathname.startsWith("/comparatifs/gpu/")) {
    const slug = pathname.replace(/^\/comparatifs\/gpu\//, "").replace(/\/$/, "");
    return <ComparisonRoute mode="gpu" slug={slug} />;
  }

  if (pathname.startsWith("/comparatifs/vram/")) {
    const slug = pathname.replace(/^\/comparatifs\/vram\//, "").replace(/\/$/, "");
    return <ComparisonRoute mode="vram" slug={slug} />;
  }

  if (pathname.startsWith("/usages/")) {
    const slug = pathname.replace(/^\/usages\//, "").replace(/\/$/, "");
    return <UsageRoute slug={slug} />;
  }

  if (pathname === "/guides/choisir-gpu-llm" || pathname === "/guides/choisir-gpu-llm/") {
    return <GuidePage />;
  }

  if (pathname === "/faq" || pathname === "/faq/") {
    return <FaqPage />;
  }

  return <App />;
}
