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

import Navbar
  from "./Navbar";

import Sidebar
  from "./Sidebar";

import MobileDrawer
  from "./MobileDrawer";

export default function DashboardLayout() {
  const {
    user,
    accountProfile,
  } = useAuth();

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(
    false
  );

  const [
    recoveryReminderDismissed,
    setRecoveryReminderDismissed,
  ] = useState(
    false
  );

  const closeMobileMenu =
    useCallback(
      () => {
        setMobileMenuOpen(
          false
        );
      },

      []
    );

  /* =========================================================
     MOBILE DRAWER
  ========================================================= */

  useEffect(
    () => {
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

      return () => {
        window.removeEventListener(
          "resize",
          closeOnDesktop
        );
      };
    },

    [
      mobileMenuOpen,
      closeMobileMenu,
    ]
  );

  /* =========================================================
     RECOVERY REMINDER KEY

     Each account receives its own reminder state.
  ========================================================= */

  const recoveryReminderKey =
    useMemo(
      () => {
        const identity =
          user?.uid ||
          user?.anonymousId;

        if (
          !identity
        ) {
          return "";
        }

        return (
          "innervoice:recovery-reminder-dismissed:" +
          identity
        );
      },

      [
        user?.uid,
        user?.anonymousId,
      ]
    );

  /* =========================================================
     LOAD "NOT NOW" STATE

     The user can dismiss the reminder only for the current
     browser session.

     On the next fresh browser session/login, it can appear
     again until recovery has actually been configured.
  ========================================================= */

  useEffect(
    () => {
      if (
        !recoveryReminderKey
      ) {
        setRecoveryReminderDismissed(
          false
        );

        return;
      }

      try {
        const dismissed =
          sessionStorage
            .getItem(
              recoveryReminderKey
            ) ===
          "1";

        setRecoveryReminderDismissed(
          dismissed
        );
      } catch {
        setRecoveryReminderDismissed(
          false
        );
      }
    },

    [
      recoveryReminderKey,
    ]
  );

  /* =========================================================
     RECOVERY CONFIGURATION STATE

     IMPORTANT:

     Old accounts may NOT have:
       recoveryConfigured: false

     The field can be undefined because those accounts were
     created before password recovery existed.

     Therefore:
       === false

     is NOT enough.

     An account is considered protected only when:
     - recoveryConfigured === true
       OR
     - a recoveryQuestionId already exists.
  ========================================================= */

  const recoveryIsConfigured =
    Boolean(
      accountProfile &&
      (
        accountProfile
          .recoveryConfigured ===
          true ||
        accountProfile
          .recoveryQuestionId
      )
    );

  /* =========================================================
     SHOULD SHOW ACCOUNT SECURITY REMINDER
  ========================================================= */

  const shouldShowRecoveryReminder =
    Boolean(
      user &&
      user.role !==
        "admin" &&
      accountProfile &&
      !recoveryIsConfigured &&
      !recoveryReminderDismissed
    );

  /* =========================================================
     DISMISS FOR CURRENT BROWSER SESSION
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
        sessionStorage
          .setItem(
            recoveryReminderKey,
            "1"
          );
      } catch {
        /*
         * Storage being unavailable should never
         * break the dashboard.
         */
      }
    };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="dashboard-layout">
      {/* ACCESSIBILITY */}

      <a
        className="iv-skip-link"
        href="#inner-voice-main"
      >
        Skip to main content
      </a>

      {/* TOP NAVIGATION */}

      <Navbar
        mobileMenuOpen={
          mobileMenuOpen
        }
        onMenuClick={() => {
          setMobileMenuOpen(
            true
          );
        }}
      />

      <div className="dashboard-body">
        {/* DESKTOP SIDEBAR */}

        <div className="desktop-sidebar">
          <Sidebar />
        </div>

        {/* MOBILE SIDEBAR */}

        <MobileDrawer
          open={
            mobileMenuOpen
          }
          onClose={
            closeMobileMenu
          }
        />

        {/* MAIN CONTENT */}

        <main
          id="inner-voice-main"
          className="dashboard-content"
          tabIndex={-1}
        >
          {/* =================================================
              ACCOUNT SECURITY / RECOVERY REMINDER

              Shows for:
              - User
              - Parent
              - Expert

              Does not show for:
              - Admin
              - Accounts with recovery already configured
              - Current-session dismissed reminder
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

                flexWrap:
                  "wrap",

                gap:
                  18,

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
              {/* MESSAGE */}

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

                    lineHeight:
                      1.4,
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
                  Set up a private recovery question from your
                  Profile. It lets you reset your password later
                  without adding an email address or phone number.
                </p>
              </div>

              {/* ACTIONS */}

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

                    border:
                      "1px solid #b96f4c",

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

          {/* CURRENT ROUTE */}

          <Outlet />
        </main>
      </div>
    </div>
  );
}