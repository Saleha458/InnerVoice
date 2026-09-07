import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getMyExpert,
  getExpertRequests,
  updateExpertRequest,
} from "../../services/expertService";

const formatDateTime = (value) => {
  if (!value) return "Not specified";

  try {
    const date = value?.seconds
      ? new Date(value.seconds * 1000)
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not specified";
    }

    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Not specified";
  }
};

const ExpertDashboard = () => {
  const [expert, setExpert] = useState(null);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");

  const loadExpert = async () => {
    try {
      const response = await getMyExpert();

      const expertData =
        response?.expert ||
        response?.data?.expert ||
        response?.data ||
        response;

      setExpert(expertData || null);

      return expertData;
    } catch (err) {
      console.error("Expert profile error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load expert profile."
      );

      return null;
    }
  };

  const loadRequests = async () => {
    try {
      setRequestLoading(true);

      const response = await getExpertRequests();

      const requestData =
        response?.requests ||
        response?.data?.requests ||
        response?.data ||
        response ||
        [];

      setRequests(
        Array.isArray(requestData)
          ? requestData
          : []
      );
    } catch (err) {
      console.error("Expert requests error:", err);
    } finally {
      setRequestLoading(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    const expertData = await loadExpert();

    const status =
      expertData?.verificationStatus ||
      expertData?.status;

    if (status === "verified") {
      await loadRequests();
    } else {
      setRequests([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (
      expert?.verificationStatus !== "verified"
    ) {
      return;
    }

    const interval = setInterval(() => {
      loadRequests();
    }, 5000);

    return () => clearInterval(interval);
  }, [expert?.verificationStatus]);

  const handleRequest = async (
    requestId,
    status
  ) => {
    try {
      setActionLoading(requestId);

      let reason = "";

      if (status === "rejected") {
        reason =
          window.prompt(
            "Please enter a reason for rejecting this request:"
          ) || "";

        if (!reason.trim()) {
          return;
        }
      }

      await updateExpertRequest(
        requestId,
        status,
        reason
      );

      await loadRequests();
    } catch (err) {
      console.error(
        "Request update error:",
        err
      );

      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update request."
      );
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">
              EXPERT PORTAL
            </span>

            <h1>Expert Dashboard</h1>

            <p>
              Loading your dashboard...
            </p>
          </div>
        </div>

        <div className="empty-state">
          Loading...
        </div>
      </div>
    );
  }

  if (error && !expert) {
    return (
      <div className="page-shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">
              EXPERT PORTAL
            </span>

            <h1>Expert Dashboard</h1>

            <p>
              We could not load your expert
              profile.
            </p>
          </div>
        </div>

        <div className="error-state">
          <p>{error}</p>

          <button
            className="btn btn-primary"
            onClick={loadDashboard}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const verificationStatus =
    expert?.verificationStatus || "pending";

  const pendingRequests =
    requests.filter(
      (request) =>
        request.status === "pending"
    );

  const acceptedRequests =
    requests.filter(
      (request) =>
        request.status === "accepted"
    );

  return (
    <div className="page-shell">
      {/* HEADER */}

      <div className="page-header">
        <div>
          <span className="eyebrow">
            {verificationStatus === "verified"
              ? "VERIFIED EXPERT"
              : "EXPERT PORTAL"}
          </span>

          <h1>Expert Dashboard</h1>

          <p>
            Manage support requests and
            scheduled sessions.
          </p>
        </div>

        <div className="page-header-actions">
          <Link
            className="btn btn-secondary"
            to="/profile"
          >
            My Profile
          </Link>
        </div>
      </div>

      {/* VERIFICATION */}

      <div className="dashboard-card">
        <div className="card-header">
          <div>
            <span className="eyebrow">
              ACCOUNT STATUS
            </span>

            <h2>
              {expert?.professionalName ||
                expert?.name ||
                "Expert"}
            </h2>
          </div>

          <span
            className={`status-badge ${verificationStatus}`}
          >
            {verificationStatus === "verified"
              ? "Verified"
              : verificationStatus ===
                "rejected"
              ? "Rejected"
              : "Pending"}
          </span>
        </div>

        {verificationStatus === "verified" && (
          <div className="success-state">
            <strong>
              Expert account verified
            </strong>

            <p>
              Your profile is now visible to
              verified-expert searches and you
              can receive session requests.
            </p>
          </div>
        )}

        {verificationStatus === "pending" && (
          <div className="warning-state">
            <strong>
              Verification pending
            </strong>

            <p>
              Your application is waiting for
              admin approval. Once approved,
              users will be able to find your
              profile and send session requests.
            </p>
          </div>
        )}

        {verificationStatus === "rejected" && (
          <div className="error-state">
            <strong>
              Application rejected
            </strong>

            <p>
              {expert?.rejectionReason ||
                "No rejection reason was provided."}
            </p>
          </div>
        )}
      </div>

      {/* VERIFIED CONTENT */}

      {verificationStatus === "verified" && (
        <>
          {/* SUMMARY CARDS */}

          <div className="dashboard-cards">
            <Link
              className="dashboard-card"
              to="/expert/requests"
            >
              <span>Requests</span>

              <h2>
                {pendingRequests.length}
              </h2>

              <p>
                Pending session requests
              </p>
            </Link>

            <Link
              className="dashboard-card"
              to="/expert/sessions"
            >
              <span>Sessions</span>

              <h2>
                {acceptedRequests.length}
              </h2>

              <p>
                Accepted requests
              </p>
            </Link>

            <Link
              className="dashboard-card"
              to="/profile"
            >
              <span>Profile</span>

              <h2>View</h2>

              <p>
                Professional details
              </p>
            </Link>
          </div>

          {/* REQUESTS */}

          <div className="section-block">
            <div className="section-header">
              <div>
                <span className="eyebrow">
                  SESSION REQUESTS
                </span>

                <h2>
                  Requests waiting for you
                </h2>

                <p>
                  Accept a request to confirm
                  the session or reject it with
                  a reason.
                </p>
              </div>

              <Link
                className="btn btn-secondary"
                to="/expert/requests"
              >
                View All
              </Link>
            </div>

            {requestLoading && (
              <div className="empty-state">
                Updating requests...
              </div>
            )}

            {!requestLoading &&
              pendingRequests.length === 0 && (
                <div className="empty-state">
                  <h3>
                    No pending requests
                  </h3>

                  <p>
                    New user session requests
                    will automatically appear
                    here.
                  </p>
                </div>
              )}

            <div className="stack-list">
              {pendingRequests.map(
                (request) => {
                  const isProcessing =
                    actionLoading ===
                    request.id;

                  return (
                    <div
                      className="dashboard-card"
                      key={request.id}
                    >
                      <div className="card-header">
                        <div>
                          <span className="eyebrow">
                            NEW REQUEST
                          </span>

                          <h3>
                            Anonymous User
                          </h3>
                        </div>

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
                            {formatDateTime(
                              request.requestedStartTime ||
                                request.startTime
                            )}
                          </p>
                        </div>

                        <div>
                          <strong>
                            Duration
                          </strong>

                          <p>
                            {request.requestedDuration ||
                              request.duration ||
                              20}{" "}
                            minutes
                          </p>
                        </div>
                      </div>

                      {request.message && (
                        <div className="message-box">
                          <strong>
                            User message
                          </strong>

                          <p>
                            {request.message}
                          </p>
                        </div>
                      )}

                      <div className="card-actions">
                        <button
                          className="btn btn-primary"
                          disabled={isProcessing}
                          onClick={() =>
                            handleRequest(
                              request.id,
                              "accepted"
                            )
                          }
                        >
                          {isProcessing
                            ? "Processing..."
                            : "Accept Request"}
                        </button>

                        <button
                          className="btn btn-secondary"
                          disabled={isProcessing}
                          onClick={() =>
                            handleRequest(
                              request.id,
                              "rejected"
                            )
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExpertDashboard;