const LABELS = {
  pending: "Pending review",
  in_review: "Being reviewed",
  resolved: "Resolved",
  closed: "Closed"
};

function dateText(value) {
  const date = value?.toDate?.() || new Date(value || 0);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
      });
}

export default function ReportCard({ report }) {
  const status = report?.status || "pending";

  return (
    <article className="feature-card report-card">
      <div className="item-top">
        <div>
          <span className="eyebrow">
            PRIVATE REPORT · NOT ANONYMOUS
          </span>

          <h2>
            {report?.category || "Private report"}
          </h2>
        </div>

        <span className={`status ${status}`}>
          {report?.legacy
            ? "Awaiting private migration"
            : LABELS[status] || status}
        </span>
      </div>

      <p
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere"
        }}
      >
        {report?.description ||
          "Description unavailable."}
      </p>

      <div className="report-meta">
        <span>
          Severity:{" "}
          <strong>
            {report?.severity || "unavailable"}
          </strong>
        </span>

        <span>
          {dateText(report?.createdAt)}
        </span>
      </div>

      {report?.legacy && (
        <small>
          This old report still uses server-held
          encryption. Its owner must migrate it
          before private Admin review.
        </small>
      )}

      {!report?.legacy && status === "pending" && (
        <small>
          Submitted successfully; Admin has
          not started reviewing it yet.
        </small>
      )}

      {report?.decryptionFailed && (
        <small role="alert">
          Unable to decrypt. Do not delete
          or migrate this report.
        </small>
      )}
    </article>
  );
}