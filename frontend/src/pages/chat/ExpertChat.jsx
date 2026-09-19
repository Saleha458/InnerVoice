
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  Link,
  useParams,
  useSearchParams
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";

import api from "../../services/api";

import StarButton from "../../components/chat/StarButton";

import {
  createVault,
  decryptChat,
  encryptChat,
  getChatPeer,
  getVaultProfile,
  isVaultUnlocked,
  lockVault,
  trustChatPeer,
  unlockVault
} from "../../services/privateVault";

const errorText = error =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong.";

const asDate = value => {
  if (!value) return null;

  const seconds =
    value.seconds ?? value._seconds;

  const date =
    seconds === undefined
      ? new Date(value)
      : new Date(Number(seconds) * 1000);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const endOf = session =>
  asDate(session?.endTime) ||
  (
    asDate(session?.startTime) &&
    Number(session?.duration) > 0
      ? new Date(
          asDate(session.startTime).getTime() +
          Number(session.duration) * 60000
        )
      : null
  );

const phaseOf = (session, now) => {
  if (!session) return "loading";

  const start = asDate(session.startTime);
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

const toDataUrl = blob =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () =>
      reject(
        new Error(
          "Could not read voice recording."
        )
      );

    reader.onload = () =>
      resolve(reader.result);

    reader.readAsDataURL(blob);
  });

function VoiceMessage({ source }) {
  const valid =
    typeof source === "string" &&
    /^data:audio\/[a-z0-9.+-]+(?:;codecs=[a-z0-9.+-]+)?;base64,/i.test(
      source
    );

  return valid ? (
    <audio
      controls
      preload="none"
      src={source}
      style={{ maxWidth: "100%" }}
      aria-label="Private voice message"
    />
  ) : (
    <span>
      Voice message unavailable.
    </span>
  );
}

export default function ExpertChat() {
  const { sessionId: routeId } = useParams();

  const [params] = useSearchParams();

  const sessionId =
    routeId || params.get("sessionId");

  const { user } = useAuth();

  // Personal stars belong only to the User role.
  const canUseStars =
    user?.role === "user";

  const { socket } = useSocket();

  const [session, setSession] = useState(null);
  const [now, setNow] = useState(Date.now());

  const [profile, setProfile] =
    useState(undefined);

  const [unlocked, setUnlocked] =
    useState(isVaultUnlocked());

  const [passphrase, setPassphrase] =
    useState("");

  const [confirmation, setConfirmation] =
    useState("");

  const [peer, setPeer] = useState(null);

  const [rawMessages, setRawMessages] =
    useState([]);

  const [messages, setMessages] =
    useState([]);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const [recording, setRecording] =
    useState(false);

  const [joined, setJoined] =
    useState(false);

  const [typing, setTyping] =
    useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showRecovery, setShowRecovery] =
    useState(false);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const bottomRef = useRef(null);
  const peerRef = useRef(null);
  const activeRef = useRef(false);
  const joinedRef = useRef(false);

  const phase = phaseOf(session, now);
  const active = phase === "active";

  const recoveryKey = user?.uid
    ? `innervoice:recovery-reminder:${user.uid}`
    : null;

  peerRef.current = peer;
  activeRef.current = active;
  joinedRef.current = joined;

  useEffect(() => {
    const interval = setInterval(
      () => setNow(Date.now()),
      1000
    );

    return () => clearInterval(interval);
  }, []);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;

    const { data } = await api.get(
      `/sessions/${encodeURIComponent(sessionId)}`
    );

    setSession(data.session || null);
  }, [sessionId]);

  const loadHistory = useCallback(async () => {
    if (!sessionId) return;

    const { data } = await api.get(
      `/messages/${encodeURIComponent(sessionId)}`
    );

    setRawMessages(data.messages || []);
  }, [sessionId]);

  const initializeKeys = useCallback(async () => {
    if (!sessionId) return;

    let result = await getChatPeer(
      sessionId
    );

    if (!result.verified) {
      // Remember the first peer key.
      // Independent fingerprint verification
      // provides stronger identity assurance.
      trustChatPeer(
        result.peerUid,
        result.fingerprint
      );

      result = await getChatPeer(
        sessionId
      );
    }

    setPeer(result);

    await loadHistory();
  }, [sessionId, loadHistory]);

  useEffect(() => {
    let alive = true;

    setSession(null);
    setPeer(null);
    setRawMessages([]);
    setMessages([]);

    getVaultProfile()
      .then(value => {
        if (alive) {
          setProfile(value);

          if (
            value &&
            recoveryKey &&
            localStorage.getItem(recoveryKey) !==
              "dismissed"
          ) {
            setShowRecovery(true);
          }
        }
      })
      .catch(cause => {
        if (alive) {
          setError(errorText(cause));
        }
      });

    loadSession().catch(cause => {
      if (alive) {
        setError(errorText(cause));
      }
    });

    if (isVaultUnlocked()) {
      initializeKeys().catch(cause => {
        if (alive) {
          setError(errorText(cause));
        }
      });
    }

    return () => {
      alive = false;
    };
  }, [
    sessionId,
    loadSession,
    initializeKeys,
    recoveryKey
  ]);

  useEffect(() => {
    if (!unlocked) return;

    let alive = true;

    Promise.all(
      rawMessages.map(async item => {
        if (item.legacy) {
          return item;
        }

        try {
          return await decryptChat(item);
        } catch {
          return {
            ...item,
            failed: true,
            message:
              "Encrypted message unavailable."
          };
        }
      })
    )
      .then(items => {
        if (alive) {
          setMessages(items);
        }
      })
      .catch(cause => {
        if (alive) {
          setError(errorText(cause));
        }
      });

    return () => {
      alive = false;
    };
  }, [rawMessages, unlocked]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  useEffect(() => {
    if (!socket || !sessionId || !active) {
      return;
    }

    setJoined(false);

    const join = () => {
      setJoined(false);

      socket.emit(
        "join-session",
        sessionId
      );
    };

    const onJoined = data => {
      if (data?.sessionId === sessionId) {
        setJoined(true);
      }
    };

    const onDisconnect = () => {
      setJoined(false);
    };

    const onMessage = data => {
      if (data?.sessionId === sessionId) {
        setRawMessages(previous =>
          previous.some(
            item => item.id === data.id
          )
            ? previous
            : [...previous, data]
        );
      }
    };

    const onTyping = data => {
      if (
        data?.sessionId === sessionId &&
        data.userId !== user?.uid
      ) {
        setTyping(Boolean(data.isTyping));
      }
    };

    const onLocked = data => {
      if (data?.sessionId === sessionId) {
        setJoined(false);

        setError(
          data.message || "Session ended."
        );

        void loadSession();
      }
    };

    const onError = data => {
      setError(
        data?.message ||
        "Chat connection error."
      );
    };

    socket.on("connect", join);
    socket.on("disconnect", onDisconnect);

    socket.on("session-joined", onJoined);

    socket.on("chat-message", onMessage);
    socket.on("voice-message", onMessage);

    socket.on("typing", onTyping);
    socket.on("session-locked", onLocked);
    socket.on("socket-error", onError);

    if (socket.connected) {
      join();
    }

    return () => {
      socket.off("connect", join);
      socket.off("disconnect", onDisconnect);

      socket.off("session-joined", onJoined);

      socket.off("chat-message", onMessage);
      socket.off("voice-message", onMessage);

      socket.off("typing", onTyping);
      socket.off("session-locked", onLocked);
      socket.off("socket-error", onError);

      if (socket.connected) {
        socket.emit(
          "leave-session",
          sessionId
        );
      }

      joinedRef.current = false;
    };
  }, [
    socket,
    sessionId,
    active,
    user?.uid,
    loadSession
  ]);

  async function openVault(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      if (!profile) {
        if (
          passphrase.length < 16 ||
          passphrase !== confirmation
        ) {
          throw new Error(
            "Use a matching vault passphrase of 16+ characters."
          );
        }

        await createVault(passphrase);

        setProfile(await getVaultProfile());

        setShowRecovery(true);
      } else {
        await unlockVault(passphrase);
      }

      setPassphrase("");
      setConfirmation("");

      setUnlocked(true);

      await initializeKeys();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  const ready =
    unlocked &&
    Boolean(peer?.verified);

  const peerName = peer
    ? `${
        peer.peerRole === "expert"
          ? "Expert"
          : "User"
      } ${peer.peerLabel}`
    : "participant";

  async function send(
    type,
    body,
    mimeType = ""
  ) {
    const currentPeer = peerRef.current;

    if (
      !activeRef.current ||
      !socket?.connected ||
      !joinedRef.current ||
      !currentPeer?.verified
    ) {
      throw new Error(
        "Unlock your vault and connect to the active session first."
      );
    }

    const e2ee = await encryptChat({
      sessionId,
      senderId: user.uid,
      receiverId: currentPeer.peerUid,
      type,
      body,
      ownPublicKey: currentPeer.ownPublicKey,
      peerPublicKey: currentPeer.peerPublicKey
    });

    await new Promise((resolve, reject) => {
      socket.timeout(30000).emit(
        type === "voice"
          ? "voice-message"
          : "chat-message",

        {
          sessionId,
          e2ee,

          ...(type === "voice"
            ? { mimeType }
            : {})
        },

        (ackError, receipt) => {
          if (ackError) {
            reject(
              new Error(
                "Save confirmation timed out. Refresh before retrying."
              )
            );

            return;
          }

          if (!receipt?.success) {
            reject(
              new Error(
                receipt?.message ||
                "Message was not saved."
              )
            );

            return;
          }

          resolve(receipt.id);
        }
      );
    });
  }

  async function sendText(event) {
    event.preventDefault();

    const value = text.trim();

    if (
      !value ||
      busy ||
      value.length > 4000
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await send("text", value);

      setText("");

      socket.emit("typing", {
        sessionId,
        isTyping: false
      });
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  async function startVoice() {
    if (
      !ready ||
      !active ||
      !joined ||
      busy
    ) {
      return;
    }

    setError("");

    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        !window.MediaRecorder
      ) {
        throw new Error(
          "Voice messages require HTTPS and microphone access."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });

      streamRef.current = stream;

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4"
      ].find(type =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = new MediaRecorder(
        stream,
        {
          ...(mimeType ? { mimeType } : {}),
          audioBitsPerSecond: 24000
        }
      );

      recorderRef.current = recorder;

      const chunks = [];

      recorder.ondataavailable = event => {
        if (event.data?.size) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearTimeout(timerRef.current);

        stream
          .getTracks()
          .forEach(track => track.stop());

        streamRef.current = null;
        recorderRef.current = null;

        setRecording(false);

        if (!activeRef.current) {
          return;
        }

        const blob = new Blob(chunks, {
          type:
            recorder.mimeType ||
            "audio/webm"
        });

        if (
          !blob.size ||
          blob.size > 180000
        ) {
          setError(
            "Voice clip is empty or too large. Please record a shorter clip."
          );

          return;
        }

        setBusy(true);

        try {
          await send(
            "voice",
            await toDataUrl(blob),
            blob.type
          );

          setNotice(
            "Encrypted voice message saved."
          );
        } catch (cause) {
          setError(errorText(cause));
        } finally {
          setBusy(false);
        }
      };

      recorder.start(250);

      setRecording(true);

      timerRef.current = setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 15000);
    } catch (cause) {
      streamRef.current
        ?.getTracks()
        .forEach(track => track.stop());

      streamRef.current = null;

      setError(errorText(cause));
    }
  }

  function stopVoice() {
    if (
      recorderRef.current?.state === "recording"
    ) {
      recorderRef.current.stop();
    }
  }

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);

      if (
        recorderRef.current?.state === "recording"
      ) {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }

      streamRef.current
        ?.getTracks()
        .forEach(track => track.stop());
    },
    []
  );

  if (!sessionId) {
    return (
      <div className="page-shell">
        <div className="error-box">
          Choose a booked session first.
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE SESSION
          </span>

          <h1>
            {peer
              ? `Private chat with ${peerName}`
              : "Private support chat"}
          </h1>

          <p>
            {phase === "active"
              ? `Session active until ${
                  endOf(session)?.toLocaleString()
                }.`
              : phase === "upcoming"
                ? "Session has not started. History is read-only."
                : "Chat history is read-only outside the booked session."}
          </p>
        </div>

        <div className="button-row">
          {canUseStars && (
            <Link
              className="secondary-button"
              to="/starred"
            >
              ★ My stars
            </Link>
          )}

          <Link
            className="secondary-button"
            to="/vault-recovery"
          >
            Recovery Kit
          </Link>

          {active && (
            <Link
              className="primary-button"
              to={`/sessions/${encodeURIComponent(
                sessionId
              )}/call?mode=audio`}
            >
              🎧 Audio call
            </Link>
          )}
        </div>
      </header>

      {error && (
        <div
          className="error-box"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          className="notice-box"
          role="status"
        >
          {notice}
        </div>
      )}

      {!unlocked ? (
        <form
          className="feature-card"
          onSubmit={openVault}
          style={{
            maxWidth: 650,
            display: "grid",
            gap: 12
          }}
        >
          <h2>
            {profile === undefined
              ? "Checking private vault…"
              : profile
                ? "Unlock your vault"
                : "Create your vault"}
          </h2>

          <p>
            Use your own vault passphrase,
            not your account password.
            Never share it with the other participant.
          </p>

          <input
            className="form-input"
            type="password"
            autoComplete="off"
            minLength={16}
            required
            value={passphrase}
            onChange={event =>
              setPassphrase(event.target.value)
            }
            placeholder="Vault passphrase"
          />

          {profile === null && (
            <input
              className="form-input"
              type="password"
              autoComplete="off"
              minLength={16}
              required
              value={confirmation}
              onChange={event =>
                setConfirmation(event.target.value)
              }
              placeholder="Confirm passphrase"
            />
          )}

          <button
            className="primary-button"
            disabled={busy || profile === undefined}
          >
            {busy
              ? "Working…"
              : profile
                ? "Unlock vault"
                : "Create vault"}
          </button>

          {profile && (
            <Link to="/vault-recovery">
              Forgot passphrase? Open your Recovery Kit
            </Link>
          )}
        </form>
      ) : (
        <>
          {showRecovery && (
            <section
              className="feature-card"
              style={{ marginBottom: 16 }}
            >
              <h2>Protect your vault access</h2>

              <p>
                Create an encrypted Recovery Kit.
                Save its JSON file and 64-character
                code separately, then test recovery.
                Also test your passphrase on another
                trusted device. Account-password
                reset cannot unlock old messages.
              </p>

              <div className="button-row">
                <Link
                  className="primary-button"
                  to="/vault-recovery"
                >
                  Create & test Recovery Kit
                </Link>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    if (recoveryKey) {
                      localStorage.setItem(
                        recoveryKey,
                        "dismissed"
                      );
                    }

                    setShowRecovery(false);
                  }}
                >
                  Remind me later
                </button>
              </div>
            </section>
          )}

          <div
            className="button-row"
            style={{ marginBottom: 12 }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                lockVault();

                setUnlocked(false);
                setPeer(null);
                setMessages([]);
                setRawMessages([]);
              }}
            >
              Lock vault
            </button>

            {!peer && (
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  initializeKeys().catch(cause =>
                    setError(errorText(cause))
                  )
                }
              >
                Retry secure connection
              </button>
            )}
          </div>
        </>
      )}

      <section
        className="feature-card"
        style={{
          maxWidth: 950,
          margin: "16px auto"
        }}
      >
        <p>
          {peer
            ? `Chat partner: ${peerName}. Verify their encryption fingerprint independently for stronger identity assurance.`
            : "Both participants need their own vaults before messaging."}
        </p>

        <div
          className="chat-messages"
          role="log"
          style={{
            minHeight: 240,
            maxHeight: "55vh",
            overflowY: "auto",
            padding: 12
          }}
        >
          {!messages.length && (
            <p>No messages yet.</p>
          )}

          {messages.map(item => (
            <div
              key={item.id}
              style={{
                textAlign:
                  item.senderId === user?.uid
                    ? "right"
                    : "left",
                marginBottom: 16
              }}
            >
              <small>
                {item.senderId === user?.uid
                  ? "You"
                  : peerName}

                {" · "}

                {item.legacy
                  ? "Older server-encrypted"
                  : "Vault-encrypted"}
              </small>

              <div
                className="chat-bubble"
                style={{
                  textAlign: "left",
                  padding: 12,
                  borderRadius: 12,
                  background: "#fff5ed",
                  overflowWrap: "anywhere",
                  whiteSpace: "pre-wrap",
                  maxWidth: "85%",
                  marginTop: 5
                }}
              >
                {item.type === "voice" ? (
                  <VoiceMessage source={item.audio} />
                ) : (
                  item.message ||
                  "Message unavailable."
                )}
              </div>

              {canUseStars &&
                unlocked &&
                item.id &&
                !item.failed && (
                  <div style={{ marginTop: 7 }}>
                    <StarButton
                      kind="expert"
                      containerId={sessionId}
                      messageId={item.id}
                    />
                  </div>
                )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {typing && (
          <small>
            {peerName} is typing…
          </small>
        )}

        <form
          onSubmit={sendText}
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16
          }}
        >
          <input
            className="form-input"
            style={{
              flex: 1,
              minWidth: 0
            }}
            maxLength={4000}
            value={text}
            placeholder="Type your encrypted message…"
            disabled={
              !ready ||
              !active ||
              !joined ||
              busy
            }
            onChange={event => {
              setText(event.target.value);

              if (joined) {
                socket?.emit("typing", {
                  sessionId,
                  isTyping: Boolean(
                    event.target.value.trim()
                  )
                });
              }
            }}
          />

          <button
            type="submit"
            className="primary-button"
            disabled={
              !ready ||
              !active ||
              !joined ||
              busy ||
              !text.trim()
            }
          >
            Send
          </button>
        </form>

        <button
          type="button"
          className="secondary-button"
          style={{ marginTop: 12 }}
          disabled={
            !ready ||
            !active ||
            !joined ||
            (busy && !recording)
          }
          onClick={
            recording
              ? stopVoice
              : startVoice
          }
        >
          {recording
            ? "Stop recording"
            : "🎙 Encrypted voice message (max 15 sec)"}
        </button>
      </section>
    </div>
  );
}