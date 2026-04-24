import { useEffect, useState } from "react";
import App from "./App.jsx";
import { AdminApp } from "./admin/AdminApp.jsx";
import { GpuDetailPage } from "./components/pages/GpuDetailPage.jsx";
import { useDashboardData } from "./hooks/useDashboardData.js";
import "./admin/admin.css";

function getCurrentPath() {
  return window.location.pathname;
}

function GpuDetailRoute({ slug }) {
  const dashboardData = useDashboardData();
  return <GpuDetailPage gpuData={dashboardData.gpuData} slug={slug} />;
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

  return <App />;
}
