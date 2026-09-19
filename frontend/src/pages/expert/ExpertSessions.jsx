
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const formatDate = value => {
  if (!value) return "Date unavailable";
  const seconds = value.seconds ?? value._seconds;
  const date = seconds === undefined ? new Date(value) : new Date(Number(seconds) * 1000);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};
export default function ExpertSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/sessions/expert");
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (e) { setError(e?.response?.data?.message || "Could not load sessions."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 15000);
    return () => clearInterval(interval);
  }, [load]);
  return <div className="page-shell">
    <header className="page-header"><div><span className="eyebrow">PROFESSIONAL</span>
      <h1>My Sessions</h1><p>Your confirmed support sessions.</p></div>
      <button type="button" className="secondary-button" onClick={() => { setLoading(true); void load(); }}>Refresh</button>
    </header>
    {error && <div className="error-box" role="alert">{error}</div>}
    {loading ? <div className="empty-card">Loading sessions…</div> : !sessions.length ?
      <div className="empty-card"><h2>No scheduled sessions</h2><p>Sessions appear after you accept a user's request.</p></div> :
      <div className="list-grid">{sessions.map(session => <article className="feature-card" key={session.id}>
        <div className="item-top"><div><span className="eyebrow">CONFIRMED SESSION</span>
          <h2>{session.duration} minute session</h2></div>
          <span className="status active">{session.status || "Scheduled"}</span></div>
        <div className="expert-meta"><span>Start: {formatDate(session.startTime)}</span>
          <span>End: {formatDate(session.endTime)}</span></div>
        <div className="notice-box">Private chat, voice messages and audio calls are available during your booked session.</div>
        <div className="button-row">
          <Link className="secondary-button" to={`/session-chat/${encodeURIComponent(session.id)}`}>💬 Chat / voice message</Link>
          <Link className="primary-button" to={`/sessions/${encodeURIComponent(session.id)}/call?mode=audio`}>🎧 Audio call</Link>
        </div>
      </article>)}</div>}
  </div>;
}