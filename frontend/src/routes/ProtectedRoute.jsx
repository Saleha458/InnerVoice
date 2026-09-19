
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

/* =========================================================
   BRANDED LOADING TRANSITION
========================================================= */

const loadingStyles = {
  screen: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,

    display: "grid",
    placeItems: "center",

    padding: 24,

    background:
      "radial-gradient(circle at 22% 15%, #fff0df 0%, transparent 45%), #fffbf5",

    color: "#292826",

    fontFamily:
      'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
  },

  brand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,

    fontSize: 25,
    fontWeight: 800,

    letterSpacing:
      "-0.045em",
  },

  symbol: {
    display: "grid",
    placeItems: "center",

    width: 45,
    height: 45,

    borderRadius: 14,

    background: "#fae1d0",
    color: "#b97855",

    fontSize: 26,
  },

  caption: {
    margin:
      "20px 0 0",

    color:
      "#77675c",

    fontSize:
      13,

    textAlign:
      "center",

    lineHeight:
      1.7,
  },

  progress: {
    width: 112,
    height: 3,

    overflow:
      "hidden",

    margin:
      "22px auto 0",

    borderRadius:
      20,

    background:
      "#f0dfce",
  },

  bar: {
    width: "42%",
    height: "100%",

    borderRadius: 20,

    background:
      "#b97855",

    animation:
      "ivSessionProgress 1s ease-in-out infinite alternate",
  },
};

/* =========================================================
   PROTECTED ROUTE
========================================================= */

export default function ProtectedRoute() {
  const {
    user,
    loading,
  } = useAuth();

  const location =
    useLocation();

  if (loading) {
    return (
      <main
        style={
          loadingStyles.screen
        }
        aria-busy="true"
        aria-label="Checking your private session"
      >
        <style>
          {`
            @keyframes ivSessionProgress {
              from {
                transform: translateX(0);
              }

              to {
                transform: translateX(155%);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              main[aria-busy="true"] * {
                animation: none !important;
              }
            }
          `}
        </style>

        <div
          role="status"
          aria-live="polite"
        >
          <div
            style={
              loadingStyles.brand
            }
          >
            <span
              style={
                loadingStyles.symbol
              }
              aria-hidden="true"
            >
              ✳
            </span>

            <span>
              Inner
              <span
                style={{
                  color:
                    "#b97855",
                }}
              >
                Voice
              </span>
            </span>
          </div>

          <p
            style={
              loadingStyles.caption
            }
          >
            Opening your private space…
          </p>

          <div
            style={
              loadingStyles.progress
            }
            aria-hidden="true"
          >
            <div
              style={
                loadingStyles.bar
              }
            />
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
}