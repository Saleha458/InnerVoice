import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../../services/api";

import {
  auth,
} from "../../services/firebase";

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

export default function ExpertSessions() {
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

          const token =
            await auth.currentUser?.getIdToken();

          const response =
            await api.get(
              "/sessions/expert",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          setSessions(
            Array.isArray(
              response?.data?.sessions
            )
              ? response.data.sessions
              : []
          );
        } catch (err) {
          console.error(
            "Load expert sessions:",
            err
          );

          setError(
            err?.response?.data
              ?.message ||
              "Could not load sessions."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    load();

    const interval =
      setInterval(
        load,
        15000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [load]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            PROFESSIONAL
          </span>

          <h1>
            My Sessions
          </h1>

          <p>
            Your confirmed support
            sessions.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setLoading(true);
            load();
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-card">
          Loading sessions...
        </div>
      ) : sessions.length ===
        0 ? (
        <div className="empty-card">
          <h2>
            No scheduled sessions
          </h2>

          <p>
            Sessions appear here
            after you accept a
            user's request.
          </p>
        </div>
      ) : (
        <div className="list-grid">
          {sessions.map(
            (session) => (
              <article
                className="feature-card"
                key={session.id}
              >
                <div className="item-top">
                  <div>
                    <span className="eyebrow">
                      CONFIRMED SESSION
                    </span>

                    <h2>
                      {
                        session.duration
                      }{" "}
                      minute session
                    </h2>
                  </div>

                  <span className="status active">
                    Scheduled
                  </span>
                </div>

                <div className="expert-meta">
                  <span>
                    Start:{" "}
                    {formatDate(
                      session.startTime
                    )}
                  </span>

                  <span>
                    End:{" "}
                    {formatDate(
                      session.endTime
                    )}
                  </span>
                </div>

                <div className="notice-box">
                  You can communicate
                  with the user through
                  private chat, audio
                  or video during the
                  session.
                </div>

                <div className="button-row">
                  <a
                    className="secondary-button"
                    href={`/expert/messages?sessionId=${session.id}`}
                  >
                    💬 Chat
                  </a>

                  <a
                    className="primary-button"
                    href={`/sessions/${session.id}/call?mode=audio`}
                  >
                    🎧 Audio
                  </a>

                  <a
                    className="primary-button"
                    href={`/sessions/${session.id}/call?mode=video`}
                  >
                    📹 Video
                  </a>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}