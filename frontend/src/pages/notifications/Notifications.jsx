import {
  useNavigate,
} from "react-router-dom";

import {
  useNotifications,
} from "../../context/NotificationContext";

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (value) => {
  if (!value) return "Just now";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Just now"
    : date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const getIcon = (type) => {
  switch (type) {
    case "ai_response_ready":
      return "✦";

    case "expert_message":
      return "💬";

    case "expert_request":
      return "↗";

    case "request_accepted":
      return "✓";

    case "request_rejected":
      return "!";

    case "session_starting":
      return "◷";

    case "session_ending":
      return "⌛";

    case "session_completed":
      return "✓";

    default:
      return "🔔";
  }
};

/* =========================================================
   PAGE
========================================================= */

export default function Notifications() {
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    error,
    refreshNotifications,
    markRead,
    markAllRead,
  } = useNotifications();

  /* =======================================================
     OPEN NOTIFICATION
  ======================================================= */

  const openNotification = async (
    notification
  ) => {
    if (!notification) return;

    try {
      if (!notification.read) {
        await markRead(
          notification.id
        );
      }
    } catch (err) {
      console.error(
        "Could not mark notification read:",
        err
      );
    }

    const {
      type,
      data = {},
    } = notification;

    /* AI RESPONSE */

    if (
      type === "ai_response_ready"
    ) {
      const conversationId =
        data.conversationId;

      if (conversationId) {
        navigate(
          `/chat?conversationId=${encodeURIComponent(
            conversationId
          )}`
        );
      } else {
        navigate("/chat");
      }

      return;
    }

    /* EXPERT TEXT / VOICE MESSAGE */

    if (
      type === "expert_message"
    ) {
      if (data.sessionId) {
        navigate(
          `/session-chat/${encodeURIComponent(
            data.sessionId
          )}`
        );
      }

      return;
    }

    /* EXPERT'S NEW BOOKING REQUEST */

    if (
      type === "expert_request"
    ) {
      navigate("/expert/requests");
      return;
    }

    /* REJECTED BOOKING */

    if (
      type === "request_rejected"
    ) {
      navigate("/bookings");
      return;
    }

    /* OTHER SESSION UPDATES */

    if (data.sessionId) {
      navigate(
        `/session-chat/${encodeURIComponent(
          data.sessionId
        )}`
      );

      return;
    }

    if (
      type === "request_accepted"
    ) {
      navigate("/bookings");
    }
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE UPDATES
          </span>

          <h1>Notifications</h1>

          <p>
            Return to your AI conversations,
            expert messages and session
            updates.
          </p>
        </div>

        <div
          className="button-row"
          style={{
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={
              refreshNotifications
            }
            disabled={loading}
          >
            ↻ Refresh
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className="primary-button"
              onClick={markAllRead}
            >
              ✓ Mark all read
            </button>
          )}
        </div>
      </div>

      <div
        className="feature-card"
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: 16,
        }}
      >
        <div>
          <strong>
            {unreadCount > 0
              ? `${unreadCount} unread ${
                  unreadCount === 1
                    ? "notification"
                    : "notifications"
                }`
              : "You're all caught up"}
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              color: "#697286",
            }}
          >
            Your updates stay inside
            your InnerVoice account.
          </p>
        </div>

        <span
          aria-hidden="true"
          style={{
            fontSize: 26,
          }}
        >
          🔔
        </span>
      </div>

      {error && (
        <div
          className="error-box"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading &&
      !notifications.length ? (
        <div className="empty-card">
          Loading your notifications...
        </div>
      ) : !notifications.length ? (
        <div className="empty-card">
          <h2>You're all caught up</h2>

          <p>
            New replies and session updates
            will appear here.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          {notifications.map(
            (notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() =>
                  openNotification(
                    notification
                  )
                }
                className="feature-card"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems:
                    "flex-start",
                  gap: 16,
                  textAlign: "left",
                  cursor: "pointer",

                  background:
                    notification.read
                      ? "#ffffff"
                      : "#f7f6ff",

                  border:
                    notification.read
                      ? "1px solid #e6e8ee"
                      : "1px solid #d6d1ff",

                  borderRadius: 18,
                  padding: 20,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 46,
                    height: 46,
                    flexShrink: 0,
                    borderRadius: 13,
                    background: "#eceaff",
                    fontSize: 21,
                  }}
                >
                  {getIcon(
                    notification.type
                  )}
                </span>

                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems:
                        "center",
                      gap: 9,
                    }}
                  >
                    <strong>
                      {notification.title}
                    </strong>

                    {!notification.read && (
                      <span
                        className="status pending"
                      >
                        New
                      </span>
                    )}
                  </span>

                  <span
                    style={{
                      display: "block",
                      color: "#596174",
                      lineHeight: 1.6,
                      margin: "8px 0",
                    }}
                  >
                    {notification.message}
                  </span>

                  <small
                    style={{
                      color: "#81899b",
                    }}
                  >
                    {formatDate(
                      notification.createdAt
                    )}
                  </small>
                </span>

                <span
                  aria-hidden="true"
                  style={{
                    color: "#655cff",
                    fontSize: 20,
                  }}
                >
                  →
                </span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}