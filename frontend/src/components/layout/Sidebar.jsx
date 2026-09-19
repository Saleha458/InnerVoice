
import { useState } from "react";

import {
  LayoutDashboard,
  Sparkles,
  Stethoscope,
  CalendarDays,
  Bell,
  Smile,
  BookOpen,
  Flag,
  UserRound,
  ClipboardList,
  Heart,
  ShieldAlert,
  Users,
  BadgeCheck,
  LogOut,
  Star,
  KeyRound
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const menus = {
  user: [
    "YOUR SPACE",
    [
      ["/user/dashboard", "Dashboard", LayoutDashboard],
      ["/chat", "AI Support", Sparkles],
      ["/experts", "Find Expert", Stethoscope],
      ["/bookings", "My Sessions", CalendarDays],
      ["/notifications", "Notifications", Bell],
      ["/mood", "Mood", Smile],
      ["/journal", "Journal", BookOpen],
      ["/reports", "Reports", Flag],
      ["/starred", "Starred Messages", Star],
      ["/vault-recovery", "Recovery Kit", KeyRound],
      ["/profile", "Profile", UserRound]
    ]
  ],

  expert: [
    "PROFESSIONAL SPACE",
    [
      ["/expert/dashboard", "Dashboard", LayoutDashboard],
      ["/expert/requests", "Requests", ClipboardList],
      ["/expert/sessions", "Sessions", CalendarDays],
      ["/vault-recovery", "Recovery Kit", KeyRound],
      ["/notifications", "Notifications", Bell],
      ["/expert/profile", "Profile", UserRound]
    ]
  ],

  parent: [
    "PARENT HUB",
    [
      ["/parent/dashboard", "Dashboard", LayoutDashboard],
      ["/parent/foundations", "Parenting Foundations", Heart],
      ["/parent/guidelines", "Guidelines", BookOpen],
      ["/parent/warnings", "Warning Signs", ShieldAlert],
      ["/parent/profile", "Profile", UserRound]
    ]
  ],

  admin: [
    "ADMINISTRATION",
    [
      ["/admin/dashboard", "Dashboard", LayoutDashboard],
      ["/admin/experts", "Expert Verification", BadgeCheck],
      ["/admin/users", "Users", Users],
      ["/admin/reports", "Reports", Flag]
    ]
  ]
};

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [title, links] = menus[user?.role] || menus.user;

  async function signOut() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await logout();

      onClose?.();

      navigate("/login", {
        replace: true
      });
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      className="sidebar"
      aria-label="Dashboard sidebar"
    >
      <nav
        className="sidebar-nav"
        aria-label="Dashboard navigation"
      >
        <div className="sidebar-section-title">
          {title}
        </div>

        {links.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to.endsWith("/dashboard")}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            <Icon
              className="sidebar-icon"
              size={18}
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <span className="sidebar-link-label">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {error && (
          <p
            className="sidebar-logout-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          className="sidebar-logout"
          disabled={busy}
          onClick={signOut}
        >
          <LogOut
            size={18}
            strokeWidth={1.8}
            aria-hidden="true"
          />

          <span>
            {busy ? "Signing out..." : "Log out"}
          </span>
        </button>
      </div>
    </aside>
  );
}