import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  Outlet,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileDrawer from "./MobileDrawer";

export default function DashboardLayout() {
  const {
    user,
    accountProfile,
  } = useAuth();

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const [
    recoveryReminderDismissed,
    setRecoveryReminderDismissed,
  ] = useState(false);

  const closeMobileMenu =
    useCallback(
      () =>
        setMobileMenuOpen(
          false
        ),
      []
    );

  /* =========================================================
     MOBILE DRAWER
  ========================================================= */

  useEffect(() => {
    if (
      !mobileMenuOpen
    ) {
      return undefined;
    }

    const closeOnDesktop =
      () => {
        if (
          window.innerWidth >
          900
        ) {
          closeMobileMenu();
        }
      };

    window.addEventListener(
      "resize",
      closeOnDesktop
    );

    return () =>
      window.removeEventListener(
        "resize",
        closeOnDesktop
      );
  }, [
    mobileMenuOpen,
    closeMobileMenu,
  ]);

  /* =========================================================
     RECOVERY REMINDER IDENTITY
  ========================================================= */

  const recoveryReminderKey =
    useMemo(
      () => {
        const identity =
          user?.uid ||
          user?.anonymousId;

        return identity
          ? `innervoice:recovery-reminder-dismissed:${identity}`
          : "";
      },

      [
        user?.uid,
        user?.anonymousId,
      ]
    );

  /* =========================================================
     LOAD "NOT NOW" STATE

     The user can dismiss the reminder for the current
     browser session. It will be available again in a new
     session until recovery is configured.
  ========================================================= */

  useEffect(() => {
    if (
      !recoveryReminderKey
    ) {
      setRecoveryReminderDismissed(
        false
      );

      return;
    }

    try {
      setRecoveryReminderDismissed(
        sessionStorage.getItem(
          recoveryReminderKey
        ) === "1"
      );
    } catch {
      setRecoveryReminderDismissed(
        false
      );
    }
  }, [
    recoveryReminderKey,
  ]);

  /* =========================================================
     SHOULD SHOW REMINDER
  ========================================================= */

  const shouldShowRecoveryReminder =
    Boolean(
      user &&
      user.role !==
        "admin" &&
      accountProfile &&
      accountProfile
        .recoveryConfigured ===
        false &&
      !recoveryReminderDismissed
    );

  /* =========================================================
     DISMISS FOR CURRENT SESSION
  ========================================================= */

  const dismissRecoveryReminder =
    () => {
      setRecoveryReminderDismissed(
        true
      );

      if (
        !recoveryReminderKey
      ) {
        return;
      }

      try {
        sessionStorage.setItem(
          recoveryReminderKey,
          "1"
        );
      } catch {
        // Ignore browser storage failures.
      }
    };

  return (
    <div className="dashboard-layout">
      <a
        className="iv-skip-link"
        href="#inner-voice-main"
      >
        Skip to main content
      </a>

      <Navbar
        mobileMenuOpen={
          mobileMenuOpen
        }
        onMenuClick={() =>
          setMobileMenuOpen(
            true
          )
        }
      />

      <div className="dashboard-body">
        <div className="desktop-sidebar">
          <Sidebar />
        </div>

        <MobileDrawer
          open={
            mobileMenuOpen
          }
          onClose={
            closeMobileMenu
          }
        />

        <main
          id="inner-voice-main"
          className="dashboard-content"
          tabIndex={-1}
        >
          {/* =================================================
              ACCOUNT RECOVERY REMINDER
          ================================================= */}

          {shouldShowRecoveryReminder && (
            <section
              role="status"
              aria-label="Password recovery setup reminder"
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap:
                  18,

                flexWrap:
                  "wrap",

                marginBottom:
                  22,

                padding:
                  "18px 20px",

                border:
                  "1px solid #ead1bd",

                borderRadius:
                  16,

                background:
                  "linear-gradient(135deg, #fff8f1 0%, #fffdfb 100%)",

                boxShadow:
                  "0 8px 24px rgba(88, 55, 36, 0.05)",
              }}
            >
              <div
                style={{
                  flex:
                    "1 1 420px",

                  minWidth:
                    0,
                }}
              >
                <span
                  style={{
                    display:
                      "block",

                    marginBottom:
                      5,

                    color:
                      "#a25f40",

                    fontSize:
                      10,

                    fontWeight:
                      850,

                    letterSpacing:
                      "0.12em",
                  }}
                >
                  ACCOUNT SECURITY
                </span>

                <strong
                  style={{
                    display:
                      "block",

                    marginBottom:
                      5,

                    color:
                      "#362a24",

                    fontSize:
                      15,
                  }}
                >
                  Protect your account with password recovery
                </strong>

                <p
                  style={{
                    maxWidth:
                      680,

                    margin:
                      0,

                    color:
                      "#75665e",

                    fontSize:
                      12,

                    lineHeight:
                      1.65,
                  }}
                >
                  Add a private recovery question from your
                  Profile so you can reset your password later
                  without using an email address or phone number.
                </p>
              </div>

              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  flexWrap:
                    "wrap",

                  gap:
                    9,
                }}
              >
                <Link
                  to="/profile"
                  style={{
                    display:
                      "inline-flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    minHeight:
                      42,

                    padding:
                      "0 16px",

                    borderRadius:
                      10,

                    background:
                      "#b96f4c",

                    color:
                      "#ffffff",

                    fontSize:
                      12,

                    fontWeight:
                      800,

                    textDecoration:
                      "none",

                    whiteSpace:
                      "nowrap",
                  }}
                >
                  Set up recovery
                </Link>

                <button
                  type="button"
                  onClick={
                    dismissRecoveryReminder
                  }
                  style={{
                    minHeight:
                      42,

                    padding:
                      "0 15px",

                    border:
                      "1px solid #e0cdbf",

                    borderRadius:
                      10,

                    background:
                      "#ffffff",

                    color:
                      "#765344",

                    font:
                      "inherit",

                    fontSize:
                      12,

                    fontWeight:
                      750,

                    cursor:
                      "pointer",
                  }}
                >
                  Not now
                </button>
              </div>
            </section>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
}