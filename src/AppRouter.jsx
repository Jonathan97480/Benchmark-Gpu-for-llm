import { useEffect, useState } from "react";
import App from "./App.jsx";
import { AdminApp } from "./admin/AdminApp.jsx";
import { GpuDetailPage } from "./components/pages/GpuDetailPage.jsx";
import { ModelPage } from "./components/pages/ModelPage.jsx";
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

  return <App />;
}
