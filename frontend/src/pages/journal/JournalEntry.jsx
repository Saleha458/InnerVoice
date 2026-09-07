import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  createJournalEntry,
} from "../../services/journalService";

export default function JournalEntry() {
  const navigate =
    useNavigate();

  const [title, setTitle] =
    useState("");

  const [mood, setMood] =
    useState("");

  const [content, setContent] =
    useState("");

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const submit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (
      content.trim().length < 3
    ) {
      setError(
        "Please write a little more before saving."
      );
      return;
    }

    try {
      setSaving(true);

      await createJournalEntry({
        title:
          title.trim(),

        mood,

        content:
          content.trim(),
      });

      navigate(
        "/journal",
        {
          replace: true,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save journal entry."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">

      <div className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE REFLECTION
          </span>

          <h1>
            New journal entry
          </h1>

          <p>
            Your reflection is encrypted before
            storage.
          </p>
        </div>

        <Link
          className="secondary-button"
          to="/journal"
        >
          Back
        </Link>
      </div>

      <form
        className="feature-card"
        onSubmit={submit}
        style={{
          maxWidth: 800,
        }}
      >

        <label>
          Title

          <input
            className="form-input"
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            placeholder="A title for today"
          />
        </label>

        <label>
          Mood

          <select
            className="form-input"
            value={mood}
            onChange={(e) =>
              setMood(
                e.target.value
              )
            }
          >
            <option value="">
              Choose one
            </option>

            <option value="Great">
              Great
            </option>

            <option value="Good">
              Good
            </option>

            <option value="Okay">
              Okay
            </option>

            <option value="Low">
              Low
            </option>

            <option value="Overwhelmed">
              Overwhelmed
            </option>
          </select>
        </label>

        <label>
          Reflection

          <textarea
            className="form-input"
            rows="12"
            value={content}
            onChange={(e) =>
              setContent(
                e.target.value
              )
            }
            placeholder="Write whatever feels important..."
          />
        </label>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <button
          className="primary-button"
          disabled={saving}
        >
          {saving
            ? "Saving privately..."
            : "Save privately"}
        </button>
      </form>
    </div>
  );
}