import { useEffect, useRef, useState } from "react";
import { auth } from "../../services/firebase";
import api from "../../services/api";

const STORAGE_KEY = "innervoice_ai_chat";
const EXIT_KEY = "innervoice_quick_exit";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "I'm here with you. You can tell me what's on your mind, at your own pace.",
  createdAt: new Date().toISOString(),
};

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const endRef = useRef(null);

  /*
   * Restore AI conversation.
   *
   * Quick Exit settings are intentionally NOT stored here.
   * Quick Exit belongs only to UserDashboard.
   */
  useEffect(() => {
    try {
      const saved =
        sessionStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (
          Array.isArray(parsed.messages) &&
          parsed.messages.length > 0
        ) {
          setMessages(parsed.messages);
        } else {
          setMessages([WELCOME_MESSAGE]);
        }

        if (parsed.conversationId) {
          setConversationId(
            parsed.conversationId
          );
        }
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
    } catch (err) {
      console.error(
        "Could not restore AI chat:",
        err
      );

      setMessages([WELCOME_MESSAGE]);
    }
  }, []);

  /*
   * Save conversation locally.
   *
   * This allows the user to leave and later continue
   * the conversation from where they stopped.
   */
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          messages,
          conversationId,
        })
      );
    } catch (err) {
      console.warn(
        "Could not save AI chat:",
        err
      );
    }
  }, [messages, conversationId]);

  /*
   * Keep newest message visible.
   */
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, loading]);

  /*
   * Send text message to backend.
   */
  const sendMessage = async (
    value = text
  ) => {
    const message = String(value).trim();

    if (!message || loading) {
      return;
    }

    setText("");
    setError("");

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      createdAt:
        new Date().toISOString(),
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setLoading(true);

    try {
      const token =
        await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error(
          "Authentication session expired. Please login again."
        );
      }

      const response = await api.post(
        "/ai/chat",
        {
          message,
          conversationId,
          notifyWhenReady: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 15000,
        }
      );

      const data = response.data || {};

      setConversationId(
        data.conversationId ||
          conversationId
      );

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          data.response ||
          "I'm listening. Tell me a little more.",
        risk: data.risk || {
          level: "none",
          detected: false,
        },
        createdAt:
          new Date().toISOString(),
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      /*
       * If backend returns a severe risk level,
       * keep the information attached to the message.
       *
       * The UI below will show the appropriate
       * professional-support guidance.
       */
    } catch (err) {
      console.error(
        "AI chat error:",
        err
      );

      const backendMessage =
        err?.response?.data?.message;

      setError(
        backendMessage ||
          "InnerVoice could not reply right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Start browser voice recording.
   *
   * This records a voice message locally.
   */
  const startRecording = async () => {
    try {
      setError("");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        throw new Error(
          "Voice recording is not supported by this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      const recorder =
        new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          chunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(
          chunksRef.current,
          {
            type:
              recorder.mimeType ||
              "audio/webm",
          }
        );

        const audioUrl =
          URL.createObjectURL(blob);

        const voiceMessage = {
          id: `voice-${Date.now()}`,
          role: "user",
          content: "Voice message",
          audio: audioUrl,
          createdAt:
            new Date().toISOString(),
        };

        setMessages((current) => [
          ...current,
          voiceMessage,
        ]);

        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
      };

      recorder.onerror = () => {
        setError(
          "Voice recording could not be completed."
        );

        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
      };

      recorder.start();

      setRecording(true);
    } catch (err) {
      console.error(
        "Voice recording error:",
        err
      );

      setError(
        "Microphone access was not allowed. Click the microphone icon in your browser address bar and choose Allow."
      );

      setRecording(false);
    }
  };

  /*
   * Stop voice recording.
   */
  const stopRecording = () => {
    const recorder =
      recorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }

    setRecording(false);
  };

  /*
   * Clear current AI conversation.
   */
  const clearConversation = () => {
    const confirmed =
      window.confirm(
        "Clear this AI conversation from this device?"
      );

    if (!confirmed) {
      return;
    }

    const newWelcome = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content:
        "I'm here with you. You can start a new conversation whenever you're ready.",
      createdAt:
        new Date().toISOString(),
    };

    setMessages([newWelcome]);
    setConversationId(null);
    setError("");

    sessionStorage.removeItem(
      STORAGE_KEY
    );

    /*
     * We don't remove the user's Quick Exit
     * preference because that belongs to
     * UserDashboard.
     */
  };

  /*
   * Cleanup microphone if component unmounts.
   */
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        try {
          if (
            recorderRef.current.state !==
            "inactive"
          ) {
            recorderRef.current.stop();
          }
        } catch {
          // Ignore cleanup errors.
        }
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, []);

  return (
    <div className="page-shell ai-chat-page">

      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <div className="page-header ai-chat-header">
        <div>
          <span className="eyebrow">
            PRIVATE AI COMPANION
          </span>

          <h1>AI Chat</h1>

          <p>
            A calm, private space to talk,
            reflect and get supportive
            guidance.
          </p>
        </div>

        {/*
         * IMPORTANT:
         *
         * Quick Exit intentionally does NOT
         * appear here.
         *
         * Requirement:
         * Quick Exit is only on UserDashboard.
         */}
      </div>

      {/* =========================================
          CHAT TOOLBAR
      ========================================= */}

      <div className="ai-chat-toolbar">

        <div className="ai-chat-toolbar-info">
          <span className="toolbar-icon">
            ✦
          </span>

          <div>
            <strong>
              A private conversation
            </strong>

            <p>
              Your conversation stays available
              on this device so you can continue
              where you left off.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={clearConversation}
        >
          New Chat
        </button>
      </div>

      {/* =========================================
          CHAT CARD
      ========================================= */}

      <div className="chat-card">

        {/* =====================================
            MESSAGES
        ===================================== */}

        <div className="chat-messages">

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-bubble ${message.role}`}
            >
              <div className="chat-message-content">
                {message.content}
              </div>

              {/* Voice message */}
              {message.audio && (
                <audio
                  controls
                  src={message.audio}
                  className="voice-message-player"
                />
              )}

              {/* =================================
                  CRITICAL / CRISIS
              ================================= */}

              {message.role ===
                "assistant" &&
                (
                  message.risk?.level ===
                    "crisis" ||
                  message.risk?.level ===
                    "critical"
                ) && (
                  <div className="warning-box crisis-warning">
                    <strong>
                      You deserve immediate
                      support.
                    </strong>

                    <p>
                      What you're describing
                      sounds serious. Please
                      reach out to someone you
                      trust and seek immediate
                      professional or emergency
                      support if you may act on
                      these thoughts.
                    </p>

                    <p>
                      InnerVoice AI cannot safely
                      handle a crisis alone.
                    </p>
                  </div>
                )}

              {/* =================================
                  HIGH RISK
              ================================= */}

              {message.role ===
                "assistant" &&
                message.risk?.level ===
                  "high" && (
                  <div className="warning-box high-warning">
                    <strong>
                      Consider professional
                      support.
                    </strong>

                    <p>
                      This sounds important
                      enough to discuss with a
                      trusted person or qualified
                      professional.
                    </p>

                    <button
                      type="button"
                      className="warning-action"
                      onClick={() =>
                        (window.location.href =
                          "/experts")
                      }
                    >
                      Find a verified expert →
                    </button>
                  </div>
                )}

              {/* =================================
                  MODERATE RISK
              ================================= */}

              {message.role ===
                "assistant" &&
                message.risk?.level ===
                  "moderate" && (
                  <div className="support-note">
                    <strong>
                      You don't have to handle
                      everything alone.
                    </strong>

                    <p>
                      If these feelings continue,
                      consider talking with
                      someone you trust or a
                      qualified professional.
                    </p>
                  </div>
                )}
            </div>
          ))}

          {/* =====================================
              TYPING
          ===================================== */}

          {loading && (
            <div className="chat-bubble assistant typing">
              <span className="typing-dots">
                <span />
                <span />
                <span />
              </span>

              InnerVoice is thinking…
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* =====================================
            COMPOSER
        ===================================== */}

        <div className="chat-compose">

          <textarea
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {
                e.preventDefault();

                if (!loading) {
                  sendMessage();
                }
              }
            }}
            placeholder="Tell InnerVoice what's on your mind..."
            rows={3}
            disabled={loading}
            aria-label="AI message"
          />

          <div className="chat-compose-footer">

            <span className="compose-hint">
              Press Enter to send · Shift +
              Enter for a new line
            </span>

            <div className="chat-actions">

              <button
                type="button"
                className={
                  recording
                    ? "danger-button"
                    : "secondary-button"
                }
                onClick={
                  recording
                    ? stopRecording
                    : startRecording
                }
                disabled={loading}
              >
                {recording
                  ? "⏹ Stop Recording"
                  : "🎙 Voice Message"}
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  sendMessage()
                }
                disabled={
                  loading ||
                  !text.trim()
                }
              >
                {loading
                  ? "Sending..."
                  : "Send"}
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          ERROR
      ========================================= */}

      {error && (
        <div
          className="error-box ai-chat-error"
          role="alert"
        >
          <span>!</span>
          {error}
        </div>
      )}

      {/* =========================================
          PRIVACY NOTE
      ========================================= */}

      <div className="ai-privacy-note">
        <span>🔒</span>

        <div>
          <strong>
            Your conversation is private
          </strong>

          <p>
            InnerVoice is designed to keep
            your experience anonymous and
            private.
          </p>
        </div>
      </div>

    </div>
  );
};

export default AIChat;