import {
  useEffect,
  useState,
} from "react";

import {
  getMoods,
  saveMood,
  removeMood,
} from "../../services/moodService";

const moods = [
  "😊 Great",
  "🙂 Good",
  "😐 Okay",
  "😔 Low",
  "😣 Overwhelmed",
];

const formatDate = (value) => {
  try {
    if (!value) {
      return "Date not available";
    }

    const date =
      value?.toDate
        ? value.toDate()
        : new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Date not available";
    }

    return date.toLocaleString(
      [],
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  } catch {
    return "Date not available";
  }
};

export default function MoodTracker() {
  const [mood, setMood] =
    useState("🙂 Good");

  const [intensity, setIntensity] =
    useState(5);

  const [note, setNote] =
    useState("");

  const [history, setHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const load = async () => {
    try {
      setInitialLoading(true);

      const response =
        await getMoods();

      setHistory(
        response.moods || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load mood history."
      );
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response =
        await saveMood({
          mood,
          note: note.trim(),
          intensity,
        });

      setHistory((current) => [
        response.mood,
        ...current,
      ]);

      setNote("");

      setMessage(
        "Today's mood was saved successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save mood."
      );
    } finally {
      setLoading(false);
    }
  };

  const remove = async (
    id
  ) => {
    const confirmed =
      window.confirm(
        "Delete this mood entry?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await removeMood(id);

      setHistory((current) =>
        current.filter(
          (item) =>
            item.id !== id
        )
      );

      setMessage(
        "Mood entry deleted."
      );
    } catch {
      setError(
        "Could not delete this mood."
      );
    }
  };

  return (
    <div className="page-shell">

      <div className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE CHECK-IN
          </span>

          <h1>
            Mood Tracker
          </h1>

          <p>
            Record how you feel and keep a
            private history of your check-ins.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {message && (
        <div className="success-box">
          {message}
        </div>
      )}

      <div className="feature-card">
        <h2>
          How are you feeling today?
        </h2>

        <div className="mood-options">
          {moods.map(
            (item) => (
              <button
                type="button"
                key={item}
                className={
                  mood === item
                    ? "mood-selected"
                    : "secondary-button"
                }
                onClick={() =>
                  setMood(item)
                }
              >
                {item}
              </button>
            )
          )}
        </div>

        <label>
          Intensity:{" "}
          <strong>
            {intensity}/10
          </strong>

          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={(e) =>
              setIntensity(
                Number(
                  e.target.value
                )
              )
            }
          />
        </label>

        <label>
          Note (optional)

          <textarea
            rows="4"
            value={note}
            onChange={(e) =>
              setNote(
                e.target.value
              )
            }
            placeholder="What influenced your mood today?"
          />
        </label>

        <button
          type="button"
          className="primary-button"
          onClick={save}
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : "Save today's mood"}
        </button>
      </div>

      <h2
        style={{
          marginTop: 28,
        }}
      >
        Mood history
      </h2>

      {initialLoading ? (
        <div className="empty-card">
          Loading mood history...
        </div>
      ) : !history.length ? (
        <div className="empty-card">
          <h2>
            No mood entries yet
          </h2>

          <p>
            Your first check-in will
            appear here.
          </p>
        </div>
      ) : (
        <div className="list-grid">
          {history.map(
            (item) => (
              <article
                className="feature-card"
                key={item.id}
              >
                <div className="item-top">
                  <strong>
                    {item.mood}
                  </strong>

                  <span>
                    {item.intensity}/10
                  </span>
                </div>

                {item.note && (
                  <p>
                    {item.note}
                  </p>
                )}

                <small>
                  {formatDate(
                    item.createdAt
                  )}
                </small>

                <div
                  style={{
                    marginTop: 12,
                  }}
                >
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      remove(
                        item.id
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}