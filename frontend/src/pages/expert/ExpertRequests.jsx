
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExpertRequests, updateExpertRequest } from "../../services/expertService";

const formatDate = value => {
  if (!value) return "Date unavailable";
  const seconds = value.seconds ?? value._seconds;
  const date = seconds === undefined ? new Date(value) : new Date(Number(seconds) * 1000);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};
const statusClass = status => status === "accepted" ? "active" : status === "rejected" ? "rejected" : "pending";

export default function ExpertRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError("");
    try {
      const response = await getExpertRequests();
      setRequests(Array.isArray(response?.requests) ? response.requests : []);
    } catch (e) { setError(e?.response?.data?.message || "Could not load requests."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(true), 10000);
    return () => clearInterval(interval);
  }, [load]);
  async function decide(request, status) {
    if (!request?.id || processingId) return;
    let reason = "";
    if (status === "rejected") {
      const entered = window.prompt("Please explain why this request was rejected:");
      if (entered === null) return;
      reason = entered.trim();
      if (!reason) { setError("A rejection reason is required."); return; }
    } else if (!window.confirm(`Accept this ${request.requestedDuration}-minute session for ${formatDate(request.requestedStartTime)}?`)) return;
    setProcessingId(request.id); setError(""); setSuccess("");
    try {
      const response = await updateExpertRequest(request.id, status, reason);
      setRequests(current => current.map(item => item.id === request.id
        ? { ...item, status, reason: status === "rejected" ? reason : "", sessionId: response?.sessionId || item.sessionId || null }
        : item));
      setSuccess(status === "accepted" ? "Session confirmed. The user has been notified." : "Request rejected. The user has been notified.");
      await load(true);
    } catch (e) { setError(e?.response?.data?.message || "Could not update request."); }
    finally { setProcessingId(null); }
  }
  if (loading) return <div className="page-shell"><div className="empty-card">Checking support requests…</div></div>;
  return <div className="page-shell">
    <header className="page-header"><div><span className="eyebrow">PROFESSIONAL</span><h1>Support Requests</h1>
      <p>Review anonymous requests, then accept or reject them.</p></div>
      <button type="button" className="secondary-button" disabled={refreshing} onClick={() => load()}>{refreshing ? "Refreshing…" : "Refresh"}</button>
    </header>
    {error && <div className="error-box" role="alert">{error}</div>}
    {success && <div className="notice-box" role="status">{success}</div>}
    <div className="list-grid">{!requests.length ? <div className="empty-card"><h2>No requests</h2>
      <p>New session requests will appear here automatically.</p></div> : requests.map(request =>
      <article className="feature-card" key={request.id}>
        <div className="item-top"><div><span className="eyebrow">ANONYMOUS USER</span>
          <h2>{request.anonymousId || "Anonymous"}</h2></div>
          <span className={`status ${statusClass(request.status)}`}>{request.status === "accepted" ? "Confirmed" : request.status}</span>
        </div>
        <p><strong>Requested:</strong> {formatDate(request.requestedStartTime)}</p>
        <p><strong>Ends:</strong> {formatDate(request.requestedEndTime)}</p>
        <p><strong>Length:</strong> {request.requestedDuration || "—"} minutes</p>
        {request.message && <div className="notice-box"><strong>User message</strong><p>{request.message}</p></div>}
        {request.status === "pending" && <>
          <div className="notice-box">The slot is temporarily reserved while this request is pending.</div>
          <div className="button-row">
            <button type="button" className="primary-button" disabled={processingId === request.id} onClick={() => decide(request, "accepted")}>✓ Accept & confirm</button>
            <button type="button" className="danger-button" disabled={processingId === request.id} onClick={() => decide(request, "rejected")}>Reject</button>
          </div>
        </>}
        {request.status === "accepted" && <div className="notice-box"><strong>✓ Session confirmed</strong>
          <p>This booking is reserved and appears in your sessions.</p>
          {request.sessionId && <div className="button-row">
            <Link className="primary-button" to={`/session-chat/${encodeURIComponent(request.sessionId)}`}>💬 Chat / voice message</Link>
            <Link className="secondary-button" to={`/sessions/${encodeURIComponent(request.sessionId)}/call?mode=audio`}>🎧 Audio call</Link>
          </div>}
        </div>}
        {request.status === "rejected" && <div className="error-box"><strong>Request rejected</strong>
          <p><strong>Reason:</strong> {request.reason || "No reason provided."}</p></div>}
      </article>)}</div>
  </div>;
}