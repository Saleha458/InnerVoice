import {
  useEffect,
  useState,
} from "react";

import api from "../../services/api";
import { auth } from "../../services/firebase";

export default function ExpertVerification() {
  const [experts, setExperts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [processingId, setProcessingId] =
    useState(null);

  const getConfig = async () => {
    const token =
      await auth.currentUser?.getIdToken();

    return {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    };
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/admin/experts/pending",
          await getConfig()
        );

      setExperts(
        response.data.experts || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load expert applications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const verify = async (
    expert,
    status
  ) => {
    let reason = "";

    if (status === "rejected") {
      reason =
        window.prompt(
          "Please enter the reason for rejecting this application:"
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

      await api.patch(
        `/admin/experts/${expert.id}/verify`,
        {
          status,
          reason:
            reason.trim(),
        },
        await getConfig()
      );

      setExperts((current) =>
        current.filter(
          (item) =>
            item.id !== expert.id
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Verification failed."
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            ADMINISTRATION
          </span>

          <h1>
            Expert Verification
          </h1>

          <p>
            Review professional credentials before
            an expert becomes visible to users.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-card">
          Loading applications...
        </div>
      ) : !experts.length ? (
        <div className="empty-card">
          <h2>
            No pending applications
          </h2>

          <p>
            New expert registrations will appear
            here.
          </p>
        </div>
      ) : (
        <div className="list-grid">
          {experts.map((expert) => (
            <article
              className="feature-card"
              key={expert.id}
            >
              <div className="item-top">
                <div>
                  <h2>
                    {expert.name}
                  </h2>

                  <small>
                    Anonymous ID:{" "}
                    {expert.anonymousId}
                  </small>
                </div>

                <span className="status pending">
                  Pending
                </span>
              </div>

              <div className="verification-grid">
                <p>
                  <b>
                    Professional email:
                  </b>{" "}
                  {expert.email}
                </p>

                <p>
                  <b>Age:</b>{" "}
                  {expert.age}
                </p>

                <p>
                  <b>Gender:</b>{" "}
                  {expert.gender ||
                    "Not provided"}
                </p>

                <p>
                  <b>
                    License number:
                  </b>{" "}
                  {expert.licenseNumber}
                </p>

                <p>
                  <b>
                    Qualification:
                  </b>{" "}
                  {expert.qualification}
                </p>

                <p>
                  <b>
                    Specialization:
                  </b>{" "}
                  {expert.specialization}
                </p>

                <p>
                  <b>
                    Experience:
                  </b>{" "}
                  {expert.experienceYears ||
                    0}{" "}
                  years
                </p>
              </div>

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
                      maxWidth: "320px",
                      maxHeight: "220px",
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
                      Open full-size license →
                    </a>
                  </div>
                </div>
              )}

              <div
                className="button-row"
                style={{
                  marginTop: 20,
                }}
              >
                <button
                  className="primary-button"
                  disabled={
                    processingId ===
                    expert.id
                  }
                  onClick={() =>
                    verify(
                      expert,
                      "verified"
                    )
                  }
                >
                  {processingId ===
                  expert.id
                    ? "Processing..."
                    : "✓ Verify credentials"}
                </button>

                <button
                  className="danger-button"
                  disabled={
                    processingId ===
                    expert.id
                  }
                  onClick={() =>
                    verify(
                      expert,
                      "rejected"
                    )
                  }
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}