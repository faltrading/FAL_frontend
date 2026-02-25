"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "./api";
import type { User, TokenPayload, TokenResponse } from "./types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  role: "user" | "admin" | null;
  isAdmin: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    if (decoded.exp * 1000 < Date.now()) return null;
    return decoded as TokenPayload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await api.get<User>("/api/v1/users/me");
      setUser(profile);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("fal_token");
    if (savedToken) {
      const decoded = decodeToken(savedToken);
      if (decoded) {
        setToken(savedToken);
        setRole(decoded.role);
        refreshUser().finally(() => setLoading(false));
      } else {
        localStorage.removeItem("fal_token");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (username: string, password: string) => {
    const res = await api.post<TokenResponse>("/api/v1/auth/login", { username, password });
    localStorage.setItem("fal_token", res.access_token);
    setToken(res.access_token);
    const decoded = decodeToken(res.access_token);
    if (decoded) setRole(decoded.role);
    await refreshUser();
  };

  const register = async (data: Record<string, string>) => {
    await api.post("/api/v1/auth/register", data);
  };

  const logout = async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // silent
    }
    localStorage.removeItem("fal_token");
    setToken(null);
    setUser(null);
    setRole(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{ user, token, role, isAdmin: role === "admin", loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
