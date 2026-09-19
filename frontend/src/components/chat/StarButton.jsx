import {
  useEffect,
  useState
} from "react";

import {
  addStar,
  listStars,
  removeStar,
  starKey
} from "../../services/starredService";

export default function StarButton({
  kind,
  containerId,
  messageId
}) {
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    setCurrent(null);
    setError("");

    if (!containerId || !messageId) {
      return () => {
        alive = false;
      };
    }

    listStars()
      .then(stars => {
        const match = stars.find(
          item =>
            !item.damaged &&
            starKey(item) ===
              starKey({
                kind,
                containerId,
                messageId
              })
        );

        if (alive) {
          setCurrent(match || null);
        }
      })
      .catch(() => {
        if (alive) {
          setError("Stars unavailable");
        }
      });

    return () => {
      alive = false;
    };
  }, [
    kind,
    containerId,
    messageId
  ]);

  async function toggle() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      if (current) {
        await removeStar(current.id);
        setCurrent(null);
      } else {
        const stars = await listStars();

        const existing = stars.find(
          item =>
            !item.damaged &&
            starKey(item) ===
              starKey({
                kind,
                containerId,
                messageId
              })
        );

        setCurrent(
          existing ||
          (await addStar({
            kind,
            containerId,
            messageId
          }))
        );
      }
    } catch (cause) {
      setError(
        cause?.response?.data?.message ||
        cause.message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={
          busy ||
          !containerId ||
          !messageId
        }
        title={
          current
            ? "Remove from your private stars"
            : "Save to your private stars"
        }
        aria-pressed={Boolean(current)}
        style={{
          border: "1px solid #e4cbb9",
          borderRadius: 9,
          padding: "4px 9px",
          background: current
            ? "#fff0cd"
            : "#fff",
          color: "#845a37",
          cursor: "pointer",
          font: "inherit",
          fontSize: 12
        }}
      >
        {busy
          ? "…"
          : current
            ? "★ Unstar"
            : "☆ Star"}
      </button>

      {error && (
        <small role="alert">
          {error}
        </small>
      )}
    </span>
  );
}