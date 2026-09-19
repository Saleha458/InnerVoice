import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ChevronDown,
  ChevronUp,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

import "./Profile.css";

// =====================================================
// ROLE CONFIGURATION
// =====================================================

const ROLE_INFO = {
  user: {
    label: "Member",
    heading: "My profile",
  },

  parent: {
    label: "Parent",
    heading: "My profile",
  },

  expert: {
    label: "Expert",
    heading: "Professional profile",
  },

  admin: {
    label: "Administrator",
    heading: "My profile",
  },
};

// =====================================================
// HELPERS
// =====================================================

function display(value) {
  return value === null ||
    value === undefined ||
    value === ""
    ? "Not provided"
    : String(value);
}

function Detail({ label, value }) {
  return (
    <div className="ivp-detail">
      <dt>{label}</dt>
      <dd>{display(value)}</dd>
    </div>
  );
}

// =====================================================
// PROFILE
// =====================================================

export default function Profile() {
  const { user, accountProfile, logout } = useAuth();

  const navigate = useNavigate();

  const role = Object.hasOwn(ROLE_INFO, user?.role)
    ? user.role
    : "user";

  const isExpert = role === "expert";

  const canEditAge =
    role === "user" || role === "parent";

  // ===================================================
  // STATE
  // ===================================================

  const [profile, setProfile] = useState(null);

  const [age, setAge] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [working, setWorking] = useState(false);

  const [password, setPassword] = useState("");

  const [confirmation, setConfirmation] = useState("");

  const [
    accountControlsOpen,
    setAccountControlsOpen,
  ] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  // ===================================================
  // LOAD PROFILE
  // ===================================================

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get(
        isExpert ? "/experts/me" : "/users/me"
      );

      const result =
        data?.expert || data?.user || null;

      setProfile(result);

      setAge(result?.age ?? "");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load your profile."
      );
    } finally {
      setLoading(false);
    }
  }, [isExpert]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(
      () => void loadProfile()
    );

    return () => window.cancelAnimationFrame(frame);
  }, [loadProfile]);

  // ===================================================
  // UPDATE AGE
  // ===================================================

  async function saveAge(event) {
    event.preventDefault();

    if (!canEditAge || saving) return;

    const value = Number(age);

    const minimum = role === "user" ? 15 : 1;

    setError("");
    setNotice("");

    if (
      age === "" ||
      !Number.isInteger(value) ||
      value < minimum ||
      value > 120
    ) {
      setError(
        `Age must be between ${minimum} and 120.`
      );

      return;
    }

    setSaving(true);

    try {
      const { data } = await api.patch(
        "/users/me",
        {
          age: value,
        }
      );

      const savedAge = data?.user?.age ?? value;

      setProfile((previous) => ({
        ...previous,
        age: savedAge,
      }));

      setAge(savedAge);

      setNotice("Your age has been updated.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update your age."
      );
    } finally {
      setSaving(false);
    }
  }

  // ===================================================
  // ACCOUNT DEACTIVATION / DELETION
  // EXISTING BACKEND ENDPOINTS
  // ===================================================

  async function handleAccountAction(kind) {
    if (working) return;

    setError("");
    setNotice("");

    if (!password) {
      setError("Enter your current password first.");
      return;
    }

    if (
      kind === "delete" &&
      confirmation !== "DELETE"
    ) {
      setError(
        "Type DELETE exactly to confirm deletion."
      );

      return;
    }

    const message =
      kind === "delete"
        ? "Request permanent account deletion? This cannot be undone once processed."
        : "Deactivate your account? You can restore it within 30 days.";

    if (!window.confirm(message)) return;

    setWorking(true);

    try {
      if (kind === "delete") {
        await api.delete("/users/me", {
          data: {
            password,
            confirmation: "DELETE",
          },
        });
      } else {
        await api.post(
          "/users/me/deactivate",
          {
            password,
          }
        );
      }

      await logout();

      navigate(
        kind === "delete" ? "/" : "/login",
        {
          replace: true,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Account action could not be completed."
      );
    } finally {
      setWorking(false);
    }
  }

  // ===================================================
  // PROFILE DATA
  // ===================================================

  const details =
    profile || accountProfile || {};

  const identity = isExpert
    ? details.name || "Professional"
    : details.anonymousId ||
      user?.anonymousId ||
      "Anonymous member";

  const status = isExpert
    ? details.verificationStatus ||
      user?.verificationStatus ||
      "pending"
    : details.status || "active";

  const statusLabel = isExpert
    ? {
        verified: "Verified",
        pending: "Pending verification",
        rejected: "Not verified",
      }[status] || "Pending verification"
    : status === "suspended"
      ? "Suspended"
      : "Active";

  const statusStyle = [
    "suspended",
    "rejected",
  ].includes(status)
    ? "ivp-status--warning"
    : ["active", "verified"].includes(status)
      ? "ivp-status--success"
      : "ivp-status--pending";

  // ===================================================
  // UI
  // ===================================================

  return (
    <div
      className={`page-shell ivp-page ivp-${role}`}
    >
      {/* PAGE HEADING */}

      <header className="ivp-heading">
        <span className="ivp-eyebrow">
          ACCOUNT / PROFILE
        </span>

        <h1>{ROLE_INFO[role].heading}</h1>

        <p>
          Review your details and manage your account.
        </p>
      </header>

      {/* FEEDBACK */}

      {error && (
        <div
          className="ivp-feedback ivp-feedback--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          className="ivp-feedback ivp-feedback--success"
          role="status"
        >
          {notice}
        </div>
      )}

      {/* LOADING */}

      {loading ? (
        <div
          className="ivp-card ivp-loading"
          role="status"
        >
          Loading profile…
        </div>
      ) : (
        <div className="ivp-stack">
          {/* =========================================
              PROFILE IDENTITY
          ========================================= */}

          <section
            className="ivp-card ivp-identity"
            aria-label="Account summary"
          >
            <div
              className="ivp-avatar"
              aria-hidden="true"
            >
              <UserRound
                size={28}
                strokeWidth={1.7}
              />
            </div>

            <div className="ivp-identity-copy">
              <span className="ivp-role">
                {ROLE_INFO[role].label} account
              </span>

              <h2>{identity}</h2>

              {isExpert &&
                details.specialization && (
                  <p>
                    {details.specialization}
                  </p>
                )}
            </div>

            <span
              className={`ivp-status ${statusStyle}`}
            >
              <ShieldCheck
                size={15}
                aria-hidden="true"
              />

              {statusLabel}
            </span>
          </section>

          {/* =========================================
              PERSONAL INFORMATION
          ========================================= */}

          <section
            className="ivp-card ivp-section"
            aria-labelledby="ivp-details-heading"
          >
            <div className="ivp-section-heading">
              <h2 id="ivp-details-heading">
                Personal information
              </h2>

              <p>Your account details</p>
            </div>

            <dl className="ivp-details">
              {isExpert ? (
                <>
                  <Detail
                    label="Full name"
                    value={details.name}
                  />

                  <Detail
                    label="Email address"
                    value={details.email}
                  />

                  <Detail
                    label="Anonymous ID"
                    value={
                      details.anonymousId ||
                      user?.anonymousId
                    }
                  />

                  <Detail
                    label="Age"
                    value={
                      details.age ??
                      accountProfile?.age
                    }
                  />

                  <Detail
                    label="Gender"
                    value={details.gender}
                  />
                </>
              ) : (
                <>
                  <Detail
                    label="Anonymous ID"
                    value={identity}
                  />

                  <Detail
                    label="Account type"
                    value={
                      ROLE_INFO[role].label
                    }
                  />

                  {role === "admin" ? (
                    <>
                      <Detail
                        label="Display name"
                        value={
                          details.displayName
                        }
                      />

                      <Detail
                        label="Email address"
                        value={details.email}
                      />
                    </>
                  ) : (
                    <Detail
                      label="Age"
                      value={
                        details.age ??
                        user?.age
                      }
                    />
                  )}
                </>
              )}
            </dl>

            {/* AGE EDITING: USER AND PARENT */}

            {canEditAge && (
              <form
                className="ivp-age-form"
                onSubmit={saveAge}
              >
                <label htmlFor="ivp-age">
                  Edit age
                </label>

                <div className="ivp-form-row">
                  <input
                    id="ivp-age"
                    type="number"
                    min={
                      role === "user"
                        ? 15
                        : 1
                    }
                    max="120"
                    value={age}
                    onChange={(event) =>
                      setAge(
                        event.target.value
                      )
                    }
                    disabled={
                      saving || working
                    }
                    required
                  />

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      working ||
                      String(age) ===
                        String(
                          details.age ?? ""
                        )
                    }
                  >
                    {saving
                      ? "Saving…"
                      : "Save changes"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* =========================================
              EXPERT PROFESSIONAL INFORMATION
          ========================================= */}

          {isExpert && (
            <section
              className="ivp-card ivp-section"
              aria-labelledby="ivp-credentials-heading"
            >
              <div className="ivp-section-heading">
                <h2 id="ivp-credentials-heading">
                  Professional information
                </h2>

                <p>
                  Your submitted qualifications
                  and verification details
                </p>
              </div>

              <dl className="ivp-details">
                <Detail
                  label="Specialization"
                  value={
                    details.specialization
                  }
                />

                <Detail
                  label="Qualification"
                  value={
                    details.qualification
                  }
                />

                <Detail
                  label="Experience"
                  value={
                    details.experienceYears ==
                    null
                      ? null
                      : `${details.experienceYears} years`
                  }
                />

                <Detail
                  label="License number"
                  value={
                    details.licenseNumber
                  }
                />
              </dl>

              {/* EXPERT BIO */}

              {details.bio && (
                <div className="ivp-bio">
                  <h3>
                    Professional bio
                  </h3>

                  <p>{details.bio}</p>
                </div>
              )}

              {/* VERIFICATION STATUS */}

              {status !== "verified" && (
                <div
                  className="ivp-verification-note"
                  role="status"
                >
                  <strong>
                    {status === "rejected"
                      ? "Application not approved"
                      : "Verification in progress"}
                  </strong>

                  <p>
                    {status === "rejected"
                      ? details.rejectionReason ||
                        "Contact the administrator for more information."
                      : "Your application is awaiting administrative review."}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* =========================================
              ACCOUNT SECURITY
          ========================================= */}

          {role !== "admin" && (
            <section
              className="ivp-card ivp-section"
              aria-labelledby="ivp-security-heading"
            >
              <div className="ivp-section-heading ivp-security-heading">
                <div>
                  <h2 id="ivp-security-heading">
                    Account & security
                  </h2>

                  <p>
                    Manage deactivation or request
                    account deletion.
                  </p>
                </div>

                <LockKeyhole
                  size={20}
                  aria-hidden="true"
                />
              </div>

              {/* ACCOUNT OPTIONS TOGGLE */}

              <button
                type="button"
                className="ivp-control-toggle"
                aria-expanded={
                  accountControlsOpen
                }
                aria-controls="ivp-account-controls"
                onClick={() => {
                  setAccountControlsOpen(
                    (current) => !current
                  );

                  setError("");
                }}
              >
                {accountControlsOpen
                  ? "Hide account options"
                  : "Manage account"}

                {accountControlsOpen ? (
                  <ChevronUp size={17} />
                ) : (
                  <ChevronDown size={17} />
                )}
              </button>

              {/* ACCOUNT OPTIONS */}

              {accountControlsOpen && (
                <div
                  id="ivp-account-controls"
                  className="ivp-controls"
                >
                  <label htmlFor="ivp-password">
                    Current password
                  </label>

                  <input
                    id="ivp-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    disabled={working}
                    placeholder="Enter your password"
                  />

                  {/* DEACTIVATION */}

                  <div className="ivp-control-option">
                    <div>
                      <h3>
                        Deactivate account
                      </h3>

                      <p>
                        You can restore your account
                        within 30 days.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="ivp-secondary-button"
                      disabled={
                        working || !password
                      }
                      onClick={() =>
                        handleAccountAction(
                          "deactivate"
                        )
                      }
                    >
                      Deactivate
                    </button>
                  </div>

                  {/* ACCOUNT DELETION */}

                  <div className="ivp-control-option ivp-control-option--danger">
                    <div>
                      <h3>
                        Request permanent deletion
                      </h3>

                      <p>
                        Account access will close
                        and deletion will be queued
                        for processing.
                      </p>
                    </div>

                    <label htmlFor="ivp-confirmation">
                      Type DELETE to confirm
                    </label>

                    <input
                      id="ivp-confirmation"
                      value={confirmation}
                      onChange={(event) =>
                        setConfirmation(
                          event.target.value
                        )
                      }
                      disabled={working}
                      autoComplete="off"
                      placeholder="DELETE"
                    />

                    <button
                      type="button"
                      className="ivp-danger-button"
                      disabled={
                        working ||
                        !password ||
                        confirmation !==
                          "DELETE"
                      }
                      onClick={() =>
                        handleAccountAction(
                          "delete"
                        )
                      }
                    >
                      {working
                        ? "Please wait…"
                        : "Request deletion"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}