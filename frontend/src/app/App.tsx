import React from "react";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./Layout";
import LoginPage from "./pages/Login";
import StudentPage from "./pages/Student";
import StarostaPage from "./pages/Starosta";
import BonusesPage from "./pages/Bonuses";
import AdminPage from "./pages/Admin";

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Проверяем авторизацию…</div>;
  }
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "starosta") return <Navigate to="/starosta" replace />;
    return <Navigate to="/student" replace />;
  }
  return <Layout>{children}</Layout>;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Проверяем авторизацию…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "starosta") return <Navigate to="/starosta" replace />;
  return <Navigate to="/student" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleRedirect />} />

      <Route
        path="/student"
        element={
          <RequireAuth roles={["student", "starosta"]}>
            <StudentPage />
          </RequireAuth>
        }
      />
      <Route
        path="/starosta"
        element={
          <RequireAuth roles={["starosta"]}>
            <StarostaPage />
          </RequireAuth>
        }
      />
      <Route
        path="/bonuses"
        element={
          <RequireAuth roles={["student", "starosta"]}>
            <BonusesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth roles={["admin"]}>
            <AdminPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={["/"]} initialIndex={0}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>
  );
}
