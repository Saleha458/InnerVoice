import { useEffect, useState } from "react";
import {
  getNotifications,
  markNotificationRead,
} from "../../services/notificationService";
import { auth } from "../../services/firebase";

const formatDate = (value) => {
  try {
    const date = value?.toDate
      ? value.toDate()
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }

    return date.toLocaleString();
  } catch {
    return "Just now";
  }
};

const Notifications = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");

  const loadNotifications =
    async () => {
      try {
        setError("");

        const response =
          await getNotifications(
            auth.currentUser?.uid
          );

        setList(
          response.notifications || []
        );
      } catch (error) {
        console.error(
          "Notification loading error:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Could not load notifications."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(
      loadNotifications,
      15000
    );

    return () =>
      clearInterval(interval);
  }, []);

  const handleRead = async (
    notification
  ) => {
    if (notification.read) {
      return;
    }

    try {
      await markNotificationRead(
        notification.id
      );

      setList((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Could not mark notification read:",
        error
      );
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE UPDATES
          </span>

          <h1>Notifications</h1>

          <p>
            Your private InnerVoice updates,
            session reminders and support
            notifications.
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
          <h2>Loading notifications...</h2>
          <p>
            Checking for your latest updates.
          </p>
        </div>
      ) : !list.length ? (
        <div className="empty-card">
          <h2>You're all caught up</h2>

          <p>
            New InnerVoice updates will
            appear here.
          </p>
        </div>
      ) : (
        <div className="list-grid">
          {list.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() =>
                handleRead(notification)
              }
              className="feature-card notification-item"
              style={{
                textAlign: "left",
                opacity:
                  notification.read
                    ? 0.72
                    : 1,
              }}
            >
              <div className="item-top">
                <strong>
                  {notification.title}
                </strong>

                <span
                  className={`status ${
                    notification.read
                      ? "active"
                      : "pending"
                  }`}
                >
                  {notification.read
                    ? "Read"
                    : "New"}
                </span>
              </div>

              <p>
                {notification.message}
              </p>

              <small>
                {formatDate(
                  notification.createdAt
                )}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;