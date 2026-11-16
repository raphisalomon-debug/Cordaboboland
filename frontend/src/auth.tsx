// Auth context: 2 accounts only, email + password, token kept in secure storage.
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { api, setApiToken, setUnauthorizedHandler } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { storage } from "@/src/utils/storage";

export type User = { id: string; email: string; name: string; role: "admin" | "partner" };

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const TOKEN_KEY = "auth_token";
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    setApiToken(null);
    await storage.secureRemove(TOKEN_KEY);
    queryClient.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void logout());
    (async () => {
      const saved = await storage.secureGet(TOKEN_KEY, null);
      if (typeof saved === "string") {
        setApiToken(saved);
        try {
          setUser(await api<User>("/auth/me"));
        } catch {
          setApiToken(null);
        }
      }
      setReady(true);
    })();
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setApiToken(res.token);
    await storage.secureSet(TOKEN_KEY, res.token);
    setUser(res.user);
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
