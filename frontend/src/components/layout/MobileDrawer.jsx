
import { useEffect, useRef } from "react";
import Sidebar from "./Sidebar";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function MobileDrawer({ open, onClose }) {
  const drawerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const items = [...drawerRef.current.querySelectorAll(FOCUSABLE)]
        .filter((node) => node.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mobile-drawer-wrapper">
      <div className="mobile-drawer-overlay" aria-hidden="true" onClick={onClose} />
      <div
        className="mobile-drawer"
        id="inner-voice-mobile-menu"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button
          ref={closeRef}
          type="button"
          className="iv-mobile-close"
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          ×
        </button>
        <Sidebar onClose={onClose} />
      </div>
    </div>
  );
}