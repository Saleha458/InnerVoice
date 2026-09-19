import {
  useEffect,
  useState
} from "react";

import api from "../../services/api";

import {
  auth
} from "../../services/firebase";

const errorMessage = error =>
  error?.response?.data?.message ||
  error?.message ||
  "Request failed.";

async function adminConfig() {
  const token =
    await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error(
      "Admin sign-in required."
    );
  }

  return {
    headers: {
      Authorization:
        `Bearer ${token}`
    }
  };
}

export default function ExpertVerification() {
  const [experts, setExperts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [processingId, setProcessingId] =
    useState(null);

  const [documentUrls, setDocumentUrls] =
    useState({});

  const [reviewed, setReviewed] =
    useState({});

  async function load() {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get(
        "/admin/experts/pending",
        await adminConfig()
      );

      setExperts(
        data.experts || []
      );
    } catch (cause) {
      setError(
        errorMessage(cause)
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openDocument(
    expert
  ) {
    setError("");

    setProcessingId(expert.id);

    try {
      const { data } = await api.get(
        `/admin/experts/${encodeURIComponent(
          expert.id
        )}/license-url`,

        await adminConfig()
      );

      if (
        !data?.success ||
        !data.url
      ) {
        throw new Error(
          "Protected document unavailable."
        );
      }

      setDocumentUrls(previous => ({
        ...previous,

        [expert.id]: data.url
      }));

      setReviewed(previous => ({
        ...previous,

        [expert.id]: false
      }));
    } catch (cause) {
      setError(
        errorMessage(cause)
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function decide(
    expert,
    status
  ) {
    if (
      status === "verified" &&
      !reviewed[expert.id]
    ) {
      setError(
        "Review the protected document and confirm that you checked the credentials first."
      );

      return;
    }

    let reason = "";

    if (
      status === "rejected"
    ) {
      reason = (
        window.prompt(
          "Reason for rejection:"
        ) || ""
      ).trim();

      if (!reason) {
        return;
      }
    }

    setError("");
    setProcessingId(expert.id);

    try {
      await api.patch(
        `/admin/experts/${encodeURIComponent(
          expert.id
        )}/verify`,

        {
          status,
          reason
        },

        await adminConfig()
      );

      setExperts(previous =>
        previous.filter(
          item =>
            item.id !== expert.id
        )
      );

      setDocumentUrls(previous => {
        const next = {
          ...previous
        };

        delete next[expert.id];

        return next;
      });
    } catch (cause) {
      setError(
        errorMessage(cause)
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            ADMINISTRATION
          </span>

          <h1>
            Expert Verification
          </h1>

          <p>
            Review professional credentials
            using protected document access.
          </p>
        </div>
      </header>

      {error && (
        <div
          className="error-box"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-card">
          Loading applications...
        </div>
      ) : experts.length === 0 ? (
        <div className="empty-card">
          No pending applications.
        </div>
      ) : (
        <div className="list-grid">
          {experts.map(expert => (
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
                  <b>Professional email:</b>{" "}
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
                  <b>License number:</b>{" "}
                  {expert.licenseNumber}
                </p>

                <p>
                  <b>Qualification:</b>{" "}
                  {expert.qualification}
                </p>

                <p>
                  <b>Specialization:</b>{" "}
                  {expert.specialization}
                </p>

                <p>
                  <b>Experience:</b>{" "}
                  {expert.experienceYears || 0}
                  {" "}years
                </p>
              </div>

              {expert.bio && (
                <div className="notice-box">
                  <b>Professional bio:</b>

                  <p>
                    {expert.bio}
                  </p>
                </div>
              )}

              {expert.documentNeedsMigration && (
                <div className="error-box">
                  Old verification document
                  requires protected-storage
                  migration before approval.
                </div>
              )}

              <button
                type="button"
                className="secondary-button"

                disabled={
                  processingId === expert.id ||
                  !expert.hasDocument
                }

                onClick={() =>
                  openDocument(expert)
                }
              >
                {processingId === expert.id
                  ? "Loading..."
                  : "Open protected license"}
              </button>

              {documentUrls[expert.id] && (
                <div
                  style={{
                    marginTop: 16
                  }}
                >
                  <img
                    src={
                      documentUrls[expert.id]
                    }

                    alt="Confidential professional credential"

                    referrerPolicy="no-referrer"

                    style={{
                      maxWidth: "100%",
                      maxHeight: 340,
                      objectFit: "contain"
                    }}

                    onError={() => {
                      setError(
                        "Document link expired or failed. Request another link."
                      );
                    }}
                  />

                  <label
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 12
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        Boolean(
                          reviewed[expert.id]
                        )
                      }

                      onChange={event =>
                        setReviewed(previous => ({
                          ...previous,

                          [expert.id]:
                            event.target.checked
                        }))
                      }
                    />

                    <span>
                      I reviewed the document
                      and checked the
                      professional credentials.
                    </span>
                  </label>

                  <small>
                    This document URL expires
                    after 60 seconds. Request
                    another link if necessary.
                  </small>
                </div>
              )}

              <div
                className="button-row"
                style={{
                  marginTop: 18
                }}
              >
                <button
                  type="button"
                  className="primary-button"

                  disabled={
                    processingId === expert.id ||
                    !reviewed[expert.id]
                  }

                  onClick={() =>
                    decide(
                      expert,
                      "verified"
                    )
                  }
                >
                  Verify credentials
                </button>

                <button
                  type="button"
                  className="danger-button"

                  disabled={
                    processingId === expert.id
                  }

                  onClick={() =>
                    decide(
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