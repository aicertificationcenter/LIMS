import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { apiClient } from "./api/client";
import { clearStoredAuthTokens, getStoredToken } from "./convexClient";

export interface User {
  id: string;
  name: string;
  role:
    | "ADMIN"
    | "TESTER"
    | "TECH_MGR"
    | "QUAL_MGR"
    | "PENDING"
    | "GUEST"
    | "RESIGNED"
    | "MANAGER"
    | "CLIENT";
  email?: string;
  phone?: string;
  legacyUsername?: string;
  status?: "ACTIVE" | "PENDING" | "RESIGNED";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await apiClient.auth.current();
      setUser(currentUser);
    } catch (_error) {
      clearStoredAuthTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        logout: async () => {
          try {
            await apiClient.auth.logout();
          } catch {
            // ignore server-side sign-out failures
          }
          clearStoredAuthTokens();
          setUser(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
