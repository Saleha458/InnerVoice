import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  createVault,
  getVaultProfile,
  unlockVault,
  isVaultUnlocked,
} from "../../services/privateVault";

import {
  getMoods,
  saveMood,
  removeMood,
  migrateLegacyMoods,
} from "../../services/moodService";

import "./MoodTracker.css";

const OPTIONS = [
  { id: "Great", text: "😊 Great", level: 5 },
  { id: "Good", text: "🙂 Good", level: 4 },
  { id: "Okay", text: "😐 Okay", level: 3 },
  { id: "Low", text: "😔 Low", level: 2 },
  { id: "Overwhelmed", text: "😣 Overwhelmed", level: 1 },
];

const TIPS = {
  Great: {
    mental:
      "Notice one thing that went well today. You can write it down to revisit later.",
    physical:
      "Enjoy comfortable movement, water, regular meals and rest.",
  },
  Good: {
    mental:
      "Take a moment to appreciate something you enjoyed or someone who supported you.",
    physical:
      "A short walk or gentle stretch may feel good. Remember water and meals.",
  },
  Okay: {
    mental:
      "Check in with yourself without judging the feeling. You could journal or talk with someone you trust.",
    physical:
      "Try a brief screen break, some water, or gentle movement if comfortable.",
  },
  Low: {
    mental:
      "Take things slowly. If you like, reach out to someone you trust.",
    physical:
      "Choose one manageable step: water, a meal, rest, or a little fresh air.",
  },
  Overwhelmed: {
    mental:
      "Focus on one small next step and consider contacting someone you trust or a qualified professional.",
    physical:
      "If possible, find a comfortable spot and rest. Skip anything that feels difficult.",
  },
  NoEntry: {
    mental:
      "You can name how you feel without needing to fix anything right now.",
    physical:
      "A gentle pause, water, or rest may be a good place to begin.",
  },
};

const errorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong.";

function parseDate(value) {
  if (!value) return null;

  const date =
    typeof value.toDate === "function"
      ? value.toDate()
      : value.seconds != null || value._seconds != null
        ? new Date(
            Number(value.seconds ?? value._seconds) * 1000
          )
        : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const moodInfo = (value) =>
  OPTIONS.find(
    (option) =>
      option.id === value ||
      option.text === value
  );

const formatDate = (value) =>
  parseDate(value)?.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  }) || "Date unavailable";

function ChartTooltip({ active, payload }) {
  const day = payload?.[0]?.payload;

  if (!active || !day?.level) {
    return null;
  }

  return (
    <div className="mood-chart-tooltip">
      <strong>{day.longLabel}</strong>

      <span>{day.moodText}</span>

      <small>
        {day.count} check-in
        {day.count === 1 ? "" : "s"} that day
      </small>
    </div>
  );
}

export default function MoodTracker() {
  const [profile, setProfile] = useState(undefined);

  const [unlocked, setUnlocked] = useState(
    isVaultUnlocked()
  );

  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [vaultBusy, setVaultBusy] = useState(false);

  const [mood, setMood] = useState("🙂 Good");
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");

  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState(7);

  const [selectedDay, setSelectedDay] = useState(
    () => dayKey(new Date())
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const today = dayKey(new Date());

  const load = useCallback(async () => {
    const result = await getMoods();

    setHistory(
      Array.isArray(result?.moods)
        ? result.moods
        : []
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    getVaultProfile()
      .then(async (current) => {
        if (cancelled) return;

        setProfile(current);

        if (isVaultUnlocked()) {
          try {
            const result = await getMoods();

            if (!cancelled) {
              setHistory(result.moods || []);
            }
          } catch (cause) {
            if (!cancelled) {
              setError(errorMessage(cause));
            }
          }
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(errorMessage(cause));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitVault(event) {
    event.preventDefault();

    if (vaultBusy || profile === undefined) {
      return;
    }

    setVaultBusy(true);
    setError("");

    try {
      if (profile === null) {
        if (
          passphrase.length < 16 ||
          passphrase !== confirmation
        ) {
          throw new Error(
            "Use a unique passphrase of at least 16 characters and matching confirmation."
          );
        }

        await createVault(passphrase);

        setProfile(await getVaultProfile());

        setNotice(
          "Vault created. Keep your passphrase safely: InnerVoice cannot recover it."
        );
      } else {
        await unlockVault(passphrase);
      }

      setPassphrase("");
      setConfirmation("");

      await load();

      setUnlocked(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setVaultBusy(false);
    }
  }

  async function migrate() {
    if (
      vaultBusy ||
      !isVaultUnlocked()
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Have you verified this vault on another device and kept a secure backup of the original encryption key? Migrate old mood entries?"
    );

    if (!confirmed) return;

    setVaultBusy(true);
    setError("");

    try {
      const count = await migrateLegacyMoods();

      await load();

      setNotice(
        `${count} old entries migrated. Check both devices; do not delete old backups yet.`
      );
    } catch (cause) {
      setError(errorMessage(cause));

      await load().catch(() => {});
    } finally {
      setVaultBusy(false);
    }
  }

  const chartData = useMemo(() => {
    const byDay = new Map();

    const ordered = [...history].sort(
      (a, b) =>
        (parseDate(b.createdAt)?.getTime() || 0) -
        (parseDate(a.createdAt)?.getTime() || 0)
    );

    for (const entry of ordered) {
      if (entry.decryptionFailed) {
        continue;
      }

      const date = parseDate(
        entry.createdAt ?? entry.date
      );

      if (!date) continue;

      const key = dayKey(date);

      const previous = byDay.get(key) || {
        latest: entry,
        count: 0,
      };

      previous.count++;

      byDay.set(key, previous);
    }

    const base = new Date();

    base.setHours(0, 0, 0, 0);

    return Array.from(
      { length: period },
      (_, index) => {
        const date = new Date(base);

        date.setDate(
          base.getDate() - period + 1 + index
        );

        const daily = byDay.get(dayKey(date));

        const info = moodInfo(
          daily?.latest?.mood
        );

        return {
          key: dayKey(date),

          label:
            `${date.getDate()}/${date.getMonth() + 1}`,

          longLabel: date.toLocaleDateString([], {
            weekday: "long",
            month: "short",
            day: "numeric",
          }),

          moodId: info?.id || null,
          moodText: info?.text || "No check-in",
          level: info?.level ?? null,
          count: daily?.count || 0,
        };
      }
    );
  }, [history, period, today]);

  const selected =
    chartData.find(
      (day) => day.key === selectedDay
    ) || chartData.at(-1);

  const logged = chartData.filter(
    (day) => day.moodId
  );

  const totals = new Map();

  for (const day of logged) {
    totals.set(
      day.moodId,
      (totals.get(day.moodId) || 0) + 1
    );
  }

  const mostCommon =
    [...totals].sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || null;

  const latestRecorded =
    [...chartData]
      .reverse()
      .find((day) => day.moodId)
      ?.moodText || "No check-in yet";

  const tips = TIPS[
    selected?.moodId || "NoEntry"
  ];

  const legacyCount = history.filter(
    (item) => item.legacy
  ).length;

  const sortedHistory = [...history].sort(
    (a, b) =>
      (parseDate(b.createdAt)?.getTime() || 0) -
      (parseDate(a.createdAt)?.getTime() || 0)
  );

  async function save(event) {
    event.preventDefault();

    if (
      !isVaultUnlocked() ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await saveMood({
        mood,
        intensity,
        note: note.trim(),
      });

      if (!result?.mood) {
        throw new Error(
          "Encrypted mood was not returned."
        );
      }

      setHistory((current) => [
        result.mood,
        ...current,
      ]);

      setSelectedDay(today);
      setNote("");

      setNotice(
        "Your private check-in has been saved on this device and stored encrypted."
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (
      !window.confirm(
        "Delete this mood check-in?"
      )
    ) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      await removeMood(id);

      setHistory((current) =>
        current.filter(
          (item) => item.id !== id
        )
      );

      setNotice(
        "Mood check-in deleted."
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setDeletingId(null);
    }
  }

  if (
    !unlocked ||
    !isVaultUnlocked()
  ) {
    return (
      <div className="page-shell mood-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">
              PRIVATE CHECK-IN
            </span>

            <h1>Mood &amp; wellbeing</h1>

            <p>
              Unlock your private vault
              to see your mood history.
            </p>
          </div>
        </header>

        {error && (
          <div
            className="error-box"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          className="mood-panel"
          style={{
            maxWidth: 600,
            display: "grid",
            gap: 14,
          }}
          onSubmit={submitVault}
        >
          <h2>
            {profile === undefined
              ? "Checking private vault…"
              : profile
                ? "Unlock private vault"
                : "Create private vault"}
          </h2>

          <p>
            Use the same private passphrase as your
            Journal and Expert Chat. Do not share it.
            Without it, your encrypted data cannot
            be recovered by the server.
          </p>

          <label>
            Private passphrase

            <input
              className="form-input"
              type="password"
              minLength={16}
              autoComplete="off"
              required
              value={passphrase}
              onChange={(event) =>
                setPassphrase(event.target.value)
              }
            />
          </label>

          {profile === null && (
            <label>
              Confirm passphrase

              <input
                className="form-input"
                type="password"
                minLength={16}
                autoComplete="off"
                required
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(event.target.value)
                }
              />
            </label>
          )}

          <button
            className="mood-save-button"
            disabled={
              vaultBusy ||
              profile === undefined
            }
            type="submit"
          >
            {vaultBusy
              ? "Working…"
              : profile
                ? "Unlock"
                : "Create vault"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-shell mood-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            YOUR PRIVATE CHECK-IN
          </span>

          <h1>Mood &amp; wellbeing</h1>

          <p>
            Notice how you feel, explore your own
            patterns, and find gentle ideas
            for each day.
          </p>
        </div>
      </header>

      {error && (
        <div
          className="error-box"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          className="success-box"
          role="status"
        >
          {notice}
        </div>
      )}

      {legacyCount > 0 && (
        <div className="mood-panel">
          <strong>
            {legacyCount} older check-ins still
            use server-held encryption.
          </strong>

          <p>
            Verify new entries and vault recovery
            on another device before migrating
            older records.
          </p>

          <button
            type="button"
            className="mood-save-button"
            disabled={vaultBusy}
            onClick={migrate}
          >
            {vaultBusy
              ? "Migrating…"
              : "Migrate old mood entries"}
          </button>
        </div>
      )}

      <section
        className="mood-panel mood-checkin"
        aria-labelledby="mood-checkin-title"
      >
        <div className="mood-section-heading">
          <div>
            <span className="mood-kicker">
              DAILY REFLECTION
            </span>

            <h2 id="mood-checkin-title">
              How are you feeling today?
            </h2>

            <p>
              Choose what feels closest to your
              experience. There is no right
              or wrong answer.
            </p>
          </div>
        </div>

        <form onSubmit={save}>
          <div
            className="mood-choice-grid"
            role="group"
            aria-label="Choose your mood"
          >
            {OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`mood-choice ${
                  mood === option.text
                    ? "is-selected"
                    : ""
                }`}
                aria-pressed={
                  mood === option.text
                }
                disabled={saving}
                onClick={() =>
                  setMood(option.text)
                }
              >
                {option.text}
              </button>
            ))}
          </div>

          <div className="mood-form-grid">
            <label className="mood-intensity">
              <span>
                How strongly do you feel it?{" "}
                <strong>
                  {intensity}/10
                </strong>
              </span>

              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(event) =>
                  setIntensity(
                    Number(event.target.value)
                  )
                }
                disabled={saving}
              />

              <small>
                This describes the strength of your
                chosen feeling, not a health score.
              </small>
            </label>

            <label className="mood-note">
              <span>
                Optional note
              </span>

              <textarea
                rows={3}
                maxLength={1000}
                placeholder="What influenced your mood today?"
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                disabled={saving}
              />
            </label>
          </div>

          <button
            className="mood-save-button"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : "Save my check-in →"}
          </button>
        </form>
      </section>

      <section
        className="mood-panel mood-overview"
        aria-labelledby="mood-overview-title"
      >
        <div className="mood-section-heading mood-heading-with-tabs">
          <div>
            <span className="mood-kicker">
              YOUR MOOD OVERVIEW
            </span>

            <h2 id="mood-overview-title">
              A look at your recent days
            </h2>

            <p>
              Each bar shows your most recent
              check-in for that day.
            </p>
          </div>

          <div
            className="mood-period-tabs"
            role="group"
            aria-label="Mood overview time period"
          >
            {[
              { days: 7, label: "Weekly" },
              { days: 14, label: "Fortnight" },
              { days: 30, label: "Monthly" },
            ].map((option) => (
              <button
                key={option.days}
                type="button"
                className={
                  period === option.days
                    ? "active"
                    : ""
                }
                aria-pressed={
                  period === option.days
                }
                onClick={() => {
                  setPeriod(option.days);
                  setSelectedDay(today);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mood-summary-grid">
          <div className="mood-summary-tile">
            <span>
              Days with check-ins
            </span>

            <strong>
              {logged.length}{" "}
              <small>
                / {period}
              </small>
            </strong>
          </div>

          <div className="mood-summary-tile">
            <span>
              Most common daily mood
            </span>

            <strong>
              {moodInfo(mostCommon)?.text ||
                "Not enough data"}
            </strong>
          </div>

          <div className="mood-summary-tile">
            <span>
              Latest recorded mood
            </span>

            <strong>
              {latestRecorded}
            </strong>
          </div>
        </div>

        {loading ? (
          <div className="mood-chart-empty">
            Loading your mood overview…
          </div>
        ) : logged.length === 0 ? (
          <div className="mood-chart-empty">
            No check-ins in this period yet.
            Save a mood to begin.
          </div>
        ) : (
          <div
            className="mood-chart-scroll"
            role="region"
            aria-label={`${period}-day mood bar chart`}
            tabIndex={0}
          >
            <div
              className="mood-chart-inner"
              style={{
                minWidth:
                  period === 30
                    ? 850
                    : period === 14
                      ? 570
                      : 350,
              }}
            >
              <ResponsiveContainer
                width="100%"
                height={288}
              >
                <BarChart
                  data={chartData}
                  margin={{
                    top: 12,
                    right: 12,
                    left: 6,
                    bottom: 4,
                  }}
                >
                  <CartesianGrid
                    stroke="#eee5dc"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#756a61",
                      fontSize: 11,
                    }}
                    interval={
                      period === 30 ? 3 : 0
                    }
                  />

                  <YAxis
                    domain={[0, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#756a61",
                      fontSize: 11,
                    }}
                    tickFormatter={(value) =>
                      OPTIONS.find(
                        (item) =>
                          item.level === value
                      )?.id || ""
                    }
                  />

                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{
                      fill: "#fff3e9",
                    }}
                  />

                  <Bar
                    dataKey="level"
                    fill="#be815e"
                    radius={[7, 7, 0, 0]}
                    maxBarSize={42}
                    onClick={(bar) => {
                      if (bar?.payload?.key) {
                        setSelectedDay(
                          bar.payload.key
                        );
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <p className="mood-chart-note">
          These are your own mood labels, not a
          diagnosis or mental-health score.
          Days without a check-in stay blank.
        </p>
      </section>

      <section
        className="mood-panel mood-advice"
        aria-labelledby="mood-advice-title"
      >
        <div className="mood-section-heading mood-heading-with-tabs">
          <div>
            <span className="mood-kicker">
              GENTLE DAILY IDEAS
            </span>

            <h2 id="mood-advice-title">
              A little support for your day
            </h2>

            <p>
              Optional ideas based only on
              the mood you recorded,
              not medical advice.
            </p>
          </div>

          <label className="mood-day-picker">
            Choose a day

            <select
              value={
                selected?.key || today
              }
              onChange={(event) =>
                setSelectedDay(
                  event.target.value
                )
              }
            >
              {[...chartData]
                .reverse()
                .map((day) => (
                  <option
                    key={day.key}
                    value={day.key}
                  >
                    {day.longLabel} ·{" "}
                    {day.moodId || "No check-in"}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <p className="mood-selected-day">
          {selected?.longLabel || "Today"} ·{" "}
          {selected?.moodText ||
            "No mood recorded"}
        </p>

        <div className="mood-advice-grid">
          <div className="mood-advice-card">
            <span
              className="mood-advice-icon"
              aria-hidden="true"
            >
              ♡
            </span>

            <h3>
              For your emotional wellbeing
            </h3>

            <p>
              {tips.mental}
            </p>
          </div>

          <div className="mood-advice-card">
            <span
              className="mood-advice-icon"
              aria-hidden="true"
            >
              ☀
            </span>

            <h3>
              For your physical wellbeing
            </h3>

            <p>
              {tips.physical}
            </p>
          </div>
        </div>

        {(selected?.moodId === "Low" ||
          selected?.moodId ===
            "Overwhelmed") && (
          <p className="mood-support-link">
            You can also{" "}
            <Link to="/experts">
              explore verified experts →
            </Link>{" "}
            if you would like human support.
          </p>
        )}

        <p className="mood-help-note">
          If you feel unsafe or may hurt yourself,
          contact a trusted person or appropriate
          local emergency support now.
          InnerVoice is not emergency care.
        </p>
      </section>

      <section
        className="mood-panel mood-history"
        aria-labelledby="mood-history-title"
      >
        <div className="mood-section-heading">
          <div>
            <span className="mood-kicker">
              YOUR PRIVATE HISTORY
            </span>

            <h2 id="mood-history-title">
              Your past check-ins
            </h2>
          </div>
        </div>

        {loading ? (
          <p className="mood-history-empty">
            Loading history…
          </p>
        ) : sortedHistory.length === 0 ? (
          <p className="mood-history-empty">
            No entries yet. Your first check-in
            will appear here.
          </p>
        ) : (
          <div className="mood-history-list">
            {sortedHistory.map((entry) => (
              <article
                key={entry.id}
                className="mood-history-entry"
              >
                <div className="mood-history-main">
                  <strong>
                    {entry.decryptionFailed
                      ? "Unable to decrypt"
                      : moodInfo(entry.mood)?.text ||
                        entry.mood ||
                        "Unknown mood"}
                  </strong>

                  <small>
                    {formatDate(
                      entry.createdAt ??
                      entry.date
                    )}{" "}
                    ·{" "}
                    {entry.legacy
                      ? "OLD: server-encrypted"
                      : "Device-encrypted"}
                  </small>

                  {entry.note && (
                    <p>{entry.note}</p>
                  )}
                </div>

                <div className="mood-history-actions">
                  <span>
                    Feeling strength:{" "}
                    {entry.intensity ?? "—"}/10
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      remove(entry.id)
                    }
                    disabled={
                      deletingId === entry.id
                    }
                    aria-label={`Delete mood check-in from ${formatDate(
                      entry.createdAt
                    )}`}
                  >
                    {deletingId === entry.id
                      ? "Deleting…"
                      : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}