import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import {
  getGuidelines,
} from "../../services/guidelineService";

/* =========================================================
   AGE GROUPS
========================================================= */

const VALID_AGES = [
  "0-3",
  "4-6",
  "7-10",
  "11-14",
  "15-18",
];

const AGE_LABELS = {
  "0-3": "0–3",
  "4-6": "4–6",
  "7-10": "7–10",
  "11-14": "11–14",
  "15-18": "15–18",
};

/* =========================================================
   STYLES
========================================================= */

const styles = {
  tabs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "10px",
    margin: "22px 0 26px",
  },

  tab: {
    padding: "14px",
    border: "1px solid #e0e2ea",
    borderRadius: "13px",
    background: "#ffffff",
    color: "#4d5568",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  },

  activeTab: {
    background: "#6c63ff",
    color: "#ffffff",
    border: "1px solid #6c63ff",
  },

  ageHero: {
    padding: "26px",
    border: "1px solid #e4e6ee",
    borderRadius: "20px",
    background: "#ffffff",
    marginBottom: "20px",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
  },

  infoCard: {
    padding: "22px",
    border: "1px solid #e4e6ee",
    borderRadius: "17px",
    background: "#ffffff",
  },

  list: {
    margin: 0,
    paddingLeft: "20px",
    display: "grid",
    gap: "9px",
    color: "#555d70",
    lineHeight: 1.6,
  },

  paragraph: {
    margin: 0,
    color: "#555d70",
    lineHeight: 1.65,
  },

  help: {
    marginTop: "18px",
    padding: "22px",
    border: "1px solid #dcd8ff",
    borderRadius: "17px",
    background: "#f5f3ff",
  },
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Guidelines({
  section = "guidelines",
}) {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const requestedAge = searchParams.get("age");

  const selected = VALID_AGES.includes(requestedAge)
    ? requestedAge
    : "0-3";

  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getGuidelines();

        if (!active) return;

        const rawItems = Array.isArray(response?.guidelines)
          ? response.guidelines
          : [];

        const cleanItems = rawItems
          .filter((item) => VALID_AGES.includes(item.id))
          .sort((a, b) => Number(a.order) - Number(b.order));

        setGuidelines(cleanItems);
      } catch (err) {
        console.error("Parent Hub error:", err);

        if (active) {
          setError(
            err?.response?.data?.message ||
              "Could not load Parent Education Hub."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  /* =======================================================
     SELECTED GROUP
  ======================================================= */

  const group = useMemo(
    () =>
      guidelines.find((item) => item.id === selected) ||
      guidelines[0] ||
      null,
    [guidelines, selected]
  );

  const changeAge = (age) => {
    if (!VALID_AGES.includes(age)) return;

    setSearchParams({ age });
  };

  /* =======================================================
     LOADING / ERROR
  ======================================================= */

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-card">
          Loading Parent Education Hub...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="error-box">{error}</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="page-shell">
        <div className="error-box">
          Parent education content is unavailable.
        </div>
      </div>
    );
  }

  /* =======================================================
     WARNING SIGNS — UNCHANGED
  ======================================================= */

  if (section === "warnings") {
    return (
      <div className="page-shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">
              PARENT EDUCATION HUB
            </span>

            <h1>Warning Signs</h1>

            <p>
              Select an age group to explore behavioural and
              emotional changes that may deserve careful
              attention.
            </p>
          </div>

          <Link
            to={`/parent/guidelines?age=${selected}`}
            className="secondary-button"
          >
            ← Guidelines
          </Link>
        </div>

        <AgeTabs
          selected={selected}
          onSelect={changeAge}
        />

        <section style={styles.ageHero}>
          <span className="eyebrow">AGE GROUP</span>

          <h2
            style={{
              margin: "8px 0 4px",
              fontSize: "29px",
            }}
          >
            {group.title}
          </h2>

          <h3
            style={{
              margin: "0 0 10px",
              color: "#5b6274",
            }}
          >
            {group.shortTitle}
          </h3>

          <p style={styles.paragraph}>
            {group.subtitle}
          </p>
        </section>

        <div
          className="notice-box"
          style={{ marginBottom: "18px" }}
        >
          <strong>Important</strong>

          <p>
            One warning sign alone does not prove abuse,
            trauma or a mental-health condition. Pay
            attention to persistent patterns, sudden changes
            and the wider situation.
          </p>
        </div>

        <div style={styles.infoGrid}>
          <ListCard
            icon="⚠️"
            title={`Warning signs for ${group.title}`}
            items={group.warnings}
          />

          <ListCard
            icon="🤝"
            title="How parents should respond"
            items={group.respond}
          />

          <ListCard
            icon="✕"
            title="What NOT to do"
            items={group.dont}
          />

          <ListCard
            icon="💬"
            title="Helpful conversation starters"
            items={group.conversations}
          />
        </div>

        <div style={styles.help}>
          <span className="eyebrow">
            PROFESSIONAL SUPPORT
          </span>

          <h3 style={{ margin: "8px 0" }}>
            When to seek professional help
          </h3>

          <p style={styles.paragraph}>
            {group.help}
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     GUIDELINES
  ======================================================= */

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            PARENT EDUCATION HUB
          </span>

          <h1>Guidance by Age</h1>

          <p>
            Select an age group to view practical,
            age-specific parenting guidance.
          </p>
        </div>

        <div className="button-row">
          <Link
            to="/parent/foundations"
            className="secondary-button"
          >
            Parenting foundations
          </Link>

          <Link
            to={`/parent/warnings?age=${selected}`}
            className="secondary-button"
          >
            Warning signs →
          </Link>
        </div>
      </div>

      <AgeTabs
        selected={selected}
        onSelect={changeAge}
      />

      <section style={styles.ageHero}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <span className="eyebrow">
              AGE GROUP
            </span>

            <h2
              style={{
                margin: "8px 0 4px",
                fontSize: "29px",
              }}
            >
              {group.title}
            </h2>

            <h3
              style={{
                margin: "0 0 12px",
                color: "#5b6274",
              }}
            >
              {group.shortTitle}
            </h3>
          </div>

          <Link
            to={`/parent/warnings?age=${group.id}`}
            className="text-link"
          >
            Warning signs for this age →
          </Link>
        </div>

        <p style={styles.paragraph}>
          {group.overview}
        </p>
      </section>

      {/* BOTH OF THESE ARE NOW BULLET-LIST CARDS */}

      <div style={styles.infoGrid}>
        <ListCard
          icon="♡"
          title="What children need to know"
          items={group.children}
        />

        <ListCard
          icon="✓"
          title="What parents should teach"
          items={group.teach}
        />

        <ListCard
          icon="✕"
          title="What NOT to do"
          items={group.dont}
        />

        <ListCard
          icon="💬"
          title="Conversation starters"
          items={group.conversations}
        />

        <ListCard
          icon="◯"
          title="Healthy boundaries"
          items={group.boundaries}
        />

        <ListCard
          icon="🛡"
          title="Digital safety"
          items={group.digital}
        />
      </div>

      <div style={styles.help}>
        <span className="eyebrow">
          PROFESSIONAL SUPPORT
        </span>

        <h3 style={{ margin: "8px 0" }}>
          When to seek professional help
        </h3>

        <p style={styles.paragraph}>
          {group.help}
        </p>
      </div>

      <div
        className="notice-box"
        style={{ marginTop: "20px" }}
      >
        <strong>Educational guidance</strong>

        <p>
          InnerVoice Parent Education Hub provides general
          educational information and does not diagnose
          abuse, trauma or mental-health conditions.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   AGE TABS
========================================================= */

function AgeTabs({
  selected,
  onSelect,
}) {
  return (
    <div style={styles.tabs}>
      {VALID_AGES.map((age) => {
        const active = selected === age;

        return (
          <button
            key={age}
            type="button"
            style={{
              ...styles.tab,
              ...(active ? styles.activeTab : {}),
            }}
            onClick={() => onSelect(age)}
          >
            {AGE_LABELS[age]}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   LIST CARD

   Accepts arrays from the updated backend.
========================================================= */

function ListCard({
  icon,
  title,
  items,
}) {
  const safeItems = Array.isArray(items)
    ? items
    : typeof items === "string" && items.trim()
    ? [items]
    : [];

  return (
    <article style={styles.infoCard}>
      <h3
        style={{
          margin: "0 0 12px",
          fontSize: "18px",
        }}
      >
        <span style={{ marginRight: "8px" }}>
          {icon}
        </span>

        {title}
      </h3>

      <ul style={styles.list}>
        {safeItems.map((item, index) => (
          <li key={`${index}-${item}`}>
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}