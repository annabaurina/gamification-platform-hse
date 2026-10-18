import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { getCurrentAccount, obtainTokens, type CurrentAccount } from "./api/auth.api";
import { setLogoutCallback } from "./api/client";

export type Role = "student" | "starosta" | "admin";

export interface AuthUser {
  /** Student ID for student/headman, account ID for staff without a student profile. */
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

function mapCurrentAccount(account: CurrentAccount): AuthUser {
  if (account.role === "unassigned") {
    throw new Error(
      "Для этой учётной записи не найден профиль студента и нет административных прав. Обратитесь к администратору.",
    );
  }

  if (account.role !== "admin" && !account.student) {
    throw new Error(
      "Backend не вернул профиль студента для обычного пользователя. Проверьте связь User и Student.",
    );
  }

  const student = account.student;
  const fullName = `${account.first_name ?? ""} ${account.last_name ?? ""}`.trim();
  const name = student?.full_name || fullName || account.username;

  return {
    id: String(student?.id ?? account.user_id),
    userId: account.user_id,
    studentId: student?.id,
    name,
    role: account.role,
  };
}

function persistUser(user: AuthUser): void {
  localStorage.setItem("hse_user", JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("hse_access_token"),
  );
  const [loading, setLoading] = useState<boolean>(() =>
    Boolean(localStorage.getItem("hse_access_token")),
  );

  const logout = useCallback(() => {
    localStorage.removeItem("hse_access_token");
    localStorage.removeItem("hse_refresh_token");
    localStorage.removeItem("hse_user");
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  // Let the Axios interceptor invalidate React auth state when refresh fails.
  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  // Revalidate the session and role on reload; never trust a stale role from localStorage.
  useEffect(() => {
    if (!localStorage.getItem("hse_access_token")) {
      setLoading(false);
      setUser(null);
      setToken(null);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const account = await getCurrentAccount();
        const authUser = mapCurrentAccount(account);
        if (!active) return;
        setUser(authUser);
        setToken(localStorage.getItem("hse_access_token"));
        persistUser(authUser);
      } catch {
        if (active) logout();
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [logout]);

  const login = async (username: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const tokens = await obtainTokens(username, password);
      localStorage.setItem("hse_access_token", tokens.access);
      localStorage.setItem("hse_refresh_token", tokens.refresh);
      setToken(tokens.access);

      // Role is resolved by the authenticated endpoint, not guessed from a failed list request.
      const account = await getCurrentAccount();
      const authUser = mapCurrentAccount(account);
      persistUser(authUser);
      setUser(authUser);
    } catch (error) {
      localStorage.removeItem("hse_access_token");
      localStorage.removeItem("hse_refresh_token");
      localStorage.removeItem("hse_user");
      setToken(null);
      setUser(null);
      throw error;
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
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be inside AuthProvider");
  return context;
}
