const formatDate = (value) => {
  try {
    if (!value) return "Date not available";

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

const ReportCard = ({ report }) => {
  return (
    <article className="feature-card report-card">
      <div className="item-top">
        <div>
          <span className="eyebrow">ANONYMOUS REPORT</span>
          <h2>
            {report?.category || "General concern"}
          </h2>
        </div>

        <span className={`status ${report?.status || "pending"}`}>
          {report?.status || "pending"}
        </span>
      </div>

      <p>
        {report?.description ||
          "No report description available."}
      </p>

      <div className="report-meta">
        <span>
          Severity:{" "}
          <strong>
            {report?.severity || "medium"}
          </strong>
        </span>

        <span>
          {formatDate(report?.createdAt)}
        </span>
      </div>
    </article>
  );
};

export default ReportCard;