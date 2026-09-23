import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

import {
  getMyBookings,
  getMyBookingRequests,
} from "../../services/bookingService";

const formatDate = (value) => {
  if (!value) {
    return "Date unavailable";
  }

  const seconds =
    value.seconds ??
    value._seconds;

  const date =
    seconds === undefined
      ? new Date(value)
      : new Date(
          Number(seconds) * 1000
        );

  return Number.isNaN(
    date.getTime()
  )
    ? "Date unavailable"
    : date.toLocaleString(
        [],
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      );
};

const statusClass = (status) => {
  if (status === "accepted") {
    return "active";
  }

  if (status === "rejected") {
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
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const load = useCallback(
    async (
      silent = false
    ) => {
      if (!silent) {
        setRefreshing(true);
      }

      setError("");

      try {
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
            ? requestResponse.requests
            : []
        );

        setSessions(
          Array.isArray(
            sessionResponse
              ?.sessions
          )
            ? sessionResponse.sessions
            : []
        );
      } catch (
        error
      ) {
        setError(
          error?.response?.data
            ?.message ||
            "Could not load bookings."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void load();

    const interval =
      setInterval(
        () => {
          void load(true);
        },
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
          Loading your sessions…
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            YOUR SUPPORT
          </span>

          <h1>
            My Sessions
          </h1>

          <p>
            Track pending requests,
            confirmed sessions and
            rejected requests.
          </p>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="secondary-button"
            disabled={refreshing}
            onClick={() =>
              load()
            }
          >
            {refreshing
              ? "Refreshing…"
              : "Refresh"}
          </button>

          <Link
            className="primary-button"
            to="/experts"
          >
            Find an expert
          </Link>
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

      <div className="list-grid">
        {!requests.length ? (
          <div className="empty-card">
            <h2>
              No session requests yet
            </h2>

            <p>
              Choose a verified expert
              to start.
            </p>

            <Link
              className="primary-button"
              to="/experts"
            >
              Browse experts
            </Link>
          </div>
        ) : (
          requests.map(
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
                  key={request.id}
                >
                  <div className="item-top">
                    <div>
                      <span className="eyebrow">
                        {accepted
                          ? "CONFIRMED SESSION"
                          : request.status ===
                              "pending"
                            ? "AWAITING EXPERT"
                            : "REQUEST UPDATE"}
                      </span>

                      <h2>
                        {request.expertName ||
                          "Support Professional"}
                      </h2>
                    </div>

                    <span
                      className={`status ${statusClass(
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
                      Start:
                    </strong>{" "}
                    {formatDate(
                      session
                        ?.startTime ||
                        request
                          .requestedStartTime
                    )}
                  </p>

                  <p>
                    <strong>
                      End:
                    </strong>{" "}
                    {formatDate(
                      session
                        ?.endTime ||
                        request
                          .requestedEndTime
                    )}
                  </p>

                  <p>
                    <strong>
                      Length:
                    </strong>{" "}
                    {session
                      ?.duration ||
                      request
                        .requestedDuration ||
                      "—"}{" "}
                    minutes
                  </p>

                  {request.message && (
                    <div className="notice-box">
                      <strong>
                        Your message
                      </strong>

                      <p>
                        {request.message}
                      </p>
                    </div>
                  )}

                  {request.status ===
                    "pending" && (
                    <div className="notice-box">
                      <strong>
                        Request pending
                      </strong>

                      <p>
                        Your expert has
                        been notified. The
                        time is temporarily
                        reserved.
                      </p>
                    </div>
                  )}

                  {accepted && (
                    <>
                      <div className="notice-box">
                        <strong>
                          ✓ Session confirmed
                        </strong>

                        <p>
                          Your expert accepted
                          the request.
                        </p>
                      </div>

                      {request.sessionId ? (
                        <div className="button-row">
                          <Link
                            className="primary-button"
                            to={`/session-chat/${encodeURIComponent(
                              request.sessionId
                            )}`}
                          >
                            <MessageCircle
                              size={16}
                              aria-hidden="true"
                            />
                            Chat / voice message
                          </Link>
                        </div>
                      ) : (
                        <div className="notice-box">
                          Preparing session
                          access…
                        </div>
                      )}
                    </>
                  )}

                  {request.status ===
                    "rejected" && (
                    <div className="error-box">
                      <strong>
                        Request not accepted
                      </strong>

                      <p>
                        <strong>
                          Reason:
                        </strong>{" "}
                        {request.reason ||
                          "No reason provided."}
                      </p>

                      <Link
                        className="secondary-button"
                        to="/experts"
                      >
                        Choose another time
                        or expert
                      </Link>
                    </div>
                  )}
                </article>
              );
            }
          )
        )}
      </div>
    </div>
  );
}