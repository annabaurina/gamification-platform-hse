import React, { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "./auth";
import {
  LayoutDashboard,
  Users,
  Gift,
  ShieldCheck,
  LogOut,
  GraduationCap,
  ClipboardList,
} from "lucide-react";

const HseMark = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="3" fill="white" fillOpacity="0.15" />
    <text
      x="20"
      y="26"
      textAnchor="middle"
      fill="white"
      fontSize="15"
      fontWeight="700"
      fontFamily="PT Sans, sans-serif"
      letterSpacing="-0.5"
    >
      ВШЭ
    </text>
  </svg>
);

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles: Array<"student" | "starosta" | "admin">;
}

const NAV: NavItem[] = [
  { to: "/student",  label: "Личный кабинет",   icon: LayoutDashboard, roles: ["student", "starosta"] },
  { to: "/starosta", label: "Посещаемость и оценки", icon: ClipboardList, roles: ["starosta"] },
  { to: "/bonuses",  label: "Бонусные баллы",   icon: Gift,            roles: ["student", "starosta"] },
  { to: "/admin",    label: "Панель администратора", icon: ShieldCheck, roles: ["admin"] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const visibleNav = NAV.filter((n) => user && n.roles.includes(user.role));

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-60 shrink-0 min-h-screen"
        style={{ backgroundColor: "#0F2D69" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <HseMark />
          <div>
            <div className="text-white font-bold text-sm leading-tight">НИУ ВШЭ</div>
            <div className="text-white/50 text-xs leading-tight">Студенческий портал</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visibleNav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors",
                  active
                    ? "bg-white/15 text-white font-semibold"
                    : "text-white/65 hover:bg-white/8 hover:text-white",
                ].join(" ")}
              >
                <Icon size={16} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: "#374B9B", color: "white" }}
            >
              {user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.name}</div>
              {user?.group && (
                <div className="text-white/45 text-xs truncate">{user.group}</div>
              )}
              {user?.role === "admin" && (
                <div className="text-white/45 text-xs">Администратор</div>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors w-full px-1"
          >
            <LogOut size={13} />
            Выйти
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-[#E6E7E8] min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
