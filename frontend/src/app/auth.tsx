import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { obtainTokens, decodeJwtPayload } from "./api/auth.api";
import { getStudents } from "./api/students.api";
import { setLogoutCallback } from "./api/client";

export type Role = "student" | "starosta" | "admin";

export interface AuthUser {
  id: string;
  userId: number;
  studentId?: number;
  name: string;
  role: Role;
  group?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadStoredUser(): AuthUser | null {
  try {
    const s = localStorage.getItem("hse_user");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("hse_access_token")
  );
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem("hse_access_token");
    localStorage.removeItem("hse_refresh_token");
    localStorage.removeItem("hse_user");
    setToken(null);
    setUser(null);
  }, []);

  // Register logout with API client so interceptors can call it
  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      // Step 1: obtain JWT tokens
      const tokens = await obtainTokens(username, password);
      localStorage.setItem("hse_access_token", tokens.access);
      localStorage.setItem("hse_refresh_token", tokens.refresh);
      setToken(tokens.access);

      // Step 2: decode JWT to get Django user_id
      const payload = decodeJwtPayload(tokens.access);
      const userId = payload.user_id as number | undefined;

      // Step 3: find student profile by user_id to determine role
      let authUser: AuthUser;
      try {
        const students = await getStudents();
        const myStudent = userId
          ? students.find((s) => s.user.id === userId)
          : undefined;

        if (myStudent) {
          authUser = {
            id: String(myStudent.id),
            userId: myStudent.user.id,
            studentId: myStudent.id,
            name: myStudent.full_name || `${myStudent.user.first_name} ${myStudent.user.last_name}`.trim() || myStudent.user.username,
            role: myStudent.is_headman ? "starosta" : "student",
          };
        } else {
          // No student profile found — assume admin (is_staff user)
          authUser = {
            id: String(userId ?? 0),
            userId: userId ?? 0,
            name: username,
            role: "admin",
          };
        }
      } catch {
        // If students endpoint fails (unlikely for authenticated user), treat as admin
        authUser = {
          id: String(userId ?? 0),
          userId: userId ?? 0,
          name: username,
          role: "admin",
        };
      }

      localStorage.setItem("hse_user", JSON.stringify(authUser));
      setUser(authUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
