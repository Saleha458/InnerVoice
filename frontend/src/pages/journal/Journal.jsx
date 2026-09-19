import {
  useCallback,
  useEffect,
  useState
} from "react";

import { Link } from "react-router-dom";

import {
  createVault,
  getVaultProfile,
  unlockVault,
  lockVault,
  isVaultUnlocked
} from "../../services/privateVault";

import {
  getJournalEntries,
  deleteJournalEntry,
  migrateLegacyJournalEntries
} from "../../services/journalService";

const dateLabel = value => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
};

export default function Journal() {
  const [profile, setProfile] = useState(undefined);

  const [unlocked, setUnlocked] = useState(
    isVaultUnlocked()
  );

  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");

  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const refresh = useCallback(async () => {
    const data = await getJournalEntries();

    setEntries(data.entries || []);
  }, []);

  useEffect(() => {
    let active = true;

    getVaultProfile()
      .then(value => {
        if (active) {
          setProfile(value);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Could not load private vault."
          );
        }
      });

    if (isVaultUnlocked()) {
      refresh().catch(() => {
        setError(
          "Could not load journal."
        );
      });
    }

    return () => {
      active = false;
    };
  }, [refresh]);

  async function enterVault(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setInfo("");

    try {
      if (!profile) {
        if (
          passphrase.length < 16 ||
          passphrase !== confirm
        ) {
          throw new Error(
            "Choose at least 16 characters and confirm the same passphrase."
          );
        }

        await createVault(passphrase);

        setProfile(
          await getVaultProfile()
        );

        setInfo(
          "Vault created. Save your private passphrase safely; InnerVoice cannot recover it."
        );
      } else {
        await unlockVault(passphrase);
      }

      setUnlocked(true);

      setPassphrase("");
      setConfirm("");

      await refresh();
    } catch (cause) {
      setError(
        cause?.response?.data?.message ||
        cause.message
      );
    } finally {
      setBusy(false);
    }
  }

  async function migrate() {
    if (
      !window.confirm(
        "Migrate your OLD journal entries into device-side encryption? Keep a secure backup of your original ENCRYPTION_KEY first."
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const number = await migrateLegacyJournalEntries(
        entries
      );

      await refresh();

      setInfo(
        `${number} legacy entries migrated. Check your entries on another device before retiring old backups.`
      );
    } catch (cause) {
      setError(
        cause?.response?.data?.message ||
        cause.message
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (
      !window.confirm(
        "Permanently delete this journal entry?"
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await deleteJournalEntry(id);

      await refresh();
    } catch (cause) {
      setError(
        cause?.response?.data?.message ||
        cause.message
      );
    } finally {
      setBusy(false);
    }
  }

  const legacyCount = entries.filter(
    item => item.legacy
  ).length;

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE REFLECTION
          </span>

          <h1>Journal</h1>

          <p>
            New entries are encrypted on this device.
            Your private vault passphrase never goes
            to the server.
          </p>
        </div>

        {unlocked && (
          <Link
            className="primary-button"
            to="/journal/new"
          >
            + New entry
          </Link>
        )}
      </header>

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {info && (
        <div className="notice-box" role="status">
          {info}
        </div>
      )}

      {!unlocked && (
        <form
          onSubmit={enterVault}
          className="feature-card"
          style={{
            maxWidth: 650,
            display: "grid",
            gap: 14
          }}
        >
          <h2>
            {profile === undefined
              ? "Checking vault…"
              : profile
                ? "Unlock your private vault"
                : "Create your private vault"}
          </h2>

          <p>
            Use a unique passphrase of at least
            16 characters. You will need it on
            every other device. If you lose it,
            the server cannot restore your
            encrypted entries.
          </p>

          <label>
            Private vault passphrase

            <input
              className="form-input"
              type="password"
              autoComplete="off"
              required
              minLength={16}
              value={passphrase}
              onChange={event =>
                setPassphrase(event.target.value)
              }
            />
          </label>

          {!profile && (
            <label>
              Confirm passphrase

              <input
                className="form-input"
                type="password"
                autoComplete="off"
                required
                minLength={16}
                value={confirm}
                onChange={event =>
                  setConfirm(event.target.value)
                }
              />
            </label>
          )}

          <button
            className="primary-button"
            disabled={
              busy ||
              profile === undefined
            }
            type="submit"
          >
            {busy
              ? "Working…"
              : profile
                ? "Unlock"
                : "Create encrypted vault"}
          </button>
        </form>
      )}

      {unlocked && (
        <>
          <div
            className="notice-box"
            style={{ marginBottom: 16 }}
          >
            <strong>
              Device-side encryption active
            </strong>

            <p>
              The server stores ciphertext for
              new journal entries. Lock your
              vault on shared devices.
            </p>

            <button
              className="secondary-button"
              onClick={() => {
                lockVault();
                setUnlocked(false);
                setEntries([]);
              }}
            >
              Lock vault
            </button>
          </div>

          {legacyCount > 0 && (
            <div
              className="error-box"
              role="status"
            >
              <strong>
                {legacyCount} OLD entries still
                use server-held encryption.
              </strong>

              <p>
                They are not user-only encrypted yet.
                Migrate them before claiming
                Journal E2EE.
              </p>

              <button
                type="button"
                className="primary-button"
                disabled={busy}
                onClick={migrate}
              >
                Migrate old journal entries
              </button>
            </div>
          )}

          {!entries.length ? (
            <div className="empty-card">
              Your journal is empty.
            </div>
          ) : (
            <div className="list-grid">
              {entries.map(entry => (
                <article
                  className="feature-card"
                  key={entry.id}
                >
                  <div className="item-top">
                    <div>
                      <h2>
                        {entry.title || "Untitled"}
                      </h2>

                      <small>
                        {entry.mood || "No mood"}

                        {entry.legacy
                          ? " · OLD FORMAT (NOT E2EE)"
                          : " · Device encrypted"}
                      </small>
                    </div>

                    <button
                      className="danger-button"
                      disabled={busy}
                      onClick={() =>
                        remove(entry.id)
                      }
                    >
                      Delete
                    </button>
                  </div>

                  <p
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere"
                    }}
                  >
                    {entry.content}
                  </p>

                  <small>
                    {dateLabel(entry.createdAt)}
                  </small>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}