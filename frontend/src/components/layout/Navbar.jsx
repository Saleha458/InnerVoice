import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="top-navbar">

      <Link
        to="/dashboard"
        className="navbar-brand"
      >
        Inner<span>Voice</span>
      </Link>

      <div className="navbar-right">

        {user && (
          <Link
            to="/notifications"
            className="navbar-icon-button"
            aria-label="Notifications"
          >
            🔔
          </Link>
        )}

        {user && (
          <Link
            to="/profile"
            className="navbar-profile"
          >
            <span className="navbar-avatar">
              {user.anonymousId
                ?.charAt(0)
                ?.toUpperCase() || "U"}
            </span>

            <span>
              {user.anonymousId ||
                "Anonymous"}
            </span>
          </Link>
        )}

      </div>
    </header>
  );
}