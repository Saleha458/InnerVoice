import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const userLinks = [
  {
    to: "/user/dashboard",
    label: "Dashboard",
    icon: "⌂",
  },
  {
    to: "/chat",
    label: "AI Support",
    icon: "✦",
  },
  {
    to: "/experts",
    label: "Find Expert",
    icon: "♧",
  },
  {
    to: "/bookings",
    label: "My Sessions",
    icon: "◷",
  },
  {
    to: "/mood",
    label: "Mood",
    icon: "◉",
  },
  {
    to: "/journal",
    label: "Journal",
    icon: "▤",
  },
  {
    to: "/reports",
    label: "Reports",
    icon: "⚑",
  },
];

const expertLinks = [
  {
    to: "/expert/dashboard",
    label: "Dashboard",
    icon: "⌂",
  },
  {
    to: "/expert/requests",
    label: "Requests",
    icon: "↗",
  },
  {
    to: "/expert/sessions",
    label: "Sessions",
    icon: "◷",
  },
  {
    to: "/expert/messages",
    label: "Messages",
    icon: "◌",
  },
  {
    to: "/expert/profile",
    label: "Profile",
    icon: "◎",
  },
];

const parentLinks = [
  {
    to: "/parent/dashboard",
    label: "Dashboard",
    icon: "⌂",
  },
  {
    to: "/parent/guidelines",
    label: "Guidelines",
    icon: "▤",
  },
  {
    to: "/parent/warnings",
    label: "Warning Signs",
    icon: "!",
  },
  {
    to: "/parent/profile",
    label: "Profile",
    icon: "◎",
  },
];

const adminLinks = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: "⌂",
  },
  {
    to: "/admin/experts",
    label: "Expert Verification",
    icon: "✓",
  },
  {
    to: "/admin/users",
    label: "Users",
    icon: "♙",
  },
  {
    to: "/admin/reports",
    label: "Reports",
    icon: "⚑",
  },
  {
    to: "/admin/sessions",
    label: "Sessions",
    icon: "◷",
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  let links = userLinks;

  if (user?.role === "expert") {
    links = expertLinks;
  }

  if (user?.role === "parent") {
    links = parentLinks;
  }

  if (user?.role === "admin") {
    links = adminLinks;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  };

  return (
    <aside className="sidebar">

      <div className="sidebar-brand">
        <div className="sidebar-logo">
          IV
        </div>

        <div>
          <strong>InnerVoice</strong>
          <small>
            A safer space to be heard
          </small>
        </div>
      </div>

      <nav className="sidebar-nav">

        <div className="sidebar-section-title">
          {user?.role === "user"
            ? "Your Space"
            : user?.role === "expert"
            ? "Professional Space"
            : user?.role === "parent"
            ? "Parent Hub"
            : "Administration"}
        </div>

        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            <span className="sidebar-icon">
              {item.icon}
            </span>

            <span>
              {item.label}
            </span>
          </NavLink>
        ))}

      </nav>

      <div className="sidebar-bottom">

        <NavLink
          to="/profile"
          className="sidebar-link"
        >
          <span className="sidebar-icon">
            ◎
          </span>
          Profile
        </NavLink>

        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </div>
    </aside>
  );
}