
import { Link } from "react-router-dom";
import { Bell, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Navbar({ onMenuClick, mobileMenuOpen = false }) {
  const { user } = useAuth();
  const showNotifications = user?.role === "user" || user?.role === "expert";
  const profileRoute = user?.role === "expert"
    ? "/expert/profile"
    : user?.role === "parent"
      ? "/parent/profile"
      : user?.role === "admin"
        ? "/admin/profile"
        : "/profile";
  const anonymousId = user?.anonymousId || "Anonymous";

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="navbar-menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-controls="inner-voice-mobile-menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <Link to="/dashboard" className="navbar-brand" aria-label="InnerVoice dashboard">
          <span className="navbar-brand-symbol" aria-hidden="true">✳</span>
          <span>Inner<span>Voice</span></span>
        </Link>
      </div>
      <div className="navbar-right">
        {showNotifications && (
          <Link to="/notifications" className="navbar-icon-button" aria-label="Notifications" title="Notifications">
            <Bell size={19} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        )}
        <Link to={profileRoute} className="navbar-profile" title={anonymousId}>
          <span className="navbar-avatar" aria-hidden="true">{anonymousId.charAt(0).toUpperCase()}</span>
          <span className="navbar-profile-name">{anonymousId}</span>
        </Link>
      </div>
    </header>
  );
}