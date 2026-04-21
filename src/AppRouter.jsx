import { useEffect, useState } from "react";
import App from "./App.jsx";
import { AdminApp } from "./admin/AdminApp.jsx";
import "./admin/admin.css";

function getCurrentPath() {
  return window.location.pathname;
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

  return <App />;
}
