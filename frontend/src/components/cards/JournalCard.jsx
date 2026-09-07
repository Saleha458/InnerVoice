import { Link } from "react-router-dom";

const formatDate = (value) => {
  try {
    if (!value) return "Date not available";

    const date = value?.toDate
      ? value.toDate()
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date not available";
    }

    return date.toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Date not available";
  }
};

const JournalCard = ({ entry, onDelete }) => {
  return (
    <article className="feature-card journal-card">
      <div className="item-top">
        <div>
          <span className="eyebrow">PRIVATE ENTRY</span>
          <h2>{entry?.title || "Untitled entry"}</h2>
        </div>

        {entry?.mood && (
          <span className="status active">
            {entry.mood}
          </span>
        )}
      </div>

      <p>
        {(entry?.content || "").length > 180
          ? `${entry.content.slice(0, 180)}...`
          : entry?.content || "No content."}
      </p>

      <small>
        {formatDate(entry?.createdAt)}
      </small>

      <div className="button-row">
        <Link
          to={`/journal/${entry?.id}`}
          className="secondary-button"
        >
          Read
        </Link>

        {onDelete && (
          <button
            type="button"
            className="danger-button"
            onClick={() => onDelete(entry.id)}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
};

export default JournalCard;