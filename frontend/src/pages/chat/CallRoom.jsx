
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import api from "../../services/api";

const asDate = value => {
  if (!value) return null;
  const seconds = value.seconds ?? value._seconds;
  const date = seconds === undefined ? new Date(value) : new Date(Number(seconds) * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
};
const getEnd = session => asDate(session?.endTime) || (asDate(session?.startTime) && Number(session?.duration) > 0
  ? new Date(asDate(session.startTime).getTime() + Number(session.duration) * 60000) : null);
const phaseOf = (session, now) => {
  if (!session) return "loading";
  const start = asDate(session.startTime), end = getEnd(session);
  if (!start || !end) return "invalid";
  if (session.status === "completed" || now >= end.getTime()) return "ended";
  if (session.status !== "scheduled") return "closed";
  return now < start.getTime() ? "upcoming" : "active";
};
const errorText = e => e?.response?.data?.message || e?.message || "Audio call failed.";
const hasVideo = description => typeof description?.sdp === "string" && /(?:^|\r?\n)m=video(?:\s|$)/i.test(description.sdp);
async function getRtcConfiguration(sessionId) {
  const { data } = await api.get(`/ice-servers/${encodeURIComponent(sessionId)}`);
  const servers = data?.iceServers;
  const hasTurn = Array.isArray(servers) && servers.some(server =>
    (Array.isArray(server.urls) ? server.urls : [server.urls]).some(url =>
      typeof url === "string" && /^turns?:/i.test(url)));
  if (!data?.success || !Array.isArray(servers) ||
      (!hasTurn && !(import.meta.env.DEV && data.developmentOnly))) {
    throw new Error("Private audio relay is unavailable. Configure TURN before calling.");
  }
  // TURN relay avoids exposing peer network addresses in production.
  return { iceServers: servers, iceTransportPolicy: hasTurn ? "relay" : "all" };
}

export default function CallRoom() {
  const { sessionId } = useParams();
  const { socket, connected } = useSocket();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Checking your session…");
  const [count, setCount] = useState(0);
  const [incoming, setIncoming] = useState(null);
  const [started, setStarted] = useState(false);
  const [mediaConnected, setMediaConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const remoteAudio = useRef(null);
  const pcRef = useRef(null), streamRef = useRef(null), iceRef = useRef([]);
  const incomingRef = useRef(null), busyRef = useRef(false);
  const sessionRef = useRef(null), socketRef = useRef(null);
  sessionRef.current = session;
  socketRef.current = socket;
  const phase = phaseOf(session, now), active = phase === "active";

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const loadSession = useCallback(async () => {
    if (!sessionId) { setLoading(false); return; }
    try {
      const { data } = await api.get(`/sessions/${encodeURIComponent(sessionId)}`);
      setSession(data.session || null);
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, [sessionId]);
  useEffect(() => { void loadSession(); }, [loadSession]);

  const closeCall = useCallback((keepIce = false) => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (remoteAudio.current) remoteAudio.current.srcObject = null;
    if (!keepIce) iceRef.current = [];
    incomingRef.current = null;
    busyRef.current = false;
    setIncoming(null); setStarted(false); setMuted(false); setMediaConnected(false);
  }, []);
  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const items = iceRef.current.splice(0);
    for (const candidate of items) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch { /* Candidate from a previous connection. */ }
    }
  }, []);
  const makePeer = useCallback(async (preserveIce = false) => {
    closeCall(preserveIce);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Audio calls require HTTPS or localhost and a microphone.");
    }
    const config = await getRtcConfiguration(sessionId);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true }, video: false
    });
    streamRef.current = stream;
    let pc;
    try { pc = new RTCPeerConnection(config); }
    catch (e) { stream.getTracks().forEach(track => track.stop()); streamRef.current = null; throw e; }
    pcRef.current = pc;
    stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));
    pc.onicecandidate = event => {
      if (event.candidate && socketRef.current?.connected) {
        socketRef.current.emit("webrtc:ice", { sessionId, candidate: event.candidate.toJSON() });
      }
    };
    pc.ontrack = event => {
      if (event.track.kind !== "audio") return;
      const audio = remoteAudio.current;
      if (audio) {
        audio.srcObject = event.streams?.[0] || new MediaStream([event.track]);
        audio.play().catch(() => setStatus("Tap the audio player to enable sound."));
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setMediaConnected(true); setError(""); setStatus("Audio call connected");
      } else if (["failed", "disconnected"].includes(pc.connectionState)) {
        setMediaConnected(false); setStatus("Connection interrupted. End and retry if needed.");
      }
    };
    return pc;
  }, [closeCall, sessionId]);

  useEffect(() => {
    if (!socket || !connected || !active || !sessionId) return;
    const onPresence = data => {
      if (data?.sessionId === sessionId) setCount(Number(data.participantCount || 0));
    };
    const onOffer = async data => {
      if (data?.sessionId !== sessionId || !data.offer) return;
      if (data.mode !== "audio" || hasVideo(data.offer)) {
        socket.emit("webrtc:decline", { sessionId });
        setError("Video calls are disabled. Only audio is supported.");
        return;
      }
      if (data.renegotiate && pcRef.current && busyRef.current) {
        try {
          const pc = pcRef.current;
          if (pc.signalingState !== "stable") return;
          pc.setConfiguration(await getRtcConfiguration(sessionId));
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          await pc.setLocalDescription(await pc.createAnswer());
          socket.emit("webrtc:answer", { sessionId, answer: pc.localDescription.toJSON() });
          await flushIce();
        } catch (e) { setError(errorText(e)); }
        return;
      }
      if (busyRef.current || incomingRef.current) {
        socket.emit("webrtc:decline", { sessionId }); return;
      }
      incomingRef.current = data;
      setIncoming(data);
      setStatus("Incoming audio call. Accept or decline.");
    };
    const onAnswer = async data => {
      if (data?.sessionId !== sessionId || !pcRef.current || !data.answer) return;
      if (hasVideo(data.answer)) { setError("Video was rejected."); closeCall(); return; }
      try {
        if (pcRef.current.signalingState === "have-local-offer") {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          await flushIce();
        }
      } catch (e) { setError(errorText(e)); }
    };
    const onIce = async data => {
      if (data?.sessionId !== sessionId || !data.candidate) return;
      if (!pcRef.current?.remoteDescription) { iceRef.current.push(data.candidate); return; }
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)); }
      catch { /* Ignore stale candidate. */ }
    };
    const onDeclined = data => {
      if (data?.sessionId === sessionId) { closeCall(); setStatus("Call declined."); }
    };
    const onEnded = data => {
      if (data?.sessionId === sessionId) { closeCall(); setStatus("Other participant ended the call."); }
    };
    const onLocked = data => {
      if (data?.sessionId === sessionId) {
        closeCall(); setCount(0); setError(data.message || "Session ended."); void loadSession();
      }
    };
    const onError = data => setError(data?.message || "Call connection error.");
    socket.on("call:joined", onPresence);
    socket.on("call:presence", onPresence);
    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:ice", onIce);
    socket.on("webrtc:declined", onDeclined);
    socket.on("webrtc:ended", onEnded);
    socket.on("call:locked", onLocked);
    socket.on("call:error", onError);
    socket.emit("call:join", sessionId);
    return () => {
      socket.emit("call:leave", sessionId);
      socket.off("call:joined", onPresence);
      socket.off("call:presence", onPresence);
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:ice", onIce);
      socket.off("webrtc:declined", onDeclined);
      socket.off("webrtc:ended", onEnded);
      socket.off("call:locked", onLocked);
      socket.off("call:error", onError);
    };
  }, [socket, connected, active, sessionId, closeCall, flushIce, loadSession]);

  useEffect(() => {
    if (["ended", "closed", "invalid"].includes(phase) && (pcRef.current || incomingRef.current)) {
      socketRef.current?.emit("webrtc:end", { sessionId, reason: "session-ended" });
      closeCall();
    }
  }, [phase, sessionId, closeCall]);
  useEffect(() => () => {
    if (pcRef.current) pcRef.current.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  async function startCall() {
    if (!active || !connected || count !== 2 || busyRef.current || incomingRef.current) return;
    busyRef.current = true; setError(""); setStatus("Requesting microphone…");
    try {
      const pc = await makePeer();
      if (phaseOf(sessionRef.current, Date.now()) !== "active") throw new Error("Session ended.");
      await pc.setLocalDescription(await pc.createOffer());
      busyRef.current = true;
      setStarted(true);
      socket.emit("webrtc:offer", { sessionId, offer: pc.localDescription.toJSON(), mode: "audio" });
      setStatus("Calling the other participant…");
    } catch (e) { setError(errorText(e)); closeCall(); }
  }
  async function acceptCall() {
    const offer = incomingRef.current;
    if (!offer || !active || !socket?.connected || hasVideo(offer.offer)) return;
    setError(""); setStatus("Requesting microphone…");
    try {
      const pc = await makePeer(true);
      if (phaseOf(sessionRef.current, Date.now()) !== "active") throw new Error("Session ended.");
      await pc.setRemoteDescription(new RTCSessionDescription(offer.offer));
      await flushIce();
      await pc.setLocalDescription(await pc.createAnswer());
      socket.emit("webrtc:answer", { sessionId, answer: pc.localDescription.toJSON() });
      busyRef.current = true; setStarted(true); setStatus("Connecting audio…");
    } catch (e) {
      socket.emit("webrtc:decline", { sessionId }); setError(errorText(e)); closeCall();
    }
  }
  function declineCall() {
    socket?.emit("webrtc:decline", { sessionId });
    incomingRef.current = null; iceRef.current = [];
    setIncoming(null); setStatus("Call declined.");
  }
  function endCall() {
    socket?.emit("webrtc:end", { sessionId, reason: "ended" });
    closeCall(); setStatus("Call ended.");
  }
  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !next; });
    setMuted(next);
  }

  if (loading) return <div className="page-shell"><div className="empty-card">Loading booked session…</div></div>;
  if (!session) return <div className="page-shell"><div className="error-box">{error || "Session not found."}</div></div>;
  return <div className="page-shell">
    <header className="page-header">
      <div><span className="eyebrow">PRIVATE BOOKED SESSION</span>
        <h1>🎧 Audio support call</h1><p role="status">{status}</p></div>
      <Link className="secondary-button" to={`/session-chat/${encodeURIComponent(sessionId)}`}>← Back to chat</Link>
    </header>
    {error && <div className="error-box" role="alert">{error}</div>}
    <div className={active ? "notice-box" : "empty-card"}>
      {active ? `Audio is available until ${getEnd(session)?.toLocaleString()}.`
        : phase === "upcoming" ? `Your session starts ${asDate(session.startTime)?.toLocaleString()}.`
          : "Calling is unavailable outside your booked session. Book another session to continue."}
    </div>
    <section className="feature-card" style={{ marginTop: 16 }}>
      <p>Participants online: {active ? count : 0}/2 · {mediaConnected ? "Audio connected" : "Not connected"}</p>
      <audio ref={remoteAudio} autoPlay controls playsInline style={{ width: "min(100%, 500px)" }} aria-label="Other participant audio" />
      <div className="button-row" style={{ marginTop: 16 }}>
        {active && !started && !incoming && <button type="button" className="primary-button"
          disabled={!connected || count !== 2} onClick={startCall}>Start audio call</button>}
        {active && incoming && <>
          <button type="button" className="primary-button" onClick={acceptCall}>Accept audio call</button>
          <button type="button" className="danger-button" onClick={declineCall}>Decline</button>
        </>}
        {started && <>
          <button type="button" className="secondary-button" onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>
          <button type="button" className="danger-button" onClick={endCall}>End call</button>
        </>}
      </div>
      <p className="notice-box" style={{ marginTop: 16 }}>
        Microphone only; camera is never requested. InnerVoice does not intentionally record calls.
        WebRTC encrypts transport; this is not a claim of audited end-to-end media encryption.
        Use headphones and a private setting. For immediate danger, contact local emergency services.
      </p>
    </section>
  </div>;
}