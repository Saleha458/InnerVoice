import {
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import useAuth from "../../hooks/useAuth";

const Login = () => {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    login,
  } = useAuth();

  const [
    anonymousId,
    setAnonymousId,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  // =======================================================
  // SUBMIT
  // =======================================================

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      setError("");

      if (
        !anonymousId.trim() ||
        !password
      ) {
        setError(
          "Anonymous ID and password are required."
        );

        return;
      }

      try {
        setLoading(true);

        const result =
          await login(
            anonymousId.trim(),
            password
          );

        const role =
          result?.user?.role ||
          "user";

        // ---------------------------------------------------
        // RETURN TO ORIGINAL PROTECTED PAGE
        // ---------------------------------------------------

        const destination =
          location.state?.from
            ?.pathname;

        if (
          destination &&
          destination !==
            "/login"
        ) {
          navigate(
            destination,
            {
              replace: true,
            }
          );

          return;
        }

        // ---------------------------------------------------
        // ROLE-BASED REDIRECT
        // ---------------------------------------------------

        if (
          role === "admin"
        ) {
          navigate(
            "/admin/dashboard",
            {
              replace: true,
            }
          );

          return;
        }

        if (
          role === "expert"
        ) {
          navigate(
            "/expert/dashboard",
            {
              replace: true,
            }
          );

          return;
        }

        if (
          role === "parent"
        ) {
          navigate(
            "/parent/dashboard",
            {
              replace: true,
            }
          );

          return;
        }

        navigate(
          "/user/dashboard",
          {
            replace: true,
          }
        );
      } catch (err) {
        setError(
          err?.response?.data
            ?.message ||
            err?.message ||
            "Unable to sign in."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="auth-header">
          <span className="eyebrow">
            INNERVOICE
          </span>

          <h1>
            Welcome back
          </h1>

          <p>
            Sign in using your
            anonymous identity.
          </p>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            className="error-box"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          {/* Anonymous ID */}

          <div className="form-group">
            <label htmlFor="anonymousId">
              Anonymous ID
            </label>

            <input
              id="anonymousId"
              type="text"
              value={anonymousId}
              onChange={(e) =>
                setAnonymousId(
                  e.target.value
                )
              }
              placeholder="e.g. quiet_soul"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          {/* Password */}

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                style={{
                  paddingRight:
                    "80px",
                  width: "100%",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value
                  )
                }
                disabled={loading}
                style={{
                  position:
                    "absolute",
                  right: "10px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  border: "none",
                  background:
                    "transparent",
                  cursor:
                    "pointer",
                }}
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>
          </div>

          {/* Submit */}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        {/* =================================================
            REGISTER
        ================================================= */}

        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/register">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;