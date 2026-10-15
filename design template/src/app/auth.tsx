import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role = "student" | "starosta" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  group?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const CREDENTIALS: Record<string, { password: string; user: AuthUser }> = {
  student: {
    password: "student123",
    user: { id: "u1", name: "Иван Петров", role: "student", group: "БИ-241" },
  },
  starosta: {
    password: "starosta123",
    user: { id: "u2", name: "Анна Смирнова", role: "starosta", group: "БИ-241" },
  },
  admin: {
    password: "admin123",
    user: { id: "u3", name: "Михаил Козлов", role: "admin" },
  },
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const s = localStorage.getItem("hse_user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("hse_token")
  );

  const login = async (username: string, password: string) => {
    const entry = CREDENTIALS[username.trim().toLowerCase()];
    if (!entry || entry.password !== password) {
      throw new Error("Неверный логин или пароль");
    }
    const mockToken = btoa(`${username}:${Date.now()}`);
    localStorage.setItem("hse_token", mockToken);
    localStorage.setItem("hse_user", JSON.stringify(entry.user));
    setToken(mockToken);
    setUser(entry.user);
  };

  const logout = () => {
    localStorage.removeItem("hse_token");
    localStorage.removeItem("hse_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
