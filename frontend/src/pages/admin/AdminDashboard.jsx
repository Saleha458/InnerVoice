import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import api from "../../services/api";
import {
  auth,
} from "../../services/firebase";

// =========================================================
// AUTH CONFIG
// =========================================================

const getConfig = async () => {
  const currentUser =
    auth.currentUser;

  if (!currentUser) {
    throw new Error(
      "Admin authentication is required."
    );
  }

  const token =
    await currentUser.getIdToken();

  return {
    headers: {
      Authorization:
        `Bearer ${token}`,
    },
  };
};

// =========================================================
// COMPONENT
// =========================================================

const AdminDashboard = () => {
  const [experts, setExperts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  // =======================================================
  // LOAD PENDING EXPERTS
  // =======================================================

  const loadPendingExperts =
    useCallback(async () => {
      try {
        setError("");

        const response =
          await api.get(
            "/admin/experts/pending",
            await getConfig()
          );

        setExperts(
          response.data?.experts ||
            []
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Could not load pending expert applications."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  // =======================================================
  // INITIAL LOAD + AUTO REFRESH
  // =======================================================

  useEffect(() => {
    loadPendingExperts();

    const timer =
      window.setInterval(
        loadPendingExperts,
        5000
      );

    return () =>
      window.clearInterval(timer);
  }, [loadPendingExperts]);

  // =======================================================
  // VERIFY / REJECT
  // =======================================================

  const updateExpert = async (
    expert,
    status
  ) => {
    let reason = "";

    if (
      status === "rejected"
    ) {
      reason =
        window.prompt(
          "Enter the reason for rejecting this application:"
        ) || "";

      if (!reason.trim()) {
        setError(
          "Rejection cancelled. A reason is required."
        );

        return;
      }
    }

    try {
      setProcessingId(
        expert.id
      );

      setError("");
      setMessage("");

      const response =
        await api.patch(
          `/admin/experts/${expert.id}/verify`,
          {
            status,
            reason:
              reason.trim(),
          },
          await getConfig()
        );

      setExperts(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              expert.id
          )
      );

      setMessage(
        response.data?.message ||
          (
            status ===
            "verified"
              ? "Expert verified successfully."
              : "Expert rejected successfully."
          )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Verification failed."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="page-shell">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-header">
        <div>
          <span className="eyebrow">
            ADMINISTRATION
          </span>

          <h1>
            Admin Dashboard
          </h1>

          <p>
            Review expert applications
            and manage InnerVoice safely.
          </p>
        </div>
      </div>

      {/* =================================================
          MESSAGES
      ================================================= */}

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {message && (
        <div className="notice-box">
          {message}
        </div>
      )}

      {/* =================================================
          ADMIN CARDS
      ================================================= */}

      <div className="dashboard-cards">
        <Link
          className="dashboard-card"
          to="/admin/experts"
        >
          <span>
            ✓ Expert verification
          </span>

          <h2>
            {experts.length} pending
          </h2>

          <p>
            Open the full verification
            queue.
          </p>
        </Link>

        <Link
          className="dashboard-card"
          to="/admin/users"
        >
          <span>
            ◉ Users
          </span>

          <h2>
            Manage accounts
          </h2>

          <p>
            Activate, suspend or delete
            accounts.
          </p>
        </Link>

        <Link
          className="dashboard-card"
          to="/admin/reports"
        >
          <span>
            ▥ Reports
          </span>

          <h2>
            Safety reports
          </h2>

          <p>
            Review concerns submitted
            by users.
          </p>
        </Link>

        <Link
          className="dashboard-card"
          to="/admin/sessions"
        >
          <span>
            ▣ Sessions
          </span>

          <h2>
            Session overview
          </h2>

          <p>
            Review scheduled support
            sessions.
          </p>
        </Link>
      </div>

      {/* =================================================
          PENDING EXPERTS
      ================================================= */}

      <section
        className="feature-card"
        style={{
          marginTop: 24,
        }}
      >
        <div className="item-top">
          <div>
            <span className="eyebrow">
              ACTION REQUIRED
            </span>

            <h2>
              Pending Expert Applications
            </h2>

            <p>
              Only approved experts
              become visible to users.
            </p>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={
              loadPendingExperts
            }
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="empty-card">
            Loading applications…
          </div>
        ) : experts.length === 0 ? (
          /* =================================================
             EMPTY
          ================================================= */

          <div className="empty-card">
            <h2>
              No pending applications
            </h2>

            <p>
              New expert registrations
              will appear here
              automatically.
            </p>
          </div>
        ) : (
          /* =================================================
             LIST
          ================================================= */

          <div className="list-grid">
            {experts.map(
              (expert) => (
                <article
                  className="feature-card"
                  key={expert.id}
                >
                  <div className="item-top">
                    <div>
                      <h2>
                        {expert.name ||
                          "Unnamed professional"}
                      </h2>

                      <small>
                        Anonymous ID:{" "}
                        {expert.anonymousId ||
                          "—"}
                      </small>
                    </div>

                    <span className="status pending">
                      Pending
                    </span>
                  </div>

                  {/* =======================================
                      DETAILS
                  ======================================= */}

                  <div className="verification-grid">
                    <p>
                      <b>
                        Professional email:
                      </b>{" "}
                      {expert.email ||
                        "—"}
                    </p>

                    <p>
                      <b>Age:</b>{" "}
                      {expert.age ||
                        "—"}
                    </p>

                    <p>
                      <b>Gender:</b>{" "}
                      {expert.gender ||
                        "—"}
                    </p>

                    <p>
                      <b>
                        License number:
                      </b>{" "}
                      {expert.licenseNumber ||
                        "—"}
                    </p>

                    <p>
                      <b>
                        Qualification:
                      </b>{" "}
                      {expert.qualification ||
                        "—"}
                    </p>

                    <p>
                      <b>
                        Specialization:
                      </b>{" "}
                      {expert.specialization ||
                        "—"}
                    </p>

                    <p>
                      <b>
                        Experience:
                      </b>{" "}
                      {expert.experienceYears ??
                        0}{" "}
                      years
                    </p>
                  </div>

                  {/* =======================================
                      BIO
                  ======================================= */}

                  {expert.bio && (
                    <div
                      className="notice-box"
                      style={{
                        marginTop: 15,
                      }}
                    >
                      <b>
                        Professional bio:
                      </b>

                      <p>
                        {expert.bio}
                      </p>
                    </div>
                  )}

                  {/* =======================================
                      LICENSE IMAGE
                  ======================================= */}

                  {expert.licenseImageUrl && (
                    <div
                      style={{
                        marginTop: 18,
                      }}
                    >
                      <p>
                        <b>
                          Submitted license:
                        </b>
                      </p>

                      <img
                        src={
                          expert.licenseImageUrl
                        }
                        alt="Submitted professional license"
                        style={{
                          maxWidth:
                            "320px",
                          maxHeight:
                            "220px",
                          objectFit:
                            "contain",
                          borderRadius:
                            "12px",
                          border:
                            "1px solid #e5e7eb",
                        }}
                      />

                      <div
                        style={{
                          marginTop: 8,
                        }}
                      >
                        <a
                          href={
                            expert.licenseImageUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-link"
                        >
                          Open full-size
                          license →
                        </a>
                      </div>
                    </div>
                  )}

                  {/* =======================================
                      ACTION BUTTONS
                  ======================================= */}

                  <div
                    className="button-row"
                    style={{
                      marginTop: 20,
                    }}
                  >
                    <button
                      className="primary-button"
                      type="button"
                      disabled={
                        processingId ===
                        expert.id
                      }
                      onClick={() =>
                        updateExpert(
                          expert,
                          "verified"
                        )
                      }
                    >
                      {processingId ===
                      expert.id
                        ? "Processing…"
                        : "✓ Approve & Verify"}
                    </button>

                    <button
                      className="danger-button"
                      type="button"
                      disabled={
                        processingId ===
                        expert.id
                      }
                      onClick={() =>
                        updateExpert(
                          expert,
                          "rejected"
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;