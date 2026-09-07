import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getExpertRequests,
  updateExpertRequest,
} from "../../services/expertService";

const formatDate =
  (value) => {
    if (!value) {
      return "Date unavailable";
    }

    const date =
      value?.toDate?.() ||
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? "Date unavailable"
      : date.toLocaleString(
          [],
          {
            dateStyle:
              "medium",

            timeStyle:
              "short",
          }
        );
  };

export default function ExpertRequests() {
  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    processingId,
    setProcessingId,
  ] = useState(null);

  const load =
    useCallback(
      async () => {
        try {
          setError("");

          const response =
            await getExpertRequests();

          setRequests(
            Array.isArray(
              response?.requests
            )
              ? response.requests
              : []
          );
        } catch (err) {
          setError(
            err?.response
              ?.data
              ?.message ||
              "Could not load requests."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    load();

    const interval =
      setInterval(
        load,
        10000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [load]);

  const decide =
    async (
      id,
      status
    ) => {
      let reason =
        "";

      if (
        status ===
        "rejected"
      ) {
        reason =
          window.prompt(
            "Please provide the reason for rejecting this request:"
          ) ||
          "";

        if (
          !reason.trim()
        ) {
          setError(
            "A rejection reason is required."
          );

          return;
        }
      }

      try {
        setProcessingId(
          id
        );

        setError("");

        await updateExpertRequest(
          id,
          status,
          reason
        );

        await load();
      } catch (err) {
        setError(
          err?.response
            ?.data
            ?.message ||
            "Could not update request."
        );
      } finally {
        setProcessingId(
          null
        );
      }
    };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-card">
          Checking for support
          requests...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            PROFESSIONAL
          </span>

          <h1>
            Support Requests
          </h1>

          <p>
            Review anonymous
            session requests and
            accept or reject them.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={
            load
          }
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="list-grid">
        {requests.length ===
          0 ? (
          <div className="empty-card">
            <h2>
              No requests
            </h2>

            <p>
              New requests will
              appear here
              automatically.
            </p>
          </div>
        ) : (
          requests.map(
            (request) => (
              <article
                className="feature-card"
                key={
                  request.id
                }
              >
                <div className="item-top">
                  <div>
                    <span className="eyebrow">
                      ANONYMOUS USER
                    </span>

                    <h2>
                      {request.anonymousId ||
                        "Anonymous"}
                    </h2>
                  </div>

                  <span
                    className={`status ${
                      request.status ===
                      "accepted"
                        ? "active"
                        : request.status ===
                          "rejected"
                        ? "rejected"
                        : "pending"
                    }`}
                  >
                    {
                      request.status
                    }
                  </span>
                </div>

                <p>
                  <strong>
                    Requested:
                  </strong>{" "}
                  {formatDate(
                    request.requestedStartTime
                  )}
                </p>

                <p>
                  <strong>
                    Length:
                  </strong>{" "}
                  {request.requestedDuration ||
                    "—"}{" "}
                  minutes
                </p>

                {request.message && (
                  <div className="notice-box">
                    <strong>
                      User message
                    </strong>

                    <p>
                      {
                        request.message
                      }
                    </p>
                  </div>
                )}

                {request.status ===
                  "pending" && (
                  <div className="button-row">
                    <button
                      className="primary-button"
                      disabled={
                        processingId ===
                        request.id
                      }
                      onClick={() =>
                        decide(
                          request.id,
                          "accepted"
                        )
                      }
                    >
                      {processingId ===
                      request.id
                        ? "Processing..."
                        : "✓ Accept & Confirm"}
                    </button>

                    <button
                      className="danger-button"
                      disabled={
                        processingId ===
                        request.id
                      }
                      onClick={() =>
                        decide(
                          request.id,
                          "rejected"
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                )}

                {request.status ===
                  "accepted" && (
                  <div className="notice-box">
                    <strong>
                      Session confirmed.
                    </strong>

                    <div
                      className="button-row"
                      style={{
                        marginTop:
                          12,
                      }}
                    >
                      <Link
                        className="primary-button"
                        to={`/session-chat/${request.sessionId}`}
                      >
                        💬 Open chat
                      </Link>

                      <Link
                        className="secondary-button"
                        to={`/sessions/${request.sessionId}/call?mode=audio`}
                      >
                        🎧 Audio
                      </Link>

                      <Link
                        className="secondary-button"
                        to={`/sessions/${request.sessionId}/call?mode=video`}
                      >
                        📹 Video
                      </Link>
                    </div>
                  </div>
                )}

                {request.status ===
                  "rejected" && (
                  <div className="error-box">
                    <strong>
                      Reason:
                    </strong>{" "}
                    {request.reason ||
                      "No reason provided."}
                  </div>
                )}
              </article>
            )
          )
        )}
      </div>
    </div>
  );
}