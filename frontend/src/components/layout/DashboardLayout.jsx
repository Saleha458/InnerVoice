
import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileDrawer from "./MobileDrawer";

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const closeOnDesktop = () => {
      if (window.innerWidth > 900) closeMobileMenu();
    };
    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, [mobileMenuOpen, closeMobileMenu]);

  return (
    <div className="dashboard-layout">
      <a className="iv-skip-link" href="#inner-voice-main">Skip to main content</a>
      <Navbar
        mobileMenuOpen={mobileMenuOpen}
        onMenuClick={() => setMobileMenuOpen(true)}
      />
      <div className="dashboard-body">
        <div className="desktop-sidebar"><Sidebar /></div>
        <MobileDrawer open={mobileMenuOpen} onClose={closeMobileMenu} />
        <main id="inner-voice-main" className="dashboard-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}