import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getJournalEntries,
  deleteJournalEntry,
} from "../../services/journalService";

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

export default function Journal() {
  const [entries, setEntries] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const load = async () => {
    try {
      setLoading(true);

      const response =
        await getJournalEntries();

      setEntries(
        response.entries || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load your journal."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (
    id
  ) => {
    if (
      !window.confirm(
        "Delete this private entry permanently?"
      )
    ) {
      return;
    }

    try {
      await deleteJournalEntry(
        id
      );

      setEntries((current) =>
        current.filter(
          (entry) =>
            entry.id !== id
        )
      );
    } catch {
      setError(
        "Could not delete this entry."
      );
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
            Journal
          </h1>

          <p>
            Your private reflections are encrypted
            before storage.
          </p>
        </div>

        <Link
          className="primary-button"
          to="/journal/new"
        >
          + New entry
        </Link>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-card">
          Loading journal...
        </div>
      ) : !entries.length ? (
        <div className="empty-card">
          <h2>
            Your journal is empty
          </h2>

          <p>
            Write privately about what
            you're feeling.
          </p>
        </div>
      ) : (
        <div className="list-grid">
          {entries.map(
            (entry) => (
              <article
                className="feature-card"
                key={entry.id}
              >
                <div className="item-top">
                  <div>
                    <h2>
                      {entry.title ||
                        "Untitled entry"}
                    </h2>

                    <small>
                      {entry.mood ||
                        "No mood"}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      remove(
                        entry.id
                      )
                    }
                  >
                    Delete
                  </button>
                </div>

                <p>
                  {entry.content}
                </p>

                <small>
                  {formatDate(
                    entry.createdAt
                  )}
                </small>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}