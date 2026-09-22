
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import api from "../../services/api";

const toDate = value => {
  if (!value) return null;

  const seconds = value.seconds ?? value._seconds;

  const date =
    seconds == null
      ? new Date(value)
      : new Date(Number(seconds) * 1000);

  return Number.isNaN(date.getTime()) ? null : date;
};

const endOf = session =>
  toDate(session?.endTime) ||
  (
    toDate(session?.startTime) &&
    Number(session?.duration) > 0
      ? new Date(
          toDate(session.startTime).getTime() +
            Number(session.duration) * 60000
        )
      : null
  );

const phaseOf = (session, now) => {
  if (!session) return "loading";

  const start = toDate(session.startTime);
  const end = endOf(session);

  if (!start || !end) return "invalid";

  if (
    session.status === "completed" ||
    now >= end.getTime()
  ) {
    return "ended";
  }

  if (session.status !== "scheduled") {
    return "closed";
  }

  return now < start.getTime()
    ? "upcoming"
    : "active";
};

const messageOf = error =>
  error?.response?.data?.message ||
  error?.message ||
  "Audio call failed.";

const containsVideo = description =>
  /(?:^|\r?\n)m=video(?:\s|$)/i.test(
    description?.sdp || ""
  );

const isTurn = value =>
  /^turns?:/i.test(value || "");

async function rtcSettings(sessionId) {
  const { data } = await api.get(
    `/ice-servers/${encodeURIComponent(sessionId)}`
  );

  const servers = data?.iceServers;

  const authenticatedTurn =
    Array.isArray(servers) &&
    servers.some(
      server =>
        server.username &&
        server.credential &&
        (
          Array.isArray(server.urls)
            ? server.urls
            : [server.urls]
        ).some(isTurn)
    );

  if (
    !data?.success ||
    !Array.isArray(servers) ||
    (
      !authenticatedTurn &&
      !(
        import.meta.env.DEV &&
        data.developmentOnly
      )
    )
  ) {
    throw new Error(
      "Authenticated TURN relay is unavailable. Check Railway TURN configuration."
    );
  }

  return {
    iceServers: servers,
    iceTransportPolicy: authenticatedTurn
      ? "relay"
      : "all"
  };
}

// Tests TURN allocation without placing a call.
// Never display candidate addresses or credentials.
async function checkRelay(config) {
  const peer = new RTCPeerConnection({
    ...config,
    iceTransportPolicy: "relay"
  });

  const codes = new Set();

  try {
    peer.createDataChannel("relay-check");

    const success = await new Promise(
      (resolve, reject) => {
        let settled = false;

        const finish = (value, error) => {
          if (settled) return;

          settled = true;
          clearTimeout(timer);

          if (error) {
            reject(error);
          } else {
            resolve(value);
          }
        };

        const timer = setTimeout(
          () => finish(false),
          15000
        );

        peer.onicecandidate = event => {
          if (
            /\btyp relay\b/i.test(
              event.candidate?.candidate || ""
            )
          ) {
            finish(true);
          }
        };

        peer.onicecandidateerror = event => {
          if (Number.isInteger(event.errorCode)) {
            codes.add(event.errorCode);
          }
        };

        peer.onicegatheringstatechange = () => {
          if (
            peer.iceGatheringState === "complete"
          ) {
            finish(false);
          }
        };

        peer
          .createOffer()
          .then(offer =>
            peer.setLocalDescription(offer)
          )
          .catch(error =>
            finish(false, error)
          );
      }
    );

    return success
      ? "TURN relay allocated successfully on this device. Test on the other device too."
      : (
          "No TURN relay candidate. Check TURN server reachability and credentials." +
          (
            codes.size
              ? ` ICE error code(s): ${[
                  ...codes
                ].join(", ")}.`
              : ""
          )
        );
  } finally {
    peer.close();
  }
}

export default function CallRoom() {
  const { sessionId } = useParams();

  const { socket, connected } = useSocket();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const [error, setError] = useState("");
  const [status, setStatus] = useState(
    "Checking your session…"
  );

  const [count, setCount] = useState(0);
  const [incoming, setIncoming] = useState(null);

  const [started, setStarted] = useState(false);
  const [mediaConnected, setMediaConnected] =
    useState(false);
  const [muted, setMuted] = useState(false);

  const [testing, setTesting] = useState(false);
  const [relayResult, setRelayResult] = useState("");

  const remoteAudio = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

  const pendingIce = useRef([]);
  const incomingRef = useRef(null);
  const busyRef = useRef(false);

  const peerCandidateCount = useRef(0);
  const answerReceived = useRef(false);
  const timeoutRef = useRef(null);

  const socketRef = useRef(socket);
  const sessionRef = useRef(session);

  socketRef.current = socket;
  sessionRef.current = session;

  const phase = phaseOf(session, now);
  const active = phase === "active";

  useEffect(() => {
    const timer = setInterval(
      () => setNow(Date.now()),
      1000
    );

    return () => clearInterval(timer);
  }, []);

  const loadSession = useCallback(
    async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get(
          `/sessions/${encodeURIComponent(sessionId)}`
        );

        setSession(data.session || null);
      } catch (cause) {
        setError(messageOf(cause));
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const cleanup = useCallback(
    (keepPendingIce = false) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = null;

      const peer = peerRef.current;
      peerRef.current = null;

      if (peer) {
        peer.ontrack = null;
        peer.onicecandidate = null;
        peer.onicecandidateerror = null;
        peer.onconnectionstatechange = null;
        peer.oniceconnectionstatechange = null;

        if (peer.signalingState !== "closed") {
          peer.close();
        }
      }

      streamRef.current
        ?.getTracks()
        .forEach(track => track.stop());

      streamRef.current = null;

      if (remoteAudio.current) {
        remoteAudio.current.srcObject = null;
      }

      if (!keepPendingIce) {
        pendingIce.current = [];
      }

      incomingRef.current = null;
      busyRef.current = false;

      peerCandidateCount.current = keepPendingIce
        ? pendingIce.current.length
        : 0;

      answerReceived.current = false;

      setIncoming(null);
      setStarted(false);
      setMediaConnected(false);
      setMuted(false);
    },
    []
  );

  const flushIce = useCallback(async () => {
    const peer = peerRef.current;

    if (!peer?.remoteDescription) return;

    for (
      const candidate of pendingIce.current.splice(0)
    ) {
      try {
        await peer.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch {
        setStatus(
          "A remote network candidate was rejected. Check both devices' TURN test."
        );
      }
    }
  }, []);

  const armTimeout = useCallback(peer => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (
        peerRef.current !== peer ||
        peer.connectionState === "connected"
      ) {
        return;
      }

      const issue = !answerReceived.current
        ? "No call answer received. Ensure the other participant accepts the call and Socket.IO stays connected."
        : peerCandidateCount.current === 0
          ? "Answer received but no remote ICE candidates arrived. Check TURN allocation and signaling."
          : "Answer and ICE arrived, but secure audio did not connect. Test TURN on both devices and check their networks.";

      setError(issue);

      setStatus(
        "Audio connection timed out. End call and retry."
      );
    }, 25000);
  }, []);

  const makePeer = useCallback(
    async keepPendingIce => {
      cleanup(keepPendingIce);

      busyRef.current = true;

      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          "Use HTTPS and enable microphone access for this website."
        );
      }

      const configuration =
        await rtcSettings(sessionId);

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          },
          video: false
        });

      streamRef.current = stream;

      const peer =
        new RTCPeerConnection(configuration);

      peerRef.current = peer;

      stream
        .getAudioTracks()
        .forEach(track =>
          peer.addTrack(track, stream)
        );

      peer.onicecandidate = event => {
        if (
          event.candidate &&
          socketRef.current?.connected
        ) {
          socketRef.current.emit(
            "webrtc:ice",
            {
              sessionId,
              candidate:
                event.candidate.toJSON()
            }
          );
        }
      };

      peer.onicecandidateerror = event => {
        if (
          [401, 438, 701].includes(event.errorCode)
        ) {
          setStatus(
            `TURN/ICE error ${event.errorCode}. Test the relay on both devices.`
          );
        }
      };

      peer.ontrack = event => {
        if (
          event.track.kind !== "audio" ||
          !remoteAudio.current
        ) {
          return;
        }

        remoteAudio.current.srcObject =
          event.streams?.[0] ||
          new MediaStream([event.track]);

        remoteAudio.current
          .play()
          .catch(() => {
            setStatus(
              "Audio connected; tap the player to allow playback."
            );
          });
      };

      peer.oniceconnectionstatechange = () => {
        if (
          peerRef.current === peer &&
          peer.iceConnectionState === "failed"
        ) {
          setMediaConnected(false);
          setError(
            "ICE failed. Test the TURN relay on both devices."
          );
        }
      };

      peer.onconnectionstatechange = () => {
        if (peerRef.current !== peer) return;

        if (
          peer.connectionState === "connected"
        ) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = null;

          setMediaConnected(true);
          setError("");
          setStatus("Audio call connected");
        } else if (
          ["failed", "disconnected"].includes(
            peer.connectionState
          )
        ) {
          setMediaConnected(false);
          setStatus(
            "Audio connection interrupted. End and retry if needed."
          );
        }
      };

      return peer;
    },
    [cleanup, sessionId]
  );

  useEffect(() => {
    if (
      !socket ||
      !connected ||
      !active ||
      !sessionId
    ) {
      if (!connected && peerRef.current) {
        cleanup();
        setCount(0);
        setStatus(
          "Connection to server lost. Reconnecting; start a new call after both participants return."
        );
      }

      return;
    }

    const onPresence = data => {
      if (data?.sessionId === sessionId) {
        setCount(
          Number(data.participantCount || 0)
        );
      }
    };

    const onOffer = data => {
      if (
        data?.sessionId !== sessionId ||
        !data.offer
      ) {
        return;
      }

      if (
        data.mode !== "audio" ||
        containsVideo(data.offer)
      ) {
        socket.emit("webrtc:decline", {
          sessionId
        });

        setError(
          "Only audio calls are supported."
        );

        return;
      }

      if (
        busyRef.current ||
        incomingRef.current
      ) {
        socket.emit("webrtc:decline", {
          sessionId
        });

        return;
      }

      incomingRef.current = data;

      setIncoming(data);

      setStatus(
        "Incoming audio call. Accept or decline."
      );
    };

    const onAnswer = async data => {
      if (
        data?.sessionId !== sessionId ||
        !peerRef.current ||
        !data.answer
      ) {
        return;
      }

      if (containsVideo(data.answer)) {
        cleanup();

        setError(
          "Video answers are not supported."
        );

        return;
      }

      try {
        const peer = peerRef.current;

        if (
          peer.signalingState !==
          "have-local-offer"
        ) {
          return;
        }

        await peer.setRemoteDescription(
          new RTCSessionDescription(
            data.answer
          )
        );

        answerReceived.current = true;

        setStatus(
          "Call answered. Connecting encrypted audio…"
        );

        await flushIce();
      } catch (cause) {
        setError(messageOf(cause));
      }
    };

    const onIce = async data => {
      if (
        data?.sessionId !== sessionId ||
        !data.candidate
      ) {
        return;
      }

      peerCandidateCount.current += 1;

      if (!peerRef.current?.remoteDescription) {
        pendingIce.current.push(
          data.candidate
        );

        return;
      }

      try {
        await peerRef.current.addIceCandidate(
          new RTCIceCandidate(
            data.candidate
          )
        );
      } catch {
        setStatus(
          "Remote ICE candidate rejected; inspect TURN connectivity."
        );
      }
    };

    const onEnded = data => {
      if (data?.sessionId !== sessionId) {
        return;
      }

      cleanup();

      setStatus(
        "The other participant ended the call."
      );
    };

    const onDeclined = data => {
      if (data?.sessionId !== sessionId) {
        return;
      }

      cleanup();

      setStatus(
        "The other participant declined the call."
      );
    };

    const onLocked = data => {
      if (data?.sessionId !== sessionId) {
        return;
      }

      cleanup();
      setCount(0);

      setError(
        data.message || "Session ended."
      );

      void loadSession();
    };

    const onCallError = data =>
      setError(
        data?.message ||
        "Call signaling failed."
      );

    const events = [
      ["call:joined", onPresence],
      ["call:presence", onPresence],
      ["webrtc:offer", onOffer],
      ["webrtc:answer", onAnswer],
      ["webrtc:ice", onIce],
      ["webrtc:ended", onEnded],
      ["webrtc:declined", onDeclined],
      ["call:locked", onLocked],
      ["call:error", onCallError]
    ];

    events.forEach(
      ([name, listener]) =>
        socket.on(name, listener)
    );

    setCount(0);

    socket.emit(
      "call:join",
      sessionId
    );

    return () => {
      if (socket.connected) {
        socket.emit(
          "call:leave",
          sessionId
        );
      }

      events.forEach(
        ([name, listener]) =>
          socket.off(name, listener)
      );
    };
  }, [
    socket,
    connected,
    active,
    sessionId,
    cleanup,
    flushIce,
    loadSession
  ]);

  useEffect(() => {
    if (
      ["ended", "closed", "invalid"].includes(
        phase
      ) &&
      (
        peerRef.current ||
        incomingRef.current
      )
    ) {
      if (socketRef.current?.connected) {
        socketRef.current.emit(
          "webrtc:end",
          { sessionId }
        );
      }

      cleanup();
    }
  }, [phase, sessionId, cleanup]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      peerRef.current?.close();

      streamRef.current
        ?.getTracks()
        .forEach(track => track.stop());
    },
    []
  );

  async function startCall() {
    if (
      !active ||
      !socket?.connected ||
      count !== 2 ||
      busyRef.current ||
      incomingRef.current
    ) {
      return;
    }

    busyRef.current = true;

    setError("");
    setStatus(
      "Checking microphone and relay…"
    );

    try {
      const peer =
        await makePeer(false);

      if (
        phaseOf(
          sessionRef.current,
          Date.now()
        ) !== "active" ||
        !socketRef.current?.connected
      ) {
        throw new Error(
          "Session or server connection ended."
        );
      }

      await peer.setLocalDescription(
        await peer.createOffer()
      );

      setStarted(true);

      armTimeout(peer);

      socket.emit(
        "webrtc:offer",
        {
          sessionId,
          offer:
            peer.localDescription.toJSON(),
          mode: "audio"
        }
      );

      setStatus(
        "Calling the other participant…"
      );
    } catch (cause) {
      cleanup();
      setError(messageOf(cause));
    }
  }

  async function acceptCall() {
    const offer = incomingRef.current;

    if (
      !offer ||
      !active ||
      !socket?.connected ||
      busyRef.current
    ) {
      return;
    }

    busyRef.current = true;

    setError("");
    setStatus(
      "Checking microphone and relay…"
    );

    try {
      const peer =
        await makePeer(true);

      if (
        phaseOf(
          sessionRef.current,
          Date.now()
        ) !== "active" ||
        !socketRef.current?.connected
      ) {
        throw new Error(
          "Session or server connection ended."
        );
      }

      await peer.setRemoteDescription(
        new RTCSessionDescription(
          offer.offer
        )
      );

      await flushIce();

      await peer.setLocalDescription(
        await peer.createAnswer()
      );

      socket.emit(
        "webrtc:answer",
        {
          sessionId,
          answer:
            peer.localDescription.toJSON()
        }
      );

      answerReceived.current = true;

      setStarted(true);

      armTimeout(peer);

      setStatus(
        "Answer sent. Connecting encrypted audio…"
      );
    } catch (cause) {
      if (socket.connected) {
        socket.emit(
          "webrtc:decline",
          { sessionId }
        );
      }

      cleanup();
      setError(messageOf(cause));
    }
  }

  async function testRelay() {
    if (
      !active ||
      testing ||
      started ||
      incoming
    ) {
      return;
    }

    setTesting(true);

    setRelayResult(
      "Testing TURN allocation without starting a call…"
    );

    try {
      setRelayResult(
        await checkRelay(
          await rtcSettings(sessionId)
        )
      );
    } catch (cause) {
      setRelayResult(
        `TURN check failed: ${messageOf(cause)}`
      );
    } finally {
      setTesting(false);
    }
  }

  function declineCall() {
    socket?.emit(
      "webrtc:decline",
      { sessionId }
    );

    cleanup();

    setStatus("Call declined.");
  }

  function endCall() {
    socket?.emit(
      "webrtc:end",
      {
        sessionId,
        reason: "ended"
      }
    );

    cleanup();

    setStatus("Call ended.");
  }

  function toggleMute() {
    const next = !muted;

    streamRef.current
      ?.getAudioTracks()
      .forEach(track => {
        track.enabled = !next;
      });

    setMuted(next);
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-card">
          Loading booked session…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page-shell">
        <div className="error-box">
          {error || "Session not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE BOOKED SESSION
          </span>

          <h1>
            🎧 Audio support call
          </h1>

          <p role="status">
            {status}
          </p>
        </div>

        <Link
          className="secondary-button"
          to={`/session-chat/${encodeURIComponent(
            sessionId
          )}`}
        >
          ← Back to chat
        </Link>
      </header>

      {error && (
        <div
          className="error-box"
          role="alert"
        >
          {error}
        </div>
      )}

      <div
        className={
          active
            ? "notice-box"
            : "empty-card"
        }
      >
        {active
          ? `Audio is available until ${endOf(
              session
            )?.toLocaleString()}.`
          : phase === "upcoming"
            ? `Your session starts ${toDate(
                session.startTime
              )?.toLocaleString()}.`
            : "Calling is unavailable outside your booked session. Book another session to continue."}
      </div>

      <section
        className="feature-card"
        style={{ marginTop: 16 }}
      >
        <p>
          Participants online:{" "}
          {active ? count : 0}/2 ·{" "}
          {mediaConnected
            ? "Audio connected"
            : "Not connected"}
        </p>

        <audio
          ref={remoteAudio}
          autoPlay
          controls
          playsInline
          style={{
            width: "min(100%, 500px)"
          }}
          aria-label="Other participant audio"
        />

        <div
          className="button-row"
          style={{ marginTop: 16 }}
        >
          {active &&
            !started &&
            !incoming && (
              <button
                type="button"
                className="primary-button"
                disabled={
                  !connected ||
                  count !== 2 ||
                  testing
                }
                onClick={startCall}
              >
                Start audio call
              </button>
            )}

          {active && incoming && (
            <>
              <button
                type="button"
                className="primary-button"
                disabled={testing}
                onClick={acceptCall}
              >
                Accept audio call
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={declineCall}
              >
                Decline
              </button>
            </>
          )}

          {started && (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={toggleMute}
              >
                {muted
                  ? "Unmute"
                  : "Mute"}
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={endCall}
              >
                End call
              </button>
            </>
          )}

          {active &&
            !started &&
            !incoming && (
              <button
                type="button"
                className="secondary-button"
                disabled={testing}
                onClick={testRelay}
              >
                {testing
                  ? "Testing relay…"
                  : "Test TURN relay"}
              </button>
            )}
        </div>

        {relayResult && (
          <p
            className="notice-box"
            role="status"
            style={{ marginTop: 16 }}
          >
            {relayResult}
          </p>
        )}

        <p
          className="notice-box"
          style={{ marginTop: 16 }}
        >
          Microphone only; camera is never requested.
          InnerVoice does not intentionally record calls.
          WebRTC encrypts transport; this is not a claim
          of audited end-to-end media encryption.
          Use headphones and a private setting.
          For immediate danger, contact local
          emergency services.
        </p>
      </section>
    </div>
  );
}