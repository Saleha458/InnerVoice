
import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import AuthShell from "./AuthShell";

export default function Login() {
  const { login, restore } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [anonymousId, setAnonymousId] = useState("");
  const [password, setPassword] = useState("");
  const [restoreMode, setRestoreMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================================================
     SUBMIT — SIGN IN OR RESTORE
  ========================================================= */

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!anonymousId.trim() || !password) {
      setError("Both fields are required.");
      return;
    }

    try {
      setLoading(true);

      if (restoreMode) {
        await restore(anonymousId.trim(), password);

        setRestoreMode(false);
        setPassword("");

        setSuccess(
          "Account restored. Please sign in. Cancelled bookings remain cancelled."
        );

        return;
      }

      const result = await login(
        anonymousId.trim(),
        password
      );

      const role = result?.user?.role || "user";
      const destination = location.state?.from?.pathname;

      if (
        destination &&
        destination !== "/login" &&
        destination !== "/restore"
      ) {
        navigate(destination, {
          replace: true,
        });

        return;
      }

      const routes = {
        user: "/user/dashboard",
        expert: "/expert/dashboard",
        parent: "/parent/dashboard",
        admin: "/admin/dashboard",
      };

      navigate(routes[role] || "/user/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Please try again."
      );

      if (
        err?.response?.data?.code ===
        "ACCOUNT_DEACTIVATED"
      ) {
        setRestoreMode(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleRestoreMode = () => {
    setRestoreMode((current) => !current);
    setError("");
    setSuccess("");
    setPassword("");
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <AuthShell variant="login">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">INNERVOICE</span>

          <h1>
            {restoreMode
              ? "Welcome back to your space."
              : "Welcome back."}
          </h1>

          <p>
            {restoreMode
              ? "Restore your deactivated account within 30 days using your Anonymous ID and password."
              : "Sign in with your anonymous identity and continue where you left off."}
          </p>
        </div>

        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="success-box" role="status">
            {success}
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="login-anonymous-id">
              Anonymous ID
            </label>

            <input
              id="login-anonymous-id"
              className="form-input"
              type="text"
              autoComplete="username"
              placeholder="Enter your Anonymous ID"
              value={anonymousId}
              onChange={(event) =>
                setAnonymousId(event.target.value)
              }
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              className="form-input"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              disabled={loading}
            />
          </div>

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : restoreMode
              ? "Restore account"
              : "Sign in"}
          </button>
        </form>

        <div className="iv-auth-extra-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={loading}
            onClick={toggleRestoreMode}
          >
            {restoreMode
              ? "← Back to sign in"
              : "Restore a deactivated account"}
          </button>
        </div>

        {!restoreMode && (
          <div className="auth-footer">
            <p>
              New here?{" "}
              <Link to="/register">
                Create an account
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthShell>
  );
}