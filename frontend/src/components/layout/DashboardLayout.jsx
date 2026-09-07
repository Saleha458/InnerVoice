import { useState } from "react";
import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileDrawer from "./MobileDrawer";

const DashboardLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  return (
    <div className="dashboard-layout">

      <Navbar
        onMenuClick={() =>
          setMobileMenuOpen(true)
        }
      />

      <div className="dashboard-body">

        {/* Desktop Sidebar */}
        <div className="desktop-sidebar">
          <Sidebar />
        </div>

        {/* Mobile Drawer */}
        <MobileDrawer
          open={mobileMenuOpen}
          onClose={() =>
            setMobileMenuOpen(false)
          }
        />

        {/* Page Content */}
        <main className="dashboard-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default DashboardLayout;