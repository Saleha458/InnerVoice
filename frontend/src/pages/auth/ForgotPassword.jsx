import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../../services/api";
import AuthShell from "./AuthShell";

/* =========================================================
   LOCAL UI STYLES

   Kept inside this component so global auth/responsive CSS
   cannot push Show/Hide buttons outside password inputs.
========================================================= */

const fieldStyle = {
  width: "100%",
  minHeight: 56,
  padding: "0 18px",
  border: "1px solid #e5d2c4",
  borderRadius: 14,
  background: "#fffdfb",
  color: "#332d29",
  font: "inherit",
  fontSize: 14,
  boxSizing: "border-box",
};

const passwordFieldStyle = {
  position: "relative",
  width: "100%",
};

const passwordInputStyle = {
  ...fieldStyle,
  paddingRight: 82,
};

const showButtonStyle = {
  position: "absolute",
  top: "50%",
  right: 14,
  transform: "translateY(-50%)",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  minWidth: 52,
  height: 34,
  padding: "0 8px",

  border: "none",
  borderRadius: 8,

  background: "transparent",
  color: "#9b4e2b",

  font: "inherit",
  fontSize: 12,
  fontWeight: 800,

  cursor: "pointer",
  zIndex: 2,
};

const formGroupStyle = {
  display: "grid",
  gap: 9,
};

export default function ForgotPassword() {
  const navigate =
    useNavigate();

  const [
    anonymousId,
    setAnonymousId,
  ] = useState("");

  const [
    question,
    setQuestion,
  ] = useState("");

  const [
    questionLoaded,
    setQuestionLoaded,
  ] = useState(false);

  const [
    recoveryAnswer,
    setRecoveryAnswer,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  /* =========================================================
     ALWAYS OPEN FROM TOP
  ========================================================= */

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

  /* =========================================================
     PASSWORD RULES
  ========================================================= */

  const passwordRules =
    useMemo(
      () => ({
        length:
          newPassword.length >=
          8,

        uppercase:
          /[A-Z]/.test(
            newPassword
          ),

        lowercase:
          /[a-z]/.test(
            newPassword
          ),

        number:
          /\d/.test(
            newPassword
          ),

        special:
          /[^A-Za-z0-9]/.test(
            newPassword
          ),
      }),

      [
        newPassword,
      ]
    );

  const passwordValid =
    Object
      .values(
        passwordRules
      )
      .every(Boolean);

  const passwordsMatch =
    confirmPassword.length >
      0 &&
    newPassword ===
      confirmPassword;

  /* =========================================================
     LOAD RECOVERY QUESTION
  ========================================================= */

  async function loadQuestion(
    event
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const id =
      anonymousId.trim();

    if (
      !/^[A-Za-z0-9_]{3,30}$/.test(
        id
      )
    ) {
      setError(
        "Enter a valid Anonymous ID."
      );

      return;
    }

    try {
      setLoading(true);

      const {
        data,
      } =
        await api.post(
          "/auth/recovery/question",

          {
            anonymousId:
              id,
          }
        );

      setQuestion(
        data
          ?.recoveryQuestion ||
          ""
      );

      setQuestionLoaded(
        true
      );

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    } catch (err) {
      setQuestion("");

      setQuestionLoaded(
        false
      );

      setError(
        err
          ?.response
          ?.data
          ?.message ||
          "Could not start password recovery."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     RESET PASSWORD
  ========================================================= */

  async function resetPassword(
    event
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !questionLoaded
    ) {
      setError(
        "Load your recovery question first."
      );

      return;
    }

    const cleanAnswer =
      recoveryAnswer.trim();

    if (
      cleanAnswer.length <
        4 ||
      cleanAnswer.length >
        100
    ) {
      setError(
        "Enter your recovery answer."
      );

      return;
    }

    if (
      !passwordValid
    ) {
      setError(
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character."
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    try {
      setLoading(true);

      const {
        data,
      } =
        await api.post(
          "/auth/recovery/reset",

          {
            anonymousId:
              anonymousId.trim(),

            recoveryAnswer:
              cleanAnswer,

            newPassword,

            confirmPassword,
          }
        );

      setSuccess(
        data?.message ||
          "Password reset successful. You can now sign in."
      );

      setRecoveryAnswer("");
      setNewPassword("");
      setConfirmPassword("");

      window.setTimeout(
        () => {
          navigate(
            "/login",

            {
              replace: true,
            }
          );
        },

        1800
      );
    } catch (err) {
      setError(
        err
          ?.response
          ?.data
          ?.message ||
          "Password reset failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     CHANGE ACCOUNT
  ========================================================= */

  function changeAccount() {
    setQuestion("");
    setQuestionLoaded(false);

    setRecoveryAnswer("");
    setNewPassword("");
    setConfirmPassword("");

    setShowPassword(false);
    setShowConfirmPassword(false);

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }

  return (
    <AuthShell variant="login">
      <div
        className="auth-card iv-forgot-card"
        style={{
          width: "100%",
          maxWidth: 620,
          boxSizing: "border-box",
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="auth-header">
          <span className="eyebrow">
            PRIVATE ACCOUNT RECOVERY
          </span>

          <h1>
            Reset your password.
          </h1>

          <p>
            Use your Anonymous ID and the recovery
            question you selected when setting up your
            account. No email or phone number is required.
          </p>
        </div>

        {/* =================================================
            FEEDBACK
        ================================================= */}

        {error && (
          <div
            className="error-box"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="success-box"
            role="status"
          >
            {success}
          </div>
        )}

        {/* =================================================
            STEP 1 — ANONYMOUS ID
        ================================================= */}

        {!questionLoaded ? (
          <form
            className="auth-form iv-forgot-start-form"
            onSubmit={
              loadQuestion
            }
            style={{
              display: "grid",
              gap: 20,
            }}
          >
            <div
              className="form-group"
              style={
                formGroupStyle
              }
            >
              <label htmlFor="forgot-anonymous-id">
                Anonymous ID
              </label>

              <input
                id="forgot-anonymous-id"
                type="text"
                autoComplete="username"
                value={
                  anonymousId
                }
                onChange={
                  event =>
                    setAnonymousId(
                      event
                        .target
                        .value
                    )
                }
                placeholder="Enter your Anonymous ID"
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_]+"
                required
                disabled={
                  loading
                }
                style={
                  fieldStyle
                }
              />

              <small
                style={{
                  lineHeight: 1.6,
                }}
              >
                Enter the same Anonymous ID you use
                to sign in.
              </small>
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={
                loading
              }
              style={{
                width: "100%",
                minHeight: 52,
              }}
            >
              {loading
                ? "Checking..."
                : "Show my recovery question"}
            </button>
          </form>
        ) : (
          /* =================================================
             STEP 2 — RESET PASSWORD
          ================================================= */

          <form
            className="auth-form iv-forgot-reset-form"
            onSubmit={
              resetPassword
            }
            style={{
              display: "grid",
              gap: 22,
            }}
          >
            {/* RECOVERY QUESTION */}

            <div
              className="notice-box iv-recovery-question-card"
              style={{
                padding: "18px 20px",
                margin: 0,

                border:
                  "1px solid #ebcfba",

                borderRadius: 15,

                background:
                  "#fff7ef",
              }}
            >
              <span
                style={{
                  display: "block",

                  marginBottom: 7,

                  color: "#a45f40",

                  fontSize: 10,
                  fontWeight: 850,

                  letterSpacing:
                    "0.11em",
                }}
              >
                RECOVERY QUESTION
              </span>

              <strong
                style={{
                  display: "block",

                  color: "#372a23",

                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {question}
              </strong>

              <p
                style={{
                  margin:
                    "7px 0 0",

                  color: "#806b60",

                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                Enter the private answer you chose
                when recovery was configured.
              </p>
            </div>

            {/* RECOVERY ANSWER */}

            <div
              className="form-group"
              style={
                formGroupStyle
              }
            >
              <label htmlFor="recovery-answer">
                Recovery answer
              </label>

              <input
                id="recovery-answer"
                type="password"
                autoComplete="off"
                value={
                  recoveryAnswer
                }
                onChange={
                  event =>
                    setRecoveryAnswer(
                      event
                        .target
                        .value
                    )
                }
                minLength={4}
                maxLength={100}
                required
                disabled={
                  loading
                }
                placeholder="Enter your private recovery answer"
                style={
                  fieldStyle
                }
              />
            </div>

            {/* NEW PASSWORD */}

            <div
              className="form-group"
              style={
                formGroupStyle
              }
            >
              <label htmlFor="new-password">
                New password
              </label>

              <div
                className="iv-auth-password-field"
                style={
                  passwordFieldStyle
                }
              >
                <input
                  id="new-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  value={
                    newPassword
                  }
                  onChange={
                    event =>
                      setNewPassword(
                        event
                          .target
                          .value
                      )
                  }
                  required
                  disabled={
                    loading
                  }
                  style={
                    passwordInputStyle
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      current =>
                        !current
                    )
                  }
                  disabled={
                    loading
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  style={
                    showButtonStyle
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>

              {/* PASSWORD RULES */}

              <div
                className="iv-auth-password-rules"
                style={{
                  display: "grid",

                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",

                  gap:
                    "10px 20px",

                  marginTop: 4,
                  padding:
                    "15px 18px",

                  border:
                    "1px solid #ead7c7",

                  borderRadius: 14,

                  background:
                    "#fff8f1",

                  color:
                    "#765544",

                  fontSize: 12,
                }}
              >
                <div>
                  {passwordRules.length
                    ? "✓"
                    : "○"}{" "}
                  At least 8 characters
                </div>

                <div>
                  {passwordRules.uppercase
                    ? "✓"
                    : "○"}{" "}
                  One uppercase letter
                </div>

                <div>
                  {passwordRules.lowercase
                    ? "✓"
                    : "○"}{" "}
                  One lowercase letter
                </div>

                <div>
                  {passwordRules.number
                    ? "✓"
                    : "○"}{" "}
                  One number
                </div>

                <div>
                  {passwordRules.special
                    ? "✓"
                    : "○"}{" "}
                  One special character
                </div>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}

            <div
              className="form-group"
              style={
                formGroupStyle
              }
            >
              <label htmlFor="confirm-new-password">
                Confirm new password
              </label>

              <div
                className="iv-auth-password-field"
                style={
                  passwordFieldStyle
                }
              >
                <input
                  id="confirm-new-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  value={
                    confirmPassword
                  }
                  onChange={
                    event =>
                      setConfirmPassword(
                        event
                          .target
                          .value
                      )
                  }
                  required
                  disabled={
                    loading
                  }
                  style={
                    passwordInputStyle
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      current =>
                        !current
                    )
                  }
                  disabled={
                    loading
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                  style={
                    showButtonStyle
                  }
                >
                  {showConfirmPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>

              {confirmPassword.length >
                0 && (
                <p
                  role="status"
                  style={{
                    margin: 0,

                    color:
                      passwordsMatch
                        ? "#287c58"
                        : "#ae493a",

                    fontSize: 12,
                    fontWeight: 750,
                  }}
                >
                  {passwordsMatch
                    ? "✓ Passwords match"
                    : "✕ Passwords do not match"}
                </p>
              )}
            </div>

            {/* ACTION BUTTONS */}

            <div
              style={{
                display: "grid",

                gridTemplateColumns:
                  "minmax(0, 1.6fr) minmax(190px, 1fr)",

                gap: 12,

                alignItems:
                  "stretch",
              }}
            >
              <button
                className="primary-button"
                type="submit"
                disabled={
                  loading
                }
                style={{
                  width: "100%",
                  minHeight: 52,
                  margin: 0,
                }}
              >
                {loading
                  ? "Resetting..."
                  : "Reset password"}
              </button>

              <button
                className="secondary-button"
                type="button"
                disabled={
                  loading
                }
                onClick={
                  changeAccount
                }
                style={{
                  width: "100%",
                  minHeight: 52,
                  margin: 0,

                  whiteSpace:
                    "normal",

                  lineHeight: 1.35,
                }}
              >
                Use a different Anonymous ID
              </button>
            </div>
          </form>
        )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <div
          className="auth-footer"
          style={{
            marginTop: 24,
          }}
        >
          <p>
            Remembered your password?{" "}

            <Link to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}