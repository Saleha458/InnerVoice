import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  auth,
} from "../../services/firebase";

import api from "../../services/api";

import {
  useAuth,
} from "../../context/AuthContext";

const Profile = () => {
  const {
    user,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();

  const [profile, setProfile] =
    useState(null);

  const [age, setAge] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const role =
    user?.role || "user";

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const token =
          await auth.currentUser?.getIdToken();

        const endpoint =
          role === "expert"
            ? "/experts/me"
            : "/users/me";

        const response =
          await api.get(
            endpoint,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          response.data.user ||
          response.data.expert;

        setProfile(data);
        setAge(
          data?.age || ""
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Could not load profile."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [role]);

  const saveAge = async () => {
    const numericAge =
      Number(age);

    const minimum =
      role === "parent"
        ? 18
        : 15;

    if (
      !Number.isInteger(
        numericAge
      ) ||
      numericAge < minimum
    ) {
      setError(
        `Age must be at least ${minimum}.`
      );

      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const token =
        await auth.currentUser?.getIdToken();

      const response =
        await api.put(
          "/users/me",
          {
            age:
              numericAge,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      setProfile(
        response.data.user
      );

      setMessage(
        "Profile updated successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount =
    async () => {
      const firstConfirm =
        window.confirm(
          "Are you sure you want to permanently delete your InnerVoice account?"
        );

      if (!firstConfirm) {
        return;
      }

      const secondConfirm =
        window.confirm(
          "This will permanently remove your account and stored personal data. This action cannot be undone. Continue?"
        );

      if (!secondConfirm) {
        return;
      }

      try {
        setDeleting(true);
        setError("");

        const token =
          await auth.currentUser?.getIdToken();

        await api.delete(
          "/users/me",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        await logout();

        navigate(
          "/",
          {
            replace: true,
          }
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Could not delete your account."
        );
      } finally {
        setDeleting(false);
      }
    };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-card">
          Loading your profile...
        </div>
      </div>
    );
  }

  const displayName =
    profile?.anonymousId ||
    profile?.name ||
    user?.anonymousId ||
    "Anonymous";

  return (
    <div className="page-shell profile-page">

      <div className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE ACCOUNT
          </span>

          <h1>
            {role === "expert"
              ? "Professional Profile"
              : role === "parent"
              ? "Parent Profile"
              : "Your Profile"}
          </h1>

          <p>
            Your InnerVoice account information
            stays private.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {message && (
        <div className="success-box">
          {message}
        </div>
      )}

      <div className="profile-grid">

        <section className="feature-card profile-identity">

          <div className="profile-avatar">
            {displayName
              .charAt(0)
              .toUpperCase()}
          </div>

          <h2>
            {displayName}
          </h2>

          <span className="status active">
            {role}
          </span>

          <p className="muted">
            Anonymous account
          </p>

          {role === "expert" && (
            <span
              className={`status ${
                profile?.verificationStatus ||
                "pending"
              }`}
            >
              {profile?.verificationStatus ||
                "pending"}
            </span>
          )}

        </section>

        <section className="feature-card profile-details">

          <h2>
            Account details
          </h2>

          <div className="profile-field">
            <span>
              Anonymous ID
            </span>

            <strong>
              {profile?.anonymousId ||
                "Not available"}
            </strong>
          </div>

          <div className="profile-field">
            <span>
              Role
            </span>

            <strong>
              {role}
            </strong>
          </div>

          <div className="profile-field">
            <span>
              Age
            </span>

            {role === "expert" ? (
              <strong>
                {profile?.age ||
                  "—"}
              </strong>
            ) : (
              <input
                className="form-input"
                type="number"
                min={
                  role === "parent"
                    ? 18
                    : 15
                }
                value={age}
                onChange={(e) =>
                  setAge(
                    e.target.value
                  )
                }
              />
            )}
          </div>

          {role === "expert" && (
            <>
              <div className="profile-field">
                <span>
                  Professional name
                </span>

                <strong>
                  {profile?.name ||
                    "—"}
                </strong>
              </div>

              <div className="profile-field">
                <span>
                  Professional email
                </span>

                <strong>
                  {profile?.email ||
                    "—"}
                </strong>
              </div>

              <div className="profile-field">
                <span>
                  Gender
                </span>

                <strong>
                  {profile?.gender ||
                    "—"}
                </strong>
              </div>

              <div className="profile-field">
                <span>
                  Specialization
                </span>

                <strong>
                  {profile?.specialization ||
                    "—"}
                </strong>
              </div>

              <div className="profile-field">
                <span>
                  Qualification
                </span>

                <strong>
                  {profile?.qualification ||
                    "—"}
                </strong>
              </div>

              <div className="profile-field">
                <span>
                  License number
                </span>

                <strong>
                  {profile?.licenseNumber ||
                    "—"}
                </strong>
              </div>

              <div className="profile-field">
                <span>
                  Experience
                </span>

                <strong>
                  {profile?.experienceYears ||
                    0}{" "}
                  years
                </strong>
              </div>
            </>
          )}

          {role !== "expert" && (
            <button
              type="button"
              className="primary-button"
              onClick={saveAge}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save changes"}
            </button>
          )}

        </section>
      </div>

      <section
        className="feature-card"
        style={{
          marginTop: 24,
          border:
            "1px solid #f1caca",
        }}
      >
        <h2>
          Delete account
        </h2>

        <p>
          Permanently delete your InnerVoice
          account and stored personal data.
        </p>

        <button
          type="button"
          className="danger-button"
          onClick={deleteAccount}
          disabled={deleting}
        >
          {deleting
            ? "Deleting..."
            : "Permanently delete my account"}
        </button>
      </section>

    </div>
  );
};

export default Profile;