
import {
  useCallback,
  useEffect,
  useState
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowRight,
  ClipboardList,
  CalendarDays,
  UserRound
} from "lucide-react";

import {
  getMyExpert,
  getExpertRequests,
  updateExpertRequest
} from "../../services/expertService";

const dateLabel = value => {
  if (!value) return "Not specified";

  const seconds = value.seconds ?? value._seconds;

  const date =
    seconds === undefined
      ? new Date(value)
      : new Date(Number(seconds) * 1000);

  return Number.isNaN(date.getTime())
    ? "Not specified"
    : date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
      });
};

export default function ExpertDashboard() {
  const [expert, setExpert] = useState(null);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);

    try {
      const response = await getExpertRequests();

      const items =
        response?.requests ||
        response?.data?.requests ||
        [];

      setRequests(
        Array.isArray(items) ? items : []
      );
    } catch (cause) {
      setError(
        cause?.response?.data?.message ||
        "Could not refresh requests."
      );
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getMyExpert();

      const record =
        response?.expert ||
        response?.data?.expert ||
        response?.data ||
        response;

      setExpert(record || null);

      if (
        (record?.verificationStatus || record?.status)
        === "verified"
      ) {
        await loadRequests();
      } else {
        setRequests([]);
      }
    } catch (cause) {
      setError(
        cause?.response?.data?.message ||
        cause.message ||
        "Unable to load expert profile."
      );
    } finally {
      setLoading(false);
    }
  }, [loadRequests]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (
      (expert?.verificationStatus || expert?.status)
      !== "verified"
    ) {
      return undefined;
    }

    const interval = setInterval(() => {
      void loadRequests();
    }, 10000);

    return () => clearInterval(interval);
  }, [
    expert?.verificationStatus,
    expert?.status,
    loadRequests
  ]);

  async function decide(request, status) {
    if (working) return;

    let reason = "";

    if (status === "rejected") {
      const response = window.prompt(
        "Reason for rejecting this request:"
      );

      if (response === null) return;

      reason = response.trim();

      if (!reason) {
        setError("A rejection reason is required.");
        return;
      }
    }

    setWorking(request.id);
    setError("");
    setNotice("");

    try {
      await updateExpertRequest(
        request.id,
        status,
        reason
      );

      setNotice(
        status === "accepted"
          ? "Request accepted."
          : "Request rejected with a reason."
      );

      await loadRequests();
    } catch (cause) {
      setError(
        cause?.response?.data?.message ||
        cause.message ||
        "Could not update request."
      );
    } finally {
      setWorking("");
    }
  }

  const status =
    expert?.verificationStatus ||
    expert?.status ||
    "pending";

  const pending = requests.filter(
    item => item.status === "pending"
  );

  const accepted = requests.filter(
    item => item.status === "accepted"
  );

  return (
    <div className="page-shell iv-expert-home">
      <style>{`
        .iv-expert-home {
          max-width: 1280px;
          margin: 0 auto;
        }

        .iv-expert-home .iv-expert-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          margin-bottom: 22px;
        }

        .iv-expert-home .iv-expert-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin: 22px 0 28px;
        }

        .iv-expert-home .iv-expert-stat {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          color: inherit;
          text-decoration: none;
          min-width: 0;
        }

        .iv-expert-home .iv-expert-stat-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 13px;
          background: #fff0e3;
          color: #a85c40;
        }

        .iv-expert-home .iv-expert-stat h2 {
          margin: 6px 0 0;
          font-size: 25px;
        }

        .iv-expert-home .iv-expert-stat p {
          margin: 4px 0 0;
          color: #736960;
          font-size: 13px;
        }

        .iv-expert-home .iv-request-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 17px;
        }

        .iv-expert-home .iv-request-heading h2 {
          font-size: clamp(21px, 2.2vw, 27px);
          margin: 5px 0;
        }

        .iv-expert-home .iv-request-heading p {
          margin: 0;
          font-size: 14px;
          color: #736960;
          line-height: 1.6;
        }

        .iv-expert-home .iv-request-inbox {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #e4cfbd;
          background: #fff;
          padding: 11px 16px;
          border-radius: 12px;
          color: #99573a;
          text-decoration: none;
          font-weight: 700;
        }

        .iv-expert-home .iv-request-inbox:hover {
          background: #fff4eb;
        }

        .iv-expert-home .iv-request-list {
          display: grid;
          gap: 15px;
        }

        .iv-expert-home .iv-request-card {
          padding: 20px;
          border: 1px solid #eadbcc;
          border-radius: 18px;
          background: #fff;
        }

        @media (max-width: 850px) {
          .iv-expert-home .iv-expert-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="page-header iv-expert-header">
        <div>
          <span className="eyebrow">
            {status === "verified"
              ? "VERIFIED EXPERT"
              : "EXPERT PORTAL"}
          </span>

          <h1>Expert Dashboard</h1>

          <p>
            Manage support requests and scheduled sessions.
          </p>
        </div>

        <Link
          className="secondary-button"
          to="/expert/profile"
        >
          My profile
        </Link>
      </header>

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="notice-box" role="status">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          Loading your dashboard…
        </div>
      ) : !expert ? (
        <div className="empty-state">
          <p>Could not load expert profile.</p>

          <button
            type="button"
            className="primary-button"
            onClick={loadDashboard}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">
                  ACCOUNT STATUS
                </span>

                <h2>
                  {expert.professionalName ||
                    expert.name ||
                    "Expert"}
                </h2>
              </div>

              <span
                className={`status-badge ${status}`}
              >
                {status === "verified"
                  ? "Verified"
                  : status === "rejected"
                    ? "Rejected"
                    : "Pending"}
              </span>
            </div>

            {status === "verified" ? (
              <div className="success-state">
                <strong>
                  Expert account verified
                </strong>

                <p>
                  Your profile is visible to users and
                  you can receive session requests.
                </p>
              </div>
            ) : status === "rejected" ? (
              <div className="error-state">
                <strong>
                  Application rejected
                </strong>

                <p>
                  {expert.rejectionReason ||
                    "No reason provided."}
                </p>
              </div>
            ) : (
              <div className="warning-state">
                <strong>
                  Verification pending
                </strong>

                <p>
                  Your application is awaiting
                  administrator review.
                </p>
              </div>
            )}
          </section>

          {status === "verified" && (
            <>
              <div className="iv-expert-stats">
                <Link
                  className="dashboard-card iv-expert-stat"
                  to="/expert/requests"
                >
                  <span className="iv-expert-stat-icon">
                    <ClipboardList size={21} />
                  </span>

                  <div>
                    <span>Requests</span>
                    <h2>{pending.length}</h2>
                    <p>Pending session requests</p>
                  </div>
                </Link>

                <Link
                  className="dashboard-card iv-expert-stat"
                  to="/expert/sessions"
                >
                  <span className="iv-expert-stat-icon">
                    <CalendarDays size={21} />
                  </span>

                  <div>
                    <span>Sessions</span>
                    <h2>{accepted.length}</h2>
                    <p>Accepted requests</p>
                  </div>
                </Link>

                <Link
                  className="dashboard-card iv-expert-stat"
                  to="/expert/profile"
                >
                  <span className="iv-expert-stat-icon">
                    <UserRound size={21} />
                  </span>

                  <div>
                    <span>Profile</span>
                    <h2>View</h2>
                    <p>Professional details</p>
                  </div>
                </Link>
              </div>

              <section className="section-block">
                <div className="iv-request-heading">
                  <div>
                    <span className="eyebrow">
                      SESSION REQUESTS
                    </span>

                    <h2>Pending support requests</h2>

                    <p>
                      Accept a request to confirm a session,
                      or reject it with a reason.
                    </p>
                  </div>

                  <Link
                    className="iv-request-inbox"
                    to="/expert/requests"
                  >
                    Open request inbox

                    <ArrowRight size={17} />
                  </Link>
                </div>

                {requestsLoading && (
                  <p role="status">
                    Updating requests…
                  </p>
                )}

                {!requestsLoading &&
                  pending.length === 0 && (
                    <div className="empty-state">
                      <h3>No pending requests</h3>

                      <p>
                        New session requests will
                        appear here.
                      </p>
                    </div>
                  )}

                <div className="iv-request-list">
                  {pending.slice(0, 3).map(item => (
                    <article
                      className="iv-request-card"
                      key={item.id}
                    >
                      <div className="card-header">
                        <h3>Anonymous user</h3>

                        <span className="status-badge pending">
                          Pending
                        </span>
                      </div>

                      <div className="detail-grid">
                        <div>
                          <strong>
                            Requested time
                          </strong>

                          <p>
                            {dateLabel(
                              item.requestedStartTime ||
                              item.startTime
                            )}
                          </p>
                        </div>

                        <div>
                          <strong>
                            Duration
                          </strong>

                          <p>
                            {item.requestedDuration ||
                              item.duration ||
                              20} minutes
                          </p>
                        </div>
                      </div>

                      {item.message && (
                        <div className="message-box">
                          <strong>
                            User message
                          </strong>

                          <p>{item.message}</p>
                        </div>
                      )}

                      <div className="card-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={Boolean(working)}
                          onClick={() =>
                            decide(item, "accepted")
                          }
                        >
                          {working === item.id
                            ? "Processing…"
                            : "Accept request"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={Boolean(working)}
                          onClick={() =>
                            decide(item, "rejected")
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}