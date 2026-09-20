
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { auth } from "../../services/firebase";
import api from "../../services/api";

import {
  createVault,
  getVaultProfile,
  unlockVault,
  isVaultUnlocked,
  lockVault,
  encryptAiMessage,
  decryptAiMessage
} from "../../services/privateVault";

import StarButton from "../../components/chat/StarButton";
import "./AIChat.css";

const getError = error =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong.";

const formatTime = value => {
  const date = new Date(value || 0);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
};

function uniqueMessages(items) {
  return [
    ...new Map(
      items.map((item, index) => [
        item.id || `missing-${index}`,
        item
      ])
    ).values()
  ];
}

export default function AIChat() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const [profile, setProfile] = useState(undefined);
  const [unlocked, setUnlocked] = useState(
    isVaultUnlocked()
  );

  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [conversationId, setConversationId] =
    useState(null);
  const [messages, setMessages] = useState([]);

  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showRecoveryStep, setShowRecoveryStep] =
    useState(false);

  const sendingRef = useRef(false);
  const conversationRef = useRef(null);
  const bottomRef = useRef(null);

  const storageKey = user?.uid
    ? `innervoice-ai-v2:${user.uid}`
    : null;

  const recoveryReminderKey = user?.uid
    ? `innervoice:recovery-reminder:${user.uid}`
    : null;

  const urlConversationId = params.get("conversationId");

  async function loadConversation(id) {
    const { data } = await api.get(
      `/ai/conversations/${encodeURIComponent(id)}`
    );

    const entries = await Promise.all(
      uniqueMessages(data.messages || []).map(async item => {
        if (item.legacy) {
          return item;
        }

        try {
          return {
            ...item,
            ...(await decryptAiMessage(id, item))
          };
        } catch {
          return {
            ...item,
            damaged: true,
            content:
              "This encrypted message could not be unlocked."
          };
        }
      })
    );

    setMessages(uniqueMessages(entries));
    setConversationId(id);
    conversationRef.current = id;

    if (storageKey) {
      sessionStorage.setItem(storageKey, id);
    }
  }

  useEffect(() => {
    let active = true;

    if (!user?.uid) {
      return undefined;
    }

    (async () => {
      try {
        if (typeof auth.authStateReady === "function") {
          await auth.authStateReady();
        }

        if (
          !auth.currentUser ||
          auth.currentUser.uid !== user.uid
        ) {
          throw new Error(
            "Authentication is not ready. Sign in again."
          );
        }

        await auth.currentUser.getIdToken();

        const result = await getVaultProfile();

        if (active) {
          setProfile(result);

          if (
            result &&
            recoveryReminderKey &&
            localStorage.getItem(recoveryReminderKey) !==
              "dismissed"
          ) {
            setShowRecoveryStep(true);
          }
        }
      } catch (cause) {
        if (active) {
          setError(getError(cause));
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.uid, recoveryReminderKey]);

  useEffect(() => {
    if (!unlocked || !storageKey) {
      return;
    }

    const id =
      urlConversationId ||
      sessionStorage.getItem(storageKey);

    if (!id) {
      setMessages([]);
      setConversationId(null);
      conversationRef.current = null;
      return;
    }

    loadConversation(id).catch(cause => {
      setError(getError(cause));
    });
  }, [unlocked, storageKey, urlConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

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
            "Use a matching passphrase of at least 16 characters."
          );
        }

        await createVault(passphrase);
        setProfile(await getVaultProfile());
        setShowRecoveryStep(true);
      } else {
        await unlockVault(passphrase);
      }

      setPassphrase("");
      setConfirmation("");
      setUnlocked(true);
    } catch (cause) {
      setError(getError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function createConversation() {
    const { data } = await api.post(
      "/ai/conversations"
    );

    if (!data?.conversationId) {
      throw new Error(
        "Could not create conversation."
      );
    }

    const id = data.conversationId;

    conversationRef.current = id;
    setConversationId(id);

    if (storageKey) {
      sessionStorage.setItem(storageKey, id);
    }

    setParams(
      { conversationId: id },
      { replace: true }
    );

    return id;
  }

  async function storeMessage(id, role, content) {
    const messageId = crypto.randomUUID();

    const e2ee = await encryptAiMessage(
      id,
      messageId,
      role,
      content
    );

    await api.post(
      `/ai/conversations/${encodeURIComponent(id)}/messages`,
      {
        id: messageId,
        role,
        e2ee
      }
    );

    return {
      id: messageId,
      role,
      content,
      createdAt: new Date().toISOString()
    };
  }

  async function send(event) {
    event.preventDefault();

    const clean = text.trim();

    if (
      !clean ||
      !consent ||
      !isVaultUnlocked() ||
      busy ||
      sendingRef.current
    ) {
      return;
    }

    sendingRef.current = true;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const id =
        conversationRef.current ||
        (await createConversation());

      const history = messages
        .filter(
          message =>
            !message.damaged &&
            ["user", "assistant"].includes(message.role)
        )
        .slice(-8)
        .map(message => ({
          role: message.role,
          content: String(
            message.content || ""
          ).slice(0, 2000)
        }));

      const savedUserMessage = await storeMessage(
        id,
        "user",
        clean
      );

      setMessages(previous =>
        uniqueMessages([
          ...previous,
          savedUserMessage
        ])
      );

      setText("");

      const { data } = await api.post(
        "/ai/chat",
        {
          conversationId: id,
          message: clean,
          history,
          aiProcessingConsent: true
        },
        { timeout: 45000 }
      );

      if (
        !data?.success ||
        typeof data.response !== "string" ||
        !data.response.trim()
      ) {
        throw new Error(
          "AI response was not returned. Refresh before retrying."
        );
      }

      const savedReply = await storeMessage(
        id,
        "assistant",
        data.response
      );

      setMessages(previous =>
        uniqueMessages([
          ...previous,
          savedReply
        ])
      );

      if (data.fallback) {
        setNotice(
          "Gemini was unavailable. A fallback response was saved."
        );
      }
    } catch (cause) {
      setError(getError(cause));

      if (conversationRef.current) {
        await loadConversation(
          conversationRef.current
        ).catch(() => {});
      }
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }

  function startNewConversation() {
    if (busy) return;

    if (
      !window.confirm(
        "Start a new private conversation?"
      )
    ) {
      return;
    }

    if (storageKey) {
      sessionStorage.removeItem(storageKey);
    }

    conversationRef.current = null;

    setConversationId(null);
    setMessages([]);
    setText("");

    setParams({}, { replace: true });
  }

  return (
    <div className="page-shell iv-ai-page">
      <header className="iv-ai-page-header">
        <div>
          <span className="eyebrow">
            PRIVATE AI COMPANION
          </span>

          <h1>AI Support</h1>

          <p>
            Your saved chat history uses your private vault.
            InnerVoice and Gemini process readable text to reply.
          </p>
        </div>

        <button
          type="button"
          className="iv-ai-new-chat"
          disabled={!unlocked || busy}
          onClick={startNewConversation}
        >
          ＋ New chat
        </button>
      </header>

      {error && (
        <div
          className="iv-ai-error"
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
            maxWidth: 630,
            display: "grid",
            gap: 14
          }}
        >
          <h2>
            {profile === undefined
              ? "Checking private vault…"
              : profile
                ? "Unlock AI history"
                : "Create private vault"}
          </h2>

          <p>
            Use the same passphrase as your Journal.
            Your Recovery Kit can help if you forget it.
          </p>

          <input
            className="form-input"
            type="password"
            required
            minLength={16}
            autoComplete="off"
            value={passphrase}
            placeholder="Vault passphrase"
            onChange={event =>
              setPassphrase(event.target.value)
            }
          />

          {profile === null && (
            <input
              className="form-input"
              type="password"
              required
              minLength={16}
              autoComplete="off"
              value={confirmation}
              placeholder="Confirm passphrase"
              onChange={event =>
                setConfirmation(event.target.value)
              }
            />
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={busy || profile === undefined}
          >
            {busy
              ? "Working…"
              : profile
                ? "Unlock vault"
                : "Create vault"}
          </button>

          {profile && (
            <Link
              to="/vault-recovery"
              className="secondary-button"
            >
              Forgot passphrase? Use Recovery Kit
            </Link>
          )}
        </form>
      ) : (
        <>
          {showRecoveryStep && (
            <section
              className="feature-card"
              style={{
                marginBottom: 18,
                border: "1px solid #dfbd96",
                background: "#fff8ed"
              }}
            >
              <span className="eyebrow">
                IMPORTANT · VAULT RECOVERY
              </span>

              <h2>
                Protect access to your private messages
              </h2>

              <p>
                Create an encrypted Recovery Kit while you
                remember your passphrase. Save the JSON file
                and its 64-character recovery code separately,
                then test that the kit unlocks your existing vault.
              </p>

              <p>
                Also test the same passphrase on another trusted
                device. Account-password reset will not unlock
                your encrypted history.
              </p>

              <div className="button-row">
                <Link
                  className="primary-button"
                  to="/vault-recovery"
                >
                  Create and test Recovery Kit →
                </Link>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    if (recoveryReminderKey) {
                      localStorage.setItem(
                        recoveryReminderKey,
                        "dismissed"
                      );
                    }

                    setShowRecoveryStep(false);
                  }}
                >
                  Remind me later
                </button>
              </div>
            </section>
          )}

          <section className="iv-ai-chat-window">
            <div className="iv-ai-chat-topbar">
              <span className="iv-ai-bot-avatar">
                ✦
              </span>

              <div className="iv-ai-bot-info">
                <strong>
                  InnerVoice AI
                </strong>

                <span>
                  Text-based support
                </span>
              </div>

              <Link
                className="secondary-button"
                to="/starred"
              >
                ★ Starred messages
              </Link>

              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  lockVault();
                  setUnlocked(false);
                  setMessages([]);
                  setText("");
                }}
              >
                Lock vault
              </button>
            </div>

            {messages.some(item => item.legacy) && (
              <div className="warning-box">
                Older messages still use server-held encryption.
                Do not delete them before a verified migration.
              </div>
            )}

            <div
              className="iv-ai-messages"
              role="log"
              style={{
                minHeight: 270,
                maxHeight: "53vh",
                overflowY: "auto"
              }}
            >
              {!messages.length && (
                <p style={{ padding: 18 }}>
                  You can write whatever is on your mind.
                </p>
              )}

              {messages.map((message, index) => (
                <div
                  key={message.id || `message-${index}`}
                  className={`iv-ai-message-row iv-ai-message-row-${
                    message.role === "user"
                      ? "user"
                      : "bot"
                  }`}
                >
                  {/* No extra Y avatar beside a user message. */}
                  {message.role !== "user" && (
                    <span
                      className="iv-ai-message-avatar"
                      aria-hidden="true"
                    >
                      ✦
                    </span>
                  )}

                  <div className="iv-ai-message-body">
                    <div className="iv-ai-sender">
                      <strong>
                        {message.role === "user"
                          ? "You"
                          : "InnerVoice AI"}
                      </strong>

                      <time>
                        {formatTime(message.createdAt)}
                      </time>
                    </div>

                    <div
                      className={`iv-ai-bubble iv-ai-${
                        message.role === "user"
                          ? "user"
                          : "bot"
                      }-bubble`}
                      style={{
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      {message.content}
                    </div>

                    {!message.damaged &&
                      message.id &&
                      conversationId && (
                        <div style={{ marginTop: 7 }}>
                          <StarButton
                            kind="ai"
                            containerId={conversationId}
                            messageId={message.id}
                          />
                        </div>
                      )}
                  </div>
                </div>
              ))}

              <div ref={bottomRef} />
            </div>

            <label
              style={{
                display: "flex",
                gap: 10,
                padding: "13px 17px",
                lineHeight: 1.6,
                fontSize: 13
              }}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={event =>
                  setConsent(event.target.checked)
                }
              />

              <span>
                I agree that my message and recent context
                may be processed by InnerVoice and Google
                Gemini. Saved history uses my vault. This
                is not a live emergency service.
              </span>
            </label>

            <form
              className="iv-ai-compose"
              onSubmit={send}
            >
              <label
                className="iv-ai-compose-label"
                htmlFor="ai-message"
              >
                Your message
              </label>

              <textarea
                id="ai-message"
                value={text}
                maxLength={4000}
                rows={3}
                disabled={busy}
                placeholder="Type your message…"
                onChange={event =>
                  setText(event.target.value)
                }
              />

              <div className="iv-ai-compose-footer">
                <small className="iv-ai-compose-hint">
                  Your vault key is not sent to Gemini.
                </small>

                <div className="iv-ai-compose-actions">
                  <button
                    type="submit"
                    className="iv-ai-send-button"
                    disabled={
                      busy ||
                      !consent ||
                      !text.trim()
                    }
                  >
                    {busy
                      ? "Waiting for reply…"
                      : "Send message →"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </>
      )}

      <section
        className="iv-ai-support-strip"
        aria-labelledby="iv-ai-human-help"
      >
        <div className="iv-ai-support-strip__content">
          <span
            className="iv-ai-support-strip__icon"
            aria-hidden="true"
          >
            ♡
          </span>

          <div className="iv-ai-support-strip__text">
            <span className="eyebrow">
              HUMAN SUPPORT
            </span>

            <h2 id="iv-ai-human-help">
              Want to speak with an expert?
            </h2>

            <p>
              Book a private session with a verified
              professional whenever you need human support.
            </p>
          </div>
        </div>

        <div className="iv-ai-support-strip__actions">
          <Link
            className="iv-ai-support-strip__button"
            to="/experts"
          >
            Find an expert →
          </Link>

          <p className="iv-ai-support-strip__note">
            In immediate danger? Contact local emergency
            services or someone you trust.
          </p>
        </div>
      </section>
    </div>
  );
}