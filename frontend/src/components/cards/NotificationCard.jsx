const formatDate = (value) => {
  try {
    if (!value) return "Just now";

    const date = value?.toDate
      ? value.toDate()
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date not available";
    }

    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Date not available";
  }
};

const NotificationCard = ({ notification, onRead }) => {
  const unread = !notification?.read;

  return (
    <button
      type="button"
      onClick={() => unread && onRead?.(notification.id)}
      className={`feature-card notification-item ${
        unread ? "unread" : ""
      }`}
      style={{
        textAlign: "left",
        width: "100%",
        cursor: unread ? "pointer" : "default",
      }}
    >
      <div className="item-top">
        <div>
          <h3>{notification?.title || "Notification"}</h3>

          <small>
            {formatDate(notification?.createdAt)}
          </small>
        </div>

        <span className={`status ${unread ? "pending" : "active"}`}>
          {unread ? "New" : "Read"}
        </span>
      </div>

      <p>
        {notification?.message ||
          "You have a new InnerVoice update."}
      </p>
    </button>
  );
};

export default NotificationCard;