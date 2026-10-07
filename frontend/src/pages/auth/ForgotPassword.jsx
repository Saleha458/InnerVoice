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
     ALWAYS OPEN PAGE FROM THE TOP

     React Router can preserve the previous page's scroll
     position. That made the Forgot Password heading appear
     clipped when arriving from the Login page.
  ========================================================= */

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

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
      .every(
        Boolean
      );

  const passwordsMatch =
    confirmPassword.length >
      0 &&
    newPassword ===
      confirmPassword;

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

    if (
      recoveryAnswer
        .trim()
        .length <
        4 ||
      recoveryAnswer
        .trim()
        .length >
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
              recoveryAnswer.trim(),

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
              replace:
                true,
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

  function changeAccount() {
    setQuestion("");
    setQuestionLoaded(false);

    setRecoveryAnswer("");
    setNewPassword("");
    setConfirmPassword("");

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
      <div className="auth-card iv-forgot-card">
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

        {!questionLoaded ? (
          <form
            className="auth-form iv-forgot-start-form"
            onSubmit={
              loadQuestion
            }
          >
            <div className="form-group">
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
              />

              <small>
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
            >
              {loading
                ? "Checking..."
                : "Show my recovery question"}
            </button>
          </form>
        ) : (
          <form
            className="auth-form iv-forgot-reset-form"
            onSubmit={
              resetPassword
            }
          >
            <div className="notice-box iv-recovery-question-card">
              <span className="iv-recovery-question-label">
                YOUR RECOVERY QUESTION
              </span>

              <strong>
                {question}
              </strong>

              <p>
                Enter the private answer you chose
                when recovery was configured.
              </p>
            </div>

            <div className="form-group">
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
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">
                New password
              </label>

              <div className="iv-auth-password-field">
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
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>

              <div className="iv-auth-password-rules">
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

            <div className="form-group">
              <label htmlFor="confirm-new-password">
                Confirm new password
              </label>

              <div className="iv-auth-password-field">
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
                >
                  {showConfirmPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>

              {confirmPassword
                .length >
                0 && (
                <p
                  className={`iv-password-match ${
                    passwordsMatch
                      ? "is-match"
                      : "is-mismatch"
                  }`}
                  role="status"
                >
                  {passwordsMatch
                    ? "✓ Passwords match"
                    : "✕ Passwords do not match"}
                </p>
              )}
            </div>

            <div className="iv-forgot-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={
                  loading
                }
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
              >
                Use a different Anonymous ID
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
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