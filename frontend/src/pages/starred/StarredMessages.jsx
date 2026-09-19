import {
  useEffect,
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import {
  isVaultUnlocked
} from "../../services/privateVault";

import {
  listStars,
  removeStar,
  resolveStar
} from "../../services/starredService";

export default function StarredMessages() {
  const [stars, setStars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const unlocked = isVaultUnlocked();

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const references = await listStars();

      const items = await Promise.all(
        references.map(async star => {
          try {
            return {
              ...star,
              resolved: await resolveStar(
                star
              )
            };
          } catch {
            return {
              ...star,
              failed: true
            };
          }
        })
      );

      setStars(items);
    } catch (cause) {
      setError(
        cause?.response?.data?.message ||
        cause.message
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (unlocked) {
      void refresh();
    } else {
      setLoading(false);
    }
  }, [unlocked]);

  async function unstar(id) {
    setBusy(id);
    setError("");

    try {
      await removeStar(id);

      setStars(previous =>
        previous.filter(
          star => star.id !== id
        )
      );
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div
      className="page-shell"
      style={{
        maxWidth: 1000,
        margin: "0 auto"
      }}
    >
      <header className="page-header">
        <div>
          <span className="eyebrow">
            YOUR PRIVATE SPACE
          </span>

          <h1>⭐ Starred Messages</h1>

          <p>
            Only your vault can unlock these
            references. Original message text
            is not copied into stars.
          </p>
        </div>

        {unlocked && (
          <button
            type="button"
            className="secondary-button"
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </button>
        )}
      </header>

      {error && (
        <div
          className="error-box"
          role="alert"
        >
          {error}
        </div>
      )}

      {!unlocked ? (
        <div className="feature-card">
          <h2>Vault locked</h2>

          <p>
            Unlock your own private vault
            in AI Support or Expert Chat,
            then return here.
          </p>

          <Link
            to="/chat"
            className="primary-button"
          >
            Unlock vault
          </Link>
        </div>
      ) : loading ? (
        <div className="empty-card">
          Opening your private stars…
        </div>
      ) : !stars.length ? (
        <div className="empty-card">
          No starred messages yet.
          Use ☆ Star beside a message.
        </div>
      ) : (
        <div className="list-grid">
          {stars.map(star => (
            <article
              className="feature-card"
              key={star.id}
            >
              <span className="eyebrow">
                {star.kind === "ai"
                  ? "AI SUPPORT"
                  : "EXPERT CHAT"}
              </span>

              <p
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere"
                }}
              >
                {star.failed
                  ? "Could not unlock this star. Check your vault."
                  : star.resolved
                    ? star.resolved.text
                    : "Message no longer available."}
              </p>

              {star.resolved?.legacy && (
                <small>
                  Older message still uses
                  server-held encryption.
                </small>
              )}

              <div
                className="button-row"
                style={{
                  marginTop: 12
                }}
              >
                {!star.damaged && (
                  <Link
                    className="secondary-button"
                    to={
                      star.kind === "ai"
                        ? `/chat?conversationId=${encodeURIComponent(
                            star.containerId
                          )}`
                        : `/session-chat/${encodeURIComponent(
                            star.containerId
                          )}`
                    }
                  >
                    Open original chat
                  </Link>
                )}

                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy === star.id}
                  onClick={() =>
                    unstar(star.id)
                  }
                >
                  ★ Unstar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}