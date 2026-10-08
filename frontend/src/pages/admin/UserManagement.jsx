
import { useEffect, useState } from "react";
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

  const activeUsers = users.filter(
    item => item.status !== "deleting"
  );

  const pendingUsers = users.filter(
    item => item.status === "deleting"
  );

  async function load() {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/admin/users");

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
        "Deletion requested. The account remains pending until secure cleanup completes."
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
          {activeUsers.map(item => {
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

      {!loading && pendingUsers.length > 0 && (
        <section
          aria-label="Pending account deletions"
          style={{ marginTop: 24 }}
        >
          <h2>
            Pending secure deletion (
            {pendingUsers.length})
          </h2>

          <p>
            These accounts are not yet
            permanently deleted. The backend
            cleanup worker must finish before
            they disappear.
          </p>

          <div className="list-grid">
            {pendingUsers.map(item => (
              <article
                className="feature-card"
                key={item.uid || item.id}
              >
                <h3>
                  {item.anonymousId ||
                    "Anonymous"}
                </h3>

                <span className="status deleting">
                  Deletion pending
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
