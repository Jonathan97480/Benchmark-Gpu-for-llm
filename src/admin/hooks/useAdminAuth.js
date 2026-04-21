import { useCallback, useEffect, useState } from "react";
import {
  clearAdminSession,
  fetchAdminExists,
  loginAdmin,
  logoutAdmin,
  registerAdmin,
  restoreAdminSession,
} from "../services/adminApi.js";

export function useAdminAuth() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const adminState = await fetchAdminExists();
        let hasSession = false;

        try {
          await restoreAdminSession();
          hasSession = true;
        } catch {
          clearAdminSession();
        }

        if (!active) {
          return;
        }

        setAdminExists(Boolean(adminState.exists));
        setAuthenticated(hasSession);
        setError("");
      } catch (bootstrapError) {
        if (!active) {
          return;
        }

        setError(bootstrapError.message || "Failed to initialize admin session");
      } finally {
        if (active) {
          setBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    setPending(true);
    setError("");

    try {
      await loginAdmin({ username, password });
      setAuthenticated(true);
    } catch (loginError) {
      setError(loginError.message || "Login failed");
      throw loginError;
    } finally {
      setPending(false);
    }
  }, []);

  const createFirstAdmin = useCallback(async (username, password, confirmPassword) => {
    setPending(true);
    setError("");

    try {
      await registerAdmin({ username, password, confirmPassword });
      setAdminExists(true);
      await login(username, password);
    } catch (registerError) {
      setError(registerError.message || "Registration failed");
      throw registerError;
    } finally {
      setPending(false);
    }
  }, [login]);

  const logout = useCallback(async () => {
    setPending(true);
    setError("");

    try {
      await logoutAdmin();
    } finally {
      setAuthenticated(false);
      setPending(false);
    }
  }, []);

  const handleUnauthorized = useCallback(async () => {
    await logoutAdmin();
    setAuthenticated(false);
    setError("Session expirée. Reconnectez-vous.");
  }, []);

  return {
    adminExists,
    authenticated,
    bootstrapping,
    createFirstAdmin,
    error,
    handleUnauthorized,
    login,
    logout,
    pending,
    setError,
  };
}
