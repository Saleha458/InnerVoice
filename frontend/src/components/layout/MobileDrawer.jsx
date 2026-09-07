import Sidebar from "./Sidebar";

const MobileDrawer = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="mobile-drawer-wrapper">

      <div
        className="mobile-drawer-overlay"
        onClick={onClose}
      />

      <div className="mobile-drawer">
        <Sidebar onClose={onClose} />
      </div>

    </div>
  );
};

export default MobileDrawer;