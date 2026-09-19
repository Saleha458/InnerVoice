import { useState } from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import {
  createJournalEntry
} from "../../services/journalService";

import {
  isVaultUnlocked
} from "../../services/privateVault";

export default function JournalEntry() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("");
  const [content, setContent] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isVaultUnlocked()) {
    return (
      <div className="page-shell">
        <div className="error-box">
          Unlock your private vault on
          the Journal page first.
        </div>

        <Link to="/journal">
          Go to Journal
        </Link>
      </div>
    );
  }

  async function submit(event) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSaving(true);

    try {
      await createJournalEntry({
        title: title.trim(),
        mood,
        content: content.trim()
      });

      navigate("/journal", {
        replace: true
      });
    } catch (cause) {
      setError(
        cause?.response?.data?.message ||
        cause.message ||
        "Could not save encrypted journal."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            DEVICE-ENCRYPTED REFLECTION
          </span>

          <h1>New journal entry</h1>

          <p>
            Title, mood and reflection are encrypted
            before your browser sends them.
          </p>
        </div>

        <Link
          className="secondary-button"
          to="/journal"
        >
          Back
        </Link>
      </header>

      <form
        className="feature-card"
        onSubmit={submit}
        style={{
          maxWidth: 800,
          display: "grid",
          gap: 18
        }}
      >
        <label>
          Title

          <input
            className="form-input"
            maxLength={200}
            value={title}
            onChange={event =>
              setTitle(event.target.value)
            }
            placeholder="A title for today"
          />
        </label>

        <label>
          Mood

          <select
            className="form-input"
            value={mood}
            onChange={event =>
              setMood(event.target.value)
            }
          >
            <option value="">
              Choose one
            </option>

            {[
              "Great",
              "Good",
              "Okay",
              "Low",
              "Overwhelmed"
            ].map(value => (
              <option key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          Reflection

          <textarea
            className="form-input"
            rows={12}
            maxLength={30000}
            required
            minLength={3}
            value={content}
            onChange={event =>
              setContent(event.target.value)
            }
            placeholder="Write whatever feels important…"
          />
        </label>

        {error && (
          <div
            className="error-box"
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Encrypting and saving…"
            : "Save encrypted entry"}
        </button>
      </form>
    </div>
  );
}