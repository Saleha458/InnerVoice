
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import api from "../../services/api";

const asDate = value => {
  if (!value) return null;

  const seconds = value.seconds ?? value._seconds;

  const date = seconds === undefined
    ? new Date(value)
    : new Date(Number(seconds) * 1000);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getEnd = session => {
  const end = asDate(session?.endTime);
  const start = asDate(session?.startTime);

  return end || (
    start && Number(session?.duration) > 0
      ? new Date(
          start.getTime() +
          Number(session.duration) * 60000
        )
      : null
  );
};

const phaseOf = (session, now) => {
  if (!session) return "loading";

  const start = asDate(session.startTime);
  const end = getEnd(session);

  if (!start || !end) return "invalid";

  if (
    session.status === "completed" ||
    now >= end.getTime()
  ) {
    return "ended";
  }

  if (session.status !== "scheduled") return "closed";

  return now < start.getTime()
    ? "upcoming"
    : "active";
};

const errorText = error =>
  error?.response?.data?.message ||
  error?.message ||
  "Audio call failed.";

const hasVideo = description =>
  typeof description?.sdp === "string" &&
  /(?:^|\r?\n)m=video(?:\s|$)/i.test(
    description.sdp
  );

async function getRtcConfiguration(sessionId) {
  const { data } = await api.get(
    `/ice-servers/${encodeURIComponent(sessionId)}`
  );

  const servers = data?.iceServers;

  const hasAuthenticatedTurn =
    Array.isArray(servers) &&
    servers.some(server =>
      Boolean(
        server.username &&
        server.credential
      ) &&
      (
        Array.isArray(server.urls)
          ? server.urls
          : [server.urls]
      ).some(url =>
        typeof url === "string" &&
        /^turns?:/i.test(url)
      )
    );

  if (
    !data?.success ||
    !Array.isArray(servers) ||
    (
      !hasAuthenticatedTurn &&
      !(
        import.meta.env.DEV &&
        data.developmentOnly
      )
    )
  ) {
    throw new Error(
      "Audio relay is unavailable. Check the TURN provider and Railway settings."
    );
  }

  // Keep production audio relay-only.
  // Do not expose a direct peer IP as a fallback.
  return {
    iceServers: servers,
    iceTransportPolicy: hasAuthenticatedTurn
      ? "relay"
      : "all"
  };
}

/*
 * This test asks the browser to gather a TURN
 * relay candidate without connecting to a peer.
 *
 * It does not display credentials or IP addresses.
 * A successful allocation does not, by itself,
 * guarantee that an entire call will connect.
 */
async function probeRelay(config) {
  const peer = new RTCPeerConnection({
    ...config,
    iceTransportPolicy: "relay"
  });

  const errors = new Set();

  try {
    peer.createDataChannel("turn-diagnostic");

    const allocated = await new Promise(
      async (resolve, reject) => {
        let finished = false;
        let timer;

        const finish = (result, cause) => {
          if (finished) return;

          finished = true;
          clearTimeout(timer);

          if (cause) {
            reject(cause);
          } else {
            resolve(result);
          }
        };

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
          if (
            Number.isInteger(event.errorCode)
          ) {
            errors.add(event.errorCode);
          }
        };

        peer.onicegatheringstatechange = () => {
          if (
            peer.iceGatheringState === "complete"
          ) {
            finish(false);
          }
        };

        timer = setTimeout(
          () => finish(false),
          15000
        );

        try {
          const offer = await peer.createOffer();

          await peer.setLocalDescription(
            offer
          );
        } catch (cause) {
          finish(false, cause);
        }
      }
    );

    if (allocated) {
      return (
        "TURN relay allocation passed on this device. " +
        "Retry the call on both devices."
      );
    }

    return (
      "No TURN relay candidate gathered. " +
      "Check TURN access and credentials." +
      (
        errors.size
          ? ` ICE error code(s): ${[
              ...errors
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

  const [session, setSession] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [now, setNow] =
    useState(Date.now());

  const [error, setError] =
    useState("");

  const [status, setStatus] =
    useState("Checking your session…");

  const [count, setCount] =
    useState(0);

  const [incoming, setIncoming] =
    useState(null);

  const [started, setStarted] =
    useState(false);

  const [mediaConnected, setMediaConnected] =
    useState(false);

  const [muted, setMuted] =
    useState(false);

  const [testingRelay, setTestingRelay] =
    useState(false);

  const [relayReport, setRelayReport] =
    useState("");

  const remoteAudio = useRef(null);

  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const iceRef = useRef([]);

  const incomingRef = useRef(null);
  const busyRef = useRef(false);

  const socketRef = useRef(null);
  const sessionRef = useRef(null);

  const callTimeout = useRef(null);

  const remoteCandidateCount = useRef(0);

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

  const loadSession = useCallback(async () => {
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
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const closeCall = useCallback(
    (preserveEarlyCandidates = false) => {
      if (callTimeout.current) {
        clearTimeout(callTimeout.current);
      }

      callTimeout.current = null;

      const pc = pcRef.current;
      pcRef.current = null;

      if (pc) {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onicecandidateerror = null;

        pc.oniceconnectionstatechange = null;
        pc.onconnectionstatechange = null;

        if (
          pc.signalingState !== "closed"
        ) {
          pc.close();
        }
      }

      streamRef.current
        ?.getTracks()
        .forEach(track => track.stop());

      streamRef.current = null;

      if (remoteAudio.current) {
        remoteAudio.current.srcObject = null;
      }

      if (!preserveEarlyCandidates) {
        iceRef.current = [];
        remoteCandidateCount.current = 0;
      }

      incomingRef.current = null;
      busyRef.current = false;

      setIncoming(null);
      setStarted(false);
      setMuted(false);
      setMediaConnected(false);
    },
    []
  );

  const startTimeout = useCallback(pc => {
    if (callTimeout.current) {
      clearTimeout(callTimeout.current);
    }

    callTimeout.current = setTimeout(() => {
      if (
        pcRef.current !== pc ||
        pc.connectionState === "connected"
      ) {
        return;
      }

      const received =
        remoteCandidateCount.current;

      setError(
        received === 0
          ? (
              "No remote ICE candidates arrived. " +
              "Check signaling on both devices " +
              "and TURN relay allocation."
            )
          : (
              "Audio could not connect within 25 seconds. " +
              "Test the TURN relay on BOTH devices; " +
              "check network/firewall or TURN quota."
            )
      );

      setStatus(
        "Audio connection timed out. " +
        "End the call, then retry."
      );
    }, 25000);
  }, []);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;

    if (!pc?.remoteDescription) {
      return;
    }

    const candidates =
      iceRef.current.splice(0);

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch {
        // A candidate may belong to an older call.
        // Do not log network addresses.
      }
    }
  }, []);

  const makePeer = useCallback(
    async (preserveEarlyCandidates = false) => {
      closeCall(preserveEarlyCandidates);

      busyRef.current = true;

      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          "Audio calls need HTTPS and a microphone-enabled browser."
        );
      }

      const config =
        await getRtcConfiguration(sessionId);

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          },
          video: false
        });

      streamRef.current = stream;

      let pc;

      try {
        pc = new RTCPeerConnection(config);
      } catch (cause) {
        stream
          .getTracks()
          .forEach(track => track.stop());

        streamRef.current = null;

        throw cause;
      }

      pcRef.current = pc;

      stream
        .getAudioTracks()
        .forEach(track =>
          pc.addTrack(track, stream)
        );

      pc.onicecandidate = event => {
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

      pc.onicecandidateerror = event => {
        if (
          [701, 401, 438].includes(
            event.errorCode
          )
        ) {
          setStatus(
            `TURN/ICE error ${event.errorCode}. ` +
            "Check relay on both devices."
          );
        }
      };

      pc.ontrack = event => {
        if (event.track.kind !== "audio") {
          return;
        }

        const audio = remoteAudio.current;

        if (!audio) return;

        audio.srcObject =
          event.streams?.[0] ||
          new MediaStream([event.track]);

        audio.play().catch(() => {
          setStatus(
            "Connected, but audio playback " +
            "needs a tap on the player."
          );
        });
      };

      pc.oniceconnectionstatechange = () => {
        if (pcRef.current !== pc) {
          return;
        }

        if (
          pc.iceConnectionState === "failed"
        ) {
          setMediaConnected(false);

          setError(
            "ICE connection failed. " +
            "Run Test TURN relay on both devices."
          );
        }
      };

      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) {
          return;
        }

        if (
          pc.connectionState === "connected"
        ) {
          if (callTimeout.current) {
            clearTimeout(callTimeout.current);
          }

          callTimeout.current = null;

          setMediaConnected(true);
          setError("");
          setStatus("Audio call connected");
        } else if (
          ["failed", "disconnected"].includes(
            pc.connectionState
          )
        ) {
          setMediaConnected(false);

          setStatus(
            "Connection interrupted. " +
            "End and retry if needed."
          );
        }
      };

      return pc;
    },
    [closeCall, sessionId]
  );

  useEffect(() => {
    if (
      !socket ||
      !connected ||
      !active ||
      !sessionId
    ) {
      return;
    }

    const onPresence = data => {
      if (data?.sessionId === sessionId) {
        setCount(
          Number(data.participantCount || 0)
        );
      }
    };

    const onOffer = async data => {
      if (
        data?.sessionId !== sessionId ||
        !data.offer
      ) {
        return;
      }

      if (
        data.mode !== "audio" ||
        hasVideo(data.offer)
      ) {
        socket.emit("webrtc:decline", {
          sessionId
        });

        setError(
          "Video is disabled. Only audio is supported."
        );

        return;
      }

      if (
        data.renegotiate &&
        pcRef.current &&
        busyRef.current
      ) {
        try {
          const pc = pcRef.current;

          if (
            pc.signalingState !== "stable"
          ) {
            return;
          }

          pc.setConfiguration(
            await getRtcConfiguration(sessionId)
          );

          await pc.setRemoteDescription(
            new RTCSessionDescription(
              data.offer
            )
          );

          await pc.setLocalDescription(
            await pc.createAnswer()
          );

          socket.emit(
            "webrtc:answer",
            {
              sessionId,
              answer:
                pc.localDescription.toJSON()
            }
          );

          await flushIce();
        } catch (cause) {
          setError(errorText(cause));
        }

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
        !pcRef.current ||
        !data.answer
      ) {
        return;
      }

      if (hasVideo(data.answer)) {
        setError("Video was rejected.");
        closeCall();
        return;
      }

      try {
        const pc = pcRef.current;

        if (
          pc.signalingState ===
          "have-local-offer"
        ) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(
              data.answer
            )
          );

          setStatus(
            "Answer received. " +
            "Checking the secure audio path…"
          );

          await flushIce();
        }
      } catch (cause) {
        setError(errorText(cause));
      }
    };

    const onIce = async data => {
      if (
        data?.sessionId !== sessionId ||
        !data.candidate
      ) {
        return;
      }

      remoteCandidateCount.current += 1;

      if (
        !pcRef.current?.remoteDescription
      ) {
        iceRef.current.push(
          data.candidate
        );

        return;
      }

      try {
        await pcRef.current.addIceCandidate(
          new RTCIceCandidate(
            data.candidate
          )
        );
      } catch {
        // Ignore stale candidates.
      }
    };

    const onDeclined = data => {
      if (data?.sessionId !== sessionId) {
        return;
      }

      closeCall();
      setStatus("Call declined.");
    };

    const onEnded = data => {
      if (data?.sessionId !== sessionId) {
        return;
      }

      closeCall();

      setStatus(
        "Other participant ended the call."
      );
    };

    const onLocked = data => {
      if (data?.sessionId !== sessionId) {
        return;
      }

      closeCall();
      setCount(0);

      setError(
        data.message || "Session ended."
      );

      void loadSession();
    };

    const onCallError = data => {
      setError(
        data?.message ||
        "Call signaling error."
      );
    };

    const listeners = [
      ["call:joined", onPresence],
      ["call:presence", onPresence],
      ["webrtc:offer", onOffer],
      ["webrtc:answer", onAnswer],
      ["webrtc:ice", onIce],
      ["webrtc:declined", onDeclined],
      ["webrtc:ended", onEnded],
      ["call:locked", onLocked],
      ["call:error", onCallError]
    ];

    listeners.forEach(
      ([event, listener]) =>
        socket.on(event, listener)
    );

    socket.emit(
      "call:join",
      sessionId
    );

    return () => {
      socket.emit(
        "call:leave",
        sessionId
      );

      listeners.forEach(
        ([event, listener]) =>
          socket.off(event, listener)
      );
    };
  }, [
    socket,
    connected,
    active,
    sessionId,
    closeCall,
    flushIce,
    loadSession
  ]);

  useEffect(() => {
    if (
      ["ended", "closed", "invalid"].includes(
        phase
      ) &&
      (
        pcRef.current ||
        incomingRef.current
      )
    ) {
      socketRef.current?.emit(
        "webrtc:end",
        {
          sessionId,
          reason: "session-ended"
        }
      );

      closeCall();
    }
  }, [phase, sessionId, closeCall]);

  useEffect(() => () => {
    if (callTimeout.current) {
      clearTimeout(callTimeout.current);
    }

    pcRef.current?.close();

    streamRef.current
      ?.getTracks()
      .forEach(track => track.stop());
  }, []);

  async function startCall() {
    if (
      !active ||
      !connected ||
      count !== 2 ||
      busyRef.current ||
      incomingRef.current
    ) {
      return;
    }

    busyRef.current = true;

    setError("");
    setStatus("Requesting microphone…");

    try {
      const pc = await makePeer();

      if (
        phaseOf(
          sessionRef.current,
          Date.now()
        ) !== "active"
      ) {
        throw new Error("Session ended.");
      }

      await pc.setLocalDescription(
        await pc.createOffer()
      );

      setStarted(true);
      startTimeout(pc);

      socket.emit(
        "webrtc:offer",
        {
          sessionId,
          offer:
            pc.localDescription.toJSON(),
          mode: "audio"
        }
      );

      setStatus(
        "Calling the other participant…"
      );
    } catch (cause) {
      setError(errorText(cause));
      closeCall();
    }
  }

  async function acceptCall() {
    const offer = incomingRef.current;

    if (
      !offer ||
      !active ||
      !socket?.connected ||
      hasVideo(offer.offer) ||
      busyRef.current
    ) {
      return;
    }

    busyRef.current = true;

    setError("");
    setStatus("Requesting microphone…");

    try {
      const pc = await makePeer(true);

      if (
        phaseOf(
          sessionRef.current,
          Date.now()
        ) !== "active"
      ) {
        throw new Error("Session ended.");
      }

      await pc.setRemoteDescription(
        new RTCSessionDescription(
          offer.offer
        )
      );

      await flushIce();

      await pc.setLocalDescription(
        await pc.createAnswer()
      );

      socket.emit(
        "webrtc:answer",
        {
          sessionId,
          answer:
            pc.localDescription.toJSON()
        }
      );

      setStarted(true);
      startTimeout(pc);

      setStatus(
        "Answer sent. " +
        "Checking the secure audio path…"
      );
    } catch (cause) {
      socket.emit(
        "webrtc:decline",
        { sessionId }
      );

      setError(errorText(cause));
      closeCall();
    }
  }

  async function testRelay() {
    if (!active || testingRelay) {
      return;
    }

    setTestingRelay(true);

    setRelayReport(
      "Checking TURN allocation " +
      "without starting a call…"
    );

    try {
      const config =
        await getRtcConfiguration(
          sessionId
        );

      setRelayReport(
        await probeRelay(config)
      );
    } catch (cause) {
      setRelayReport(
        `TURN check failed: ${errorText(cause)}`
      );
    } finally {
      setTestingRelay(false);
    }
  }

  function declineCall() {
    socket?.emit(
      "webrtc:decline",
      { sessionId }
    );

    incomingRef.current = null;
    iceRef.current = [];

    setIncoming(null);
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

    closeCall();
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

          <h1>🎧 Audio support call</h1>

          <p role="status">{status}</p>
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
          ? `Audio is available until ${
              getEnd(session)?.toLocaleString()
            }.`
          : phase === "upcoming"
            ? `Your session starts ${
                asDate(
                  session.startTime
                )?.toLocaleString()
              }.`
            : (
                "Calling is unavailable outside " +
                "your booked session. " +
                "Book another session to continue."
              )}
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
                  testingRelay
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
                onClick={acceptCall}
                disabled={testingRelay}
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

          {active && (
            <button
              type="button"
              className="secondary-button"
              onClick={testRelay}
              disabled={
                testingRelay ||
                started ||
                Boolean(incoming)
              }
            >
              {testingRelay
                ? "Testing relay…"
                : "Test TURN relay"}
            </button>
          )}
        </div>

        {relayReport && (
          <p
            className="notice-box"
            role="status"
          >
            {relayReport}
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