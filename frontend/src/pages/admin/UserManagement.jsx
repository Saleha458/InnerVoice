import {
  useEffect,
  useState
} from "react";

import api from "../../services/api";

const describe = error =>
  error?.response?.data?.message ||
  error?.message ||
  "Request failed.";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get(
        "/admin/users"
      );

      setUsers([
        ...new Map(
          (data.users || []).map(item => [
            item.uid || item.id,
            item
          ])
        ).values()
      ]);
    } catch (cause) {
      setError(describe(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function change(item) {
    const uid = item.uid || item.id;

    if (!uid || busy) {
      return;
    }

    const status =
      item.status === "suspended"
        ? "active"
        : "suspended";

    setBusy(uid);
    setError("");
    setNotice("");

    try {
      await api.patch(
        `/admin/users/${encodeURIComponent(uid)}/status`,
        { status }
      );

      setNotice(`Account ${status}.`);

      await load();
    } catch (cause) {
      setError(describe(cause));
    } finally {
      setBusy("");
    }
  }

  async function remove(item) {
    const uid = item.uid || item.id;

    if (!uid || busy) {
      return;
    }

    const confirmation = window.prompt(
      `Request permanent deletion of ${
        item.anonymousId || "this account"
      }?\nOnly test with a disposable account.\nType DELETE:`
    );

    if (confirmation !== "DELETE") {
      return;
    }

    setBusy(uid);
    setError("");
    setNotice("");

    try {
      const { data } = await api.delete(
        `/admin/users/${encodeURIComponent(uid)}`,
        {
          data: {
            confirm: "DELETE"
          }
        }
      );

      if (!data?.queued) {
        throw new Error(
          "Deletion was not queued."
        );
      }

      setNotice(
        "Deletion QUEUED, not completed. Refresh to check the worker's progress."
      );

      await load();
    } catch (cause) {
      setError(describe(cause));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            ADMINISTRATION
          </span>

          <h1>User Management</h1>

          <p>
            Manage anonymous account status.
            Permanent deletion requires a
            guarded cleanup worker.
          </p>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={load}
          disabled={Boolean(busy)}
        >
          Refresh
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="error-box"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="notice-box"
        >
          {notice}
        </div>
      )}

      {loading ? (
        <div className="empty-card">
          Loading users…
        </div>
      ) : !users.length ? (
        <div className="empty-card">
          No accounts found.
        </div>
      ) : (
        <div className="list-grid">
          {users.map(item => {
            const uid = item.uid || item.id;

            const canEdit =
              Boolean(uid) &&
              !busy &&
              item.role !== "admin" &&
              ["active", "suspended"].includes(
                item.status
              );

            return (
              <article
                className="feature-card"
                key={uid}
              >
                <div className="item-top">
                  <div>
                    <h2>
                      {item.anonymousId ||
                        "Anonymous"}
                    </h2>

                    <small>
                      {item.role || "user"} · age{" "}
                      {item.age ?? "—"}
                    </small>
                  </div>

                  <span
                    className={`status ${
                      item.status || "active"
                    }`}
                  >
                    {item.status || "active"}
                  </span>
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!canEdit}
                    onClick={() => change(item)}
                  >
                    {item.status === "suspended"
                      ? "Activate"
                      : "Suspend"}
                  </button>

                  <button
                    type="button"
                    className="danger-button"
                    disabled={!canEdit}
                    onClick={() => remove(item)}
                  >
                    Request permanent deletion
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}