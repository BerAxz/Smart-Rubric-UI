import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { components } from "../api/generated";
import { authApi } from "../api/services";
import { authStorage, type StoredAuth } from "../api/client";

interface AuthContextValue {
  user: components["schemas"]["UserRead"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<components["schemas"]["UserRead"] | null>(() => authStorage.read()?.user ?? null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuth = useCallback((auth: StoredAuth) => {
    setUser(auth.user);
  }, []);

  const clearAuth = useCallback(() => {
    authStorage.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    const stored = authStorage.read();
    if (!stored) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    authApi
      .me()
      .then((nextUser) => {
        if (!active) return;
        setUser(nextUser);
        const latest = authStorage.read();
        if (latest) authStorage.write({ ...latest, user: nextUser });
      })
      .catch(() => {
        if (active) clearAuth();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clearAuth]);

  useEffect(() => {
    const onExpired = () => clearAuth();
    window.addEventListener("smart-rubric:session-expired", onExpired);
    return () => window.removeEventListener("smart-rubric:session-expired", onExpired);
  }, [clearAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      applyAuth(await authApi.login({ email, password }));
    },
    [applyAuth],
  );

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      applyAuth(await authApi.register({ full_name: fullName.trim(), email, password }));
      try {
        localStorage.setItem(`smart-rubric-display-name:${email.trim().toLowerCase()}`, fullName.trim());
      } catch {
        // The API currently does not persist full_name; keep it as a local display fallback.
      }
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Clearing local credentials is still the safe outcome when the API is unavailable.
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const refreshUser = useCallback(async () => {
    const nextUser = await authApi.me();
    setUser(nextUser);
    const latest = authStorage.read();
    if (latest) authStorage.write({ ...latest, user: nextUser });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated: Boolean(user), login, register, logout, refreshUser }),
    [user, isLoading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return value;
}
