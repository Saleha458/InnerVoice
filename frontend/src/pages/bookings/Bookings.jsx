import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getMyBookings,
  getMyBookingRequests,
} from "../../services/bookingService";

const toDate =
  (value) => {
    if (!value) {
      return null;
    }

    if (
      typeof value.toDate ===
      "function"
    ) {
      return value.toDate();
    }

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  };

const formatDate =
  (value) => {
    const date =
      toDate(value);

    return date
      ? date.toLocaleString(
          [],
          {
            dateStyle:
              "medium",

            timeStyle:
              "short",
          }
        )
      : "Date unavailable";
  };

const getStatusClass =
  (status) => {
    if (
      status ===
        "accepted" ||
      status ===
        "scheduled"
    ) {
      return "active";
    }

    if (
      status ===
      "rejected"
    ) {
      return "rejected";
    }

    return "pending";
  };

export default function Bookings() {
  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    sessions,
    setSessions,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const load =
    useCallback(
      async () => {
        try {
          setError("");

          const [
            requestResponse,
            sessionResponse,
          ] =
            await Promise.all([
              getMyBookingRequests(),
              getMyBookings(),
            ]);

          setRequests(
            Array.isArray(
              requestResponse
                ?.requests
            )
              ? requestResponse
                  .requests
              : []
          );

          setSessions(
            Array.isArray(
              sessionResponse
                ?.sessions
            )
              ? sessionResponse
                  .sessions
              : []
          );
        } catch (err) {
          console.error(
            "Load bookings:",
            err
          );

          setError(
            err?.response
              ?.data
              ?.message ||
              "Could not load bookings."
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

  const sessionMap =
    useMemo(
      () =>
        new Map(
          sessions.map(
            (session) => [
              session.id,
              session,
            ]
          )
        ),
      [sessions]
    );

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-card">
          Loading your sessions...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            YOUR SUPPORT
          </span>

          <h1>
            My Sessions
          </h1>

          <p>
            Requests,
            confirmations and
            private session access
            in one place.
          </p>
        </div>

        <Link
          className="primary-button"
          to="/experts"
        >
          Find an expert
        </Link>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="list-grid">
        {requests.length ===
          0 && (
          <div className="empty-card">
            <h2>
              No session
              requests yet
            </h2>

            <p>
              Choose a verified
              expert to start.
            </p>
          </div>
        )}

        {requests.map(
          (request) => {
            const session =
              request.sessionId
                ? sessionMap.get(
                    request.sessionId
                  )
                : null;

            const accepted =
              request.status ===
              "accepted";

            return (
              <article
                className="feature-card"
                key={
                  request.id
                }
              >
                <div className="item-top">
                  <div>
                    <span className="eyebrow">
                      {accepted
                        ? "CONFIRMED"
                        : request.status.toUpperCase()}
                    </span>

                    <h2>
                      {request.expertName ||
                        "Support Professional"}
                    </h2>
                  </div>

                  <span
                    className={`status ${getStatusClass(
                      request.status
                    )}`}
                  >
                    {accepted
                      ? "Confirmed"
                      : request.status}
                  </span>
                </div>

                <p>
                  <strong>
                    Date & time:
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
                  <p>
                    <strong>
                      Your message:
                    </strong>{" "}
                    {
                      request.message
                    }
                  </p>
                )}

                {request.status ===
                  "pending" && (
                  <div className="notice-box">
                    The expert has
                    been notified.
                    You will receive
                    a notification
                    when they accept
                    or reject this
                    request.
                  </div>
                )}

                {accepted && (
                  <>
                    <div className="notice-box">
                      <strong>
                        Session confirmed.
                      </strong>

                      <br />

                      Start:{" "}
                      {formatDate(
                        session?.startTime ||
                          request.requestedStartTime
                      )}

                      <br />

                      End:{" "}
                      {formatDate(
                        session?.endTime ||
                          request.requestedEndTime
                      )}
                    </div>

                    <div className="button-row">
                      <Link
                        className="primary-button"
                        to={`/session-chat/${request.sessionId}`}
                      >
                        💬 Chat / Voice
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
                  </>
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
            );
          }
        )}
      </div>
    </div>
  );
}