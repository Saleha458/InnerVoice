import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  getMyReports,
  getAllReports,
} from "../../services/reportService";

import ReportCard from "../../components/cards/ReportCard";

const formatDate = (
  value
) => {
  try {
    if (!value) {
      return "Date unavailable";
    }

    const date =
      value?.toDate
        ? value.toDate()
        : new Date(value);

    return date.toLocaleString(
      [],
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  } catch {
    return "Date unavailable";
  }
};

export default function Reports({
  adminMode = false,
}) {
  const location =
    useLocation();

  const [reports, setReports] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          adminMode
            ? await getAllReports()
            : await getMyReports();

        setReports(
          response.reports || []
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Could not load reports."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [adminMode]);

  return (
    <div className="page-shell">

      <div className="page-header">
        <div>
          <span className="eyebrow">
            {adminMode
              ? "ADMINISTRATION"
              : "PRIVATE SUPPORT"}
          </span>

          <h1>
            {adminMode
              ? "Report Review"
              : "Reports"}
          </h1>

          <p>
            {adminMode
              ? "Review submitted anonymous concerns."
              : "Your submitted concerns appear here."}
          </p>
        </div>

        {!adminMode && (
          <Link
            to="/reports/new"
            className="primary-button"
          >
            + Create report
          </Link>
        )}
      </div>

      {!adminMode && (
        <div className="warning-box">
          <strong>
            Immediate danger?
          </strong>{" "}
          Do not wait for an in-app report.
          Contact a trusted person or appropriate
          local emergency support.
        </div>
      )}

      {location.state?.submitted && (
        <div className="success-box">
          ✓ Report submitted successfully.
        </div>
      )}

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-card">
          Loading reports...
        </div>
      ) : !reports.length ? (
        <div className="empty-card">
          <h2>
            No reports yet
          </h2>

          <p>
            {adminMode
              ? "No concerns have been submitted."
              : "Your submitted reports will appear here."}
          </p>
        </div>
      ) : (
        <div className="list-grid">
          {reports.map(
            (report) => (
              <div
                key={report.id}
              >
                <ReportCard
                  report={report}
                />

                <small
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    opacity:
                      0.65,
                  }}
                >
                  Submitted:{" "}
                  {formatDate(
                    report.createdAt
                  )}
                </small>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}