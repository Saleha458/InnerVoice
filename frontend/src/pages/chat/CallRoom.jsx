import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  useSocket,
} from "../../context/SocketContext";

import api from "../../services/api";

import {
  auth,
} from "../../services/firebase";


const getAuthConfig = async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const token = await user.getIdToken();

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};


// Handles Firestore Timestamp objects,
// normal dates, strings and milliseconds.
const toDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value?.toDate === "function"
  ) {
    return value.toDate();
  }

  if (
    typeof value === "object"
  ) {
    const seconds =
      value.seconds ??
      value._seconds;

    const nanoseconds =
      value.nanoseconds ??
      value._nanoseconds ??
      0;

    if (
      Number.isFinite(
        Number(seconds)
      )
    ) {
      return new Date(
        Number(seconds) * 1000 +
          Math.floor(
            Number(nanoseconds) / 1000000
          )
      );
    }
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};


const formatTime = (value) => {
  const date = toDate(value);

  if (!date) {
    return "";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};


export default function ExpertChat() {
  const {
    sessionId: routeSessionId,
  } = useParams();

  const [
    searchParams,
  ] = useSearchParams();

  // Supports BOTH:
  // /session-chat/:sessionId
  // /expert/messages?sessionId=...
  const sessionId =
    routeSessionId ||
    searchParams.get("sessionId");

  const {
    socket,
  } = useSocket();

  const [
    session,
    setSession,
  ] = useState(null);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    typing,
    setTyping,
  ] = useState(false);

  const [
    recording,
    setRecording,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const recorderRef =
    useRef(null);

  const chunksRef =
    useRef([]);

  const recordingTimerRef =
    useRef(null);

  const endRef =
    useRef(null);


  // =========================================================
  // LOAD SESSION
  // =========================================================

  const loadSession =
    useCallback(
      async () => {
        if (!sessionId) {
          return;
        }

        try {
          const response =
            await api.get(
              `/sessions/${sessionId}`,
              await getAuthConfig()
            );

          setSession(
            response.data?.session ||
              null
          );
        } catch (err) {
          console.error(
            "Load session:",
            err
          );

          setError(
            err?.response?.data
              ?.message ||
              "Could not load this session."
          );
        }
      },
      [sessionId]
    );


  // =========================================================
  // LOAD OLD MESSAGES
  // =========================================================

  const loadHistory =
    useCallback(
      async () => {
        if (!sessionId) {
          return;
        }

        try {
          const response =
            await api.get(
              `/messages/${sessionId}`,
              await getAuthConfig()
            );

          const history =
            Array.isArray(
              response.data?.messages
            )
              ? response.data.messages
              : [];

          setMessages(history);
        } catch (err) {
          console.error(
            "Load messages:",
            err
          );

          setError(
            err?.response?.data
              ?.message ||
              "Could not load conversation."
          );
        } finally {
          setLoading(false);
        }
      },
      [sessionId]
    );


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadSession();
    loadHistory();
  }, [
    loadSession,
    loadHistory,
  ]);


  // =========================================================
  // SOCKET CONNECTION
  // =========================================================

  useEffect(() => {
    if (
      !socket ||
      !sessionId
    ) {
      return;
    }

    setError("");

    socket.emit(
      "join-session",
      sessionId
    );


    const handleChatMessage =
      (data) => {
        if (
          data?.sessionId !==
          sessionId
        ) {
          return;
        }

        setMessages(
          (previous) => {
            // Avoid duplicate live message.
            if (
              data.id &&
              previous.some(
                (item) =>
                  item.id === data.id
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              data,
            ];
          }
        );
      };


    const handleVoiceMessage =
      (data) => {
        if (
          data?.sessionId !==
          sessionId
        ) {
          return;
        }

        setMessages(
          (previous) => {
            if (
              data.id &&
              previous.some(
                (item) =>
                  item.id === data.id
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              data,
            ];
          }
        );
      };


    const handleTyping =
      (data) => {
        setTyping(
          Boolean(
            data?.isTyping
          )
        );
      };


    const handleSocketError =
      (data) => {
        setError(
          data?.message ||
            "Session communication error."
        );
      };


    socket.on(
      "chat-message",
      handleChatMessage
    );

    socket.on(
      "voice-message",
      handleVoiceMessage
    );

    socket.on(
      "typing",
      handleTyping
    );

    socket.on(
      "socket-error",
      handleSocketError
    );


    return () => {
      socket.off(
        "chat-message",
        handleChatMessage
      );

      socket.off(
        "voice-message",
        handleVoiceMessage
      );

      socket.off(
        "typing",
        handleTyping
      );

      socket.off(
        "socket-error",
        handleSocketError
      );
    };
  }, [
    socket,
    sessionId,
  ]);


  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);


  // =========================================================
  // SEND TEXT MESSAGE
  // =========================================================

  const sendMessage =
    () => {
      const clean =
        message.trim();

      if (
        !clean ||
        !socket ||
        !sessionId
      ) {
        return;
      }

      socket.emit(
        "chat-message",
        {
          sessionId,
          message: clean,
        }
      );

      socket.emit(
        "typing",
        {
          sessionId,
          isTyping: false,
        }
      );

      setMessage("");
      setTyping(false);
    };


  // =========================================================
  // TYPING
  // =========================================================

  const handleTyping =
    (value) => {
      setMessage(value);

      if (!socket || !sessionId) {
        return;
      }

      socket.emit(
        "typing",
        {
          sessionId,
          isTyping:
            Boolean(
              value.trim()
            ),
        }
      );
    };


  // =========================================================
  // KEYBOARD
  // =========================================================

  const handleKeyDown =
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        sendMessage();
      }
    };


  // =========================================================
  // START VOICE RECORDING
  // =========================================================

  const startRecording =
    async () => {
      if (
        recording ||
        !socket ||
        !sessionId
      ) {
        return;
      }

      try {
        setError("");

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices
            .getUserMedia
        ) {
          throw new Error(
            "Voice recording is not supported in this browser."
          );
        }

        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              audio: true,
            });


        let mimeType =
          "audio/webm;codecs=opus";

        if (
          !MediaRecorder.isTypeSupported(
            mimeType
          )
        ) {
          mimeType = "audio/webm";
        }

        if (
          !MediaRecorder.isTypeSupported(
            mimeType
          )
        ) {
          mimeType = "";
        }


        const recorder =
          mimeType
            ? new MediaRecorder(
                stream,
                { mimeType }
              )
            : new MediaRecorder(
                stream
              );


        recorderRef.current =
          recorder;

        chunksRef.current = [];


        recorder.ondataavailable =
          (event) => {
            if (
              event.data &&
              event.data.size > 0
            ) {
              chunksRef.current.push(
                event.data
              );
            }
          };


        recorder.onstop =
          () => {
            const blob =
              new Blob(
                chunksRef.current,
                {
                  type:
                    recorder.mimeType ||
                    "audio/webm",
                }
              );


            if (
              blob.size === 0
            ) {
              stream
                .getTracks()
                .forEach(
                  (track) =>
                    track.stop()
                );

              return;
            }


            // Backend has a size limit.
            if (
              blob.size >
              1.5 * 1024 * 1024
            ) {
              setError(
                "Voice message is too large. Please record a shorter message."
              );

              stream
                .getTracks()
                .forEach(
                  (track) =>
                    track.stop()
                );

              return;
            }


            const reader =
              new FileReader();


            reader.onloadend =
              () => {
                const result =
                  reader.result;

                if (
                  typeof result !==
                  "string"
                ) {
                  return;
                }

                socket.emit(
                  "voice-message",
                  {
                    sessionId,
                    audio: result,
                    mimeType:
                      blob.type ||
                      "audio/webm",
                  }
                );
              };


            reader.readAsDataURL(
              blob
            );


            stream
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );
          };


        recorder.start();

        setRecording(true);


        recordingTimerRef.current =
          window.setTimeout(
            () => {
              if (
                recorder.state ===
                "recording"
              ) {
                recorder.stop();
              }

              setRecording(false);
            },
            30000
          );
      } catch (err) {
        console.error(
          "Voice recording:",
          err
        );

        setRecording(false);

        setError(
          err?.message ||
            "Microphone permission is required."
        );
      }
    };


  // =========================================================
  // STOP RECORDING
  // =========================================================

  const stopRecording =
    () => {
      if (
        recordingTimerRef.current
      ) {
        clearTimeout(
          recordingTimerRef.current
        );

        recordingTimerRef.current =
          null;
      }


      const recorder =
        recorderRef.current;

      if (
        recorder &&
        recorder.state ===
          "recording"
      ) {
        recorder.stop();
      }

      setRecording(false);
    };


  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      if (
        recordingTimerRef.current
      ) {
        clearTimeout(
          recordingTimerRef.current
        );
      }

      const recorder =
        recorderRef.current;

      if (
        recorder &&
        recorder.state ===
          "recording"
      ) {
        recorder.stop();
      }
    };
  }, []);


  // =========================================================
  // NO SESSION
  // =========================================================

  if (!sessionId) {
    return (
      <div className="page-shell">
        <div className="error-box">
          No session was selected.
          Please open chat from a
          confirmed session.
        </div>
      </div>
    );
  }


  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="page-shell">

      <div className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE SESSION
          </span>

          <h1>
            Private Support Chat
          </h1>

          <p>
            {session
              ? "Your secure session space is ready."
              : "Loading your private session..."}
          </p>
        </div>


        <div className="button-row">

          <Link
            className="secondary-button"
            to={`/sessions/${sessionId}/call?mode=audio`}
          >
            🎧 Audio
          </Link>


          <Link
            className="primary-button"
            to={`/sessions/${sessionId}/call?mode=video`}
          >
            📹 Video
          </Link>

        </div>
      </div>


      {error && (
        <div
          className="error-box"
          role="alert"
        >
          {error}
        </div>
      )}


      <section
        className="feature-card"
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >

        <div
          className="chat-messages"
          style={{
            minHeight: 420,
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >

          {loading && (
            <div className="empty-card">
              Loading conversation...
            </div>
          )}


          {!loading &&
            messages.length === 0 && (
              <div className="empty-card">
                <h3>
                  No messages yet
                </h3>

                <p>
                  Start the conversation
                  when you are ready.
                </p>
              </div>
            )}


          {messages.map(
            (item, index) => {
              const mine =
                item.senderId ===
                auth.currentUser?.uid;


              const key =
                item.id ||
                `${item.senderId || "message"}-${item.createdAt || "time"}-${index}`;


              return (
                <div
                  key={key}
                  className={`chat-bubble ${
                    mine
                      ? "user"
                      : "assistant"
                  }`}
                >

                  {item.type ===
                      "voice" ||
                  item.audio ? (
                    <audio
                      controls
                      src={
                        item.audio
                      }
                    />
                  ) : (
                    <span>
                      {item.message}
                    </span>
                  )}


                  <small>
                    {formatTime(
                      item.createdAt
                    )}
                  </small>

                </div>
              );
            }
          )}


          <div
            ref={endRef}
          />

        </div>


        {typing && (
          <small>
            The other participant is
            typing…
          </small>
        )}


        <div
          className="chat-compose"
          style={{
            marginTop: 16,
          }}
        >

          <input
            className="form-input"
            value={message}
            onChange={(event) =>
              handleTyping(
                event.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            placeholder="Write a message…"
            maxLength={4000}
            disabled={!socket}
          />


          <div className="button-row">

            <button
              className="primary-button"
              type="button"
              onClick={sendMessage}
              disabled={
                !message.trim() ||
                !socket
              }
            >
              Send
            </button>


            {!recording ? (
              <button
                className="secondary-button"
                type="button"
                onClick={
                  startRecording
                }
                disabled={!socket}
              >
                🎙 Voice message
              </button>
            ) : (
              <button
                className="danger-button"
                type="button"
                onClick={
                  stopRecording
                }
              >
                Stop recording
              </button>
            )}

          </div>

        </div>


        <div
          className="notice-box"
          style={{
            marginTop: 16,
          }}
        >
          Messages are encrypted before
          being stored. Only participants
          with access to this session can
          retrieve them.
        </div>

      </section>

    </div>
  );
}