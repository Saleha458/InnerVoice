import { Link } from "react-router-dom";

const formatDate = (value) => {
  try {
    if (!value) return "Date not available";
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "Date not available";

    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Date not available";
  }
};

const BookingCard = ({ booking, expertName = "Support Expert" }) => {
  const status = booking?.status || "scheduled";

  return (
    <article className="feature-card booking-card">
      <div className="item-top">
        <div>
          <span className="eyebrow">SUPPORT SESSION</span>
          <h2>{expertName}</h2>
        </div>

        <span className={`status ${status}`}>
          {status}
        </span>
      </div>

      <div className="booking-details">
        <p>
          <strong>Date & time:</strong>{" "}
          {formatDate(booking?.startTime)}
        </p>

        <p>
          <strong>Duration:</strong>{" "}
          {booking?.duration || 0} minutes
        </p>
      </div>

      {booking?.id && status === "scheduled" && (
        <div className="button-row">
          <Link
            to={`/session-chat/${booking.id}`}
            className="secondary-button"
          >
            Open chat
          </Link>

          <Link
            to={`/sessions/${booking.id}/call`}
            className="primary-button"
          >
            Join call
          </Link>
        </div>
      )}
    </article>
  );
};

export default BookingCard;