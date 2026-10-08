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
   HELPERS
========================================================= */

function safeArray(value) {
  if (
    Array.isArray(value)
  ) {
    return value.filter(Boolean);
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return [
      value,
    ];
  }

  return [];
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

/* =========================================================
   WARNING-EVIDENCE FILTER

   Guidelines page:
   → all official sources relevant to the selected age.

   Warning Signs page:
   → only sources that are meaningfully related to
     mental health, warning signs, safety, abuse,
     exploitation or clinical response.

   This intentionally removes generic positive-parenting
   sources from Warning Signs while preserving them on
   general age guidance.
========================================================= */

function isWarningEvidenceSource(
  source
) {
  if (!source) {
    return false;
  }

  /*
   * These are general parenting resources.
   * Useful for Guidelines, but not evidence cards
   * specifically attached to warning signs.
   */
  const genericParentingIds =
    new Set([
      "cdc-positive-parenting",
      "cdc-parenting-teens",
    ]);

  if (
    genericParentingIds.has(
      source.id
    )
  ) {
    return false;
  }

  const searchable =
    [
      source.title,
      source.type,
      source.note,
      ...safeArray(
        source.topics
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  const evidenceTerms = [
    "mental health",
    "warning",
    "clinical",
    "maltreatment",
    "abuse",
    "exploitation",
    "safety",
    "trauma",
    "suicide",
    "self-harm",
    "professional evaluation",
    "help-seeking",
  ];

  return evidenceTerms.some(
    term =>
      searchable.includes(
        term
      )
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  tabs: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(120px, 1fr))",

    gap: "10px",

    margin:
      "22px 0 26px",
  },

  tab: {
    padding: "14px",

    border:
      "1px solid #e4d8cf",

    borderRadius:
      "13px",

    background:
      "#ffffff",

    color:
      "#5b514b",

    fontWeight: 700,

    fontSize: "14px",

    cursor: "pointer",
  },

  activeTab: {
    background:
      "#bf7653",

    color:
      "#ffffff",

    border:
      "1px solid #bf7653",
  },

  reviewRow: {
    display: "flex",

    alignItems: "center",

    justifyContent:
      "space-between",

    flexWrap: "wrap",

    gap: "10px",

    marginBottom:
      "20px",

    padding:
      "13px 16px",

    border:
      "1px solid #ead9cd",

    borderRadius:
      "14px",

    background:
      "#fffaf6",
  },

  reviewBadge: {
    display:
      "inline-flex",

    alignItems:
      "center",

    gap: "7px",

    color:
      "#6f5143",

    fontSize:
      "12px",

    fontWeight:
      750,
  },

  reviewDot: {
    width: "7px",

    height: "7px",

    borderRadius:
      "50%",

    background:
      "#bb7252",

    flex:
      "0 0 auto",
  },

  reviewText: {
    margin: 0,

    color:
      "#786d66",

    fontSize:
      "12px",

    lineHeight:
      1.5,
  },

  ageHero: {
    padding:
      "26px",

    border:
      "1px solid #e6ddd6",

    borderRadius:
      "20px",

    background:
      "#ffffff",

    marginBottom:
      "20px",
  },

  infoGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",

    gap:
      "16px",
  },

  infoCard: {
    padding:
      "22px",

    border:
      "1px solid #e7dfd9",

    borderRadius:
      "17px",

    background:
      "#ffffff",
  },

  list: {
    margin: 0,

    paddingLeft:
      "20px",

    display:
      "grid",

    gap:
      "9px",

    color:
      "#555d70",

    lineHeight:
      1.6,
  },

  paragraph: {
    margin: 0,

    color:
      "#555d70",

    lineHeight:
      1.65,
  },

  help: {
    marginTop:
      "18px",

    padding:
      "22px",

    border:
      "1px solid #e6cdbd",

    borderRadius:
      "17px",

    background:
      "#fff7f1",
  },

  urgent: {
    marginTop:
      "16px",

    padding:
      "18px 20px",

    border:
      "1px solid #efc0b8",

    borderRadius:
      "15px",

    background:
      "#fff4f1",
  },

  sourceSection: {
    marginTop:
      "22px",

    padding:
      "22px",

    border:
      "1px solid #e5e0dc",

    borderRadius:
      "18px",

    background:
      "#ffffff",
  },

  sourceGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",

    gap:
      "12px",

    marginTop:
      "14px",
  },

  sourceCard: {
    display:
      "flex",

    flexDirection:
      "column",

    minHeight:
      "190px",

    padding:
      "16px",

    border:
      "1px solid #ede3dc",

    borderRadius:
      "14px",

    background:
      "#fffaf6",
  },

  sourceType: {
    marginTop:
      "8px",

    color:
      "#8c7468",

    fontSize:
      "11px",

    lineHeight:
      1.5,
  },

  sourceNote: {
    margin:
      "7px 0 0",

    color:
      "#6d6570",

    fontSize:
      "12px",

    lineHeight:
      1.55,
  },

  sourceLink: {
    marginTop:
      "auto",

    paddingTop:
      "12px",
  },
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Guidelines({
  section = "guidelines",
}) {
  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();

  const requestedAge =
    searchParams.get(
      "age"
    );

  const selected =
    VALID_AGES.includes(
      requestedAge
    )
      ? requestedAge
      : "0-3";

  const [
    guidelines,
    setGuidelines,
  ] =
    useState([]);

  const [
    sources,
    setSources,
  ] =
    useState([]);

  const [
    meta,
    setMeta,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  /* =======================================================
     LOAD DYNAMIC FIRESTORE CONTENT
  ======================================================= */

  useEffect(
    () => {
      let active =
        true;

      const load =
        async () => {
          try {
            setLoading(
              true
            );

            setError("");

            const response =
              await getGuidelines();

            if (!active) {
              return;
            }

            const rawItems =
              Array.isArray(
                response
                  ?.guidelines
              )
                ? response
                    .guidelines
                : [];

            const cleanItems =
              rawItems
                .filter(
                  item =>
                    VALID_AGES
                      .includes(
                        item.id
                      )
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    Number(
                      a.order
                    ) -
                    Number(
                      b.order
                    )
                );

            setGuidelines(
              cleanItems
            );

            setSources(
              Array.isArray(
                response
                  ?.sources
              )
                ? response
                    .sources
                : []
            );

            setMeta(
              response
                ?.meta ||
                null
            );
          } catch (err) {
            console.error(
              "Parent Hub error:",
              err
            );

            if (active) {
              setError(
                err
                  ?.response
                  ?.data
                  ?.message ||
                  "Could not load Parent Education Hub."
              );
            }
          } finally {
            if (active) {
              setLoading(
                false
              );
            }
          }
        };

      load();

      return () => {
        active =
          false;
      };
    },

    []
  );

  /* =======================================================
     SELECTED AGE GROUP
  ======================================================= */

  const group =
    useMemo(
      () =>
        guidelines.find(
          item =>
            item.id ===
            selected
        ) ||
        guidelines[0] ||
        null,

      [
        guidelines,
        selected,
      ]
    );

  /* =======================================================
     ALL OFFICIAL SOURCES FOR CURRENT AGE GROUP
  ======================================================= */

  const groupSources =
    useMemo(
      () => {
        if (!group) {
          return [];
        }

        const wanted =
          new Set(
            safeArray(
              group
                .sourceIds
            )
          );

        return sources.filter(
          source =>
            wanted.has(
              source.id
            )
        );
      },

      [
        group,
        sources,
      ]
    );

  /* =======================================================
     WARNING-SPECIFIC EVIDENCE

     This is deliberately narrower than groupSources.
  ======================================================= */

  const warningSources =
    useMemo(
      () =>
        groupSources.filter(
          isWarningEvidenceSource
        ),

      [
        groupSources,
      ]
    );

  /* =======================================================
     AGE CHANGE
  ======================================================= */

  const changeAge =
    age => {
      if (
        !VALID_AGES.includes(
          age
        )
      ) {
        return;
      }

      setSearchParams({
        age,
      });
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-card">
          Loading source-backed Parent Education Hub...
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="page-shell">
        <div
          className="error-box"
          role="alert"
        >
          {error}
        </div>
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

  const reviewedAt =
    group.reviewedAt ||
    meta?.reviewedAt;

  /* =======================================================
     WARNING SIGNS PAGE
  ======================================================= */

  if (
    section ===
    "warnings"
  ) {
    return (
      <div className="page-shell">
        {/* HEADER */}

        <div className="page-header">
          <div>
            <span className="eyebrow">
              PARENT EDUCATION HUB
            </span>

            <h1>
              Warning Signs
            </h1>

            <p>
              Age-specific educational guidance on changes
              that may deserve attention. Look at persistence,
              severity, daily functioning and the wider context.
            </p>
          </div>

          <Link
            to={`/parent/guidelines?age=${selected}`}
            className="secondary-button"
          >
            ← Guidelines
          </Link>
        </div>

        {/* CLEAN REVIEW INFORMATION */}

        <ReviewRow
          reviewedAt={
            reviewedAt
          }
          sourceCount={
            warningSources.length
          }
          label="warning-sign evidence references"
        />

        {/* AGE TABS */}

        <AgeTabs
          selected={
            selected
          }
          onSelect={
            changeAge
          }
        />

        {/* AGE INTRO */}

        <section style={styles.ageHero}>
          <span className="eyebrow">
            AGE GROUP
          </span>

          <h2
            style={{
              margin:
                "8px 0 4px",

              fontSize:
                "29px",
            }}
          >
            {group.title}
          </h2>

          <h3
            style={{
              margin:
                "0 0 10px",

              color:
                "#5b6274",
            }}
          >
            {group.shortTitle}
          </h3>

          <p style={styles.paragraph}>
            {group.subtitle}
          </p>
        </section>

        {/* IMPORTANT CONTEXT */}

        <div
          className="notice-box"
          style={{
            marginBottom:
              "18px",
          }}
        >
          <strong>
            Important context
          </strong>

          <p>
            One warning sign alone does not prove abuse,
            trauma or a mental-health condition. Children and
            teenagers can show temporary changes for many
            reasons. Pay closer attention when changes are
            persistent, severe, sudden, repeated or interfere
            with everyday functioning.
          </p>
        </div>

        {/* WARNING CONTENT */}

        <div style={styles.infoGrid}>
          <ListCard
            icon="⚠"
            title={`Warning signs for ${group.title}`}
            items={
              group.warnings
            }
          />

          <ListCard
            icon="♡"
            title="How parents should respond"
            items={
              group.respond
            }
          />

          <ListCard
            icon="✕"
            title="What NOT to do"
            items={
              group.dont
            }
          />

          <ListCard
            icon="💬"
            title="Helpful conversation starters"
            items={
              group.conversations
            }
          />
        </div>

        {/* PROFESSIONAL SUPPORT */}

        <div style={styles.help}>
          <span className="eyebrow">
            PROFESSIONAL SUPPORT
          </span>

          <h3
            style={{
              margin:
                "8px 0",
            }}
          >
            When to seek professional help
          </h3>

          <p style={styles.paragraph}>
            {group.help}
          </p>
        </div>

        {/* URGENT SAFETY */}

        {safeArray(
          group.urgent
        ).length >
          0 && (
          <div style={styles.urgent}>
            <span className="eyebrow">
              URGENT SAFETY
            </span>

            <h3
              style={{
                margin:
                  "8px 0 10px",
              }}
            >
              Do not wait for routine support when there is immediate risk
            </h3>

            <ul style={styles.list}>
              {safeArray(
                group.urgent
              ).map(
                item => (
                  <li
                    key={
                      item
                    }
                  >
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        {/* WARNING-SPECIFIC EVIDENCE */}

        <SourceSection
          title="Evidence related to these warning signs"
          description="These references focus on mental health, safety, abuse, exploitation or clinical response. General positive-parenting resources are kept on the age-guidance page instead of being presented as warning-sign evidence."
          sources={
            warningSources
          }
          reviewedAt={
            reviewedAt
          }
          linkLabel="Open evidence source →"
        />
      </div>
    );
  }

  /* =======================================================
     GENERAL GUIDANCE PAGE
  ======================================================= */

  return (
    <div className="page-shell">
      {/* HEADER */}

      <div className="page-header">
        <div>
          <span className="eyebrow">
            PARENT EDUCATION HUB
          </span>

          <h1>
            Guidance by Age
          </h1>

          <p>
            Practical age-specific parenting guidance loaded
            dynamically from Firestore and connected to trusted
            public-health sources.
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

      {/* CLEAN REVIEW INFORMATION */}

      <ReviewRow
        reviewedAt={
          reviewedAt
        }
        sourceCount={
          groupSources.length
        }
        label="official references for this age"
      />

      {/* AGE TABS */}

      <AgeTabs
        selected={
          selected
        }
        onSelect={
          changeAge
        }
      />

      {/* AGE INTRO */}

      <section style={styles.ageHero}>
        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "flex-start",

            flexWrap:
              "wrap",

            gap:
              "20px",
          }}
        >
          <div>
            <span className="eyebrow">
              AGE GROUP
            </span>

            <h2
              style={{
                margin:
                  "8px 0 4px",

                fontSize:
                  "29px",
              }}
            >
              {group.title}
            </h2>

            <h3
              style={{
                margin:
                  "0 0 12px",

                color:
                  "#5b6274",
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

      {/* GUIDANCE CONTENT */}

      <div style={styles.infoGrid}>
        <ListCard
          icon="♡"
          title="What children need to know"
          items={
            group.children
          }
        />

        <ListCard
          icon="✓"
          title="What parents should teach"
          items={
            group.teach
          }
        />

        <ListCard
          icon="✕"
          title="What NOT to do"
          items={
            group.dont
          }
        />

        <ListCard
          icon="💬"
          title="Conversation starters"
          items={
            group.conversations
          }
        />

        <ListCard
          icon="◯"
          title="Healthy boundaries"
          items={
            group.boundaries
          }
        />

        <ListCard
          icon="🛡"
          title="Digital safety"
          items={
            group.digital
          }
        />
      </div>

      {/* PROFESSIONAL SUPPORT */}

      <div style={styles.help}>
        <span className="eyebrow">
          PROFESSIONAL SUPPORT
        </span>

        <h3
          style={{
            margin:
              "8px 0",
          }}
        >
          When to seek professional help
        </h3>

        <p style={styles.paragraph}>
          {group.help}
        </p>
      </div>

      {/* URGENT SAFETY */}

      {safeArray(
        group.urgent
      ).length >
        0 && (
        <div style={styles.urgent}>
          <span className="eyebrow">
            URGENT SAFETY
          </span>

          <h3
            style={{
              margin:
                "8px 0 10px",
            }}
          >
            Immediate safety takes priority
          </h3>

          <ul style={styles.list}>
            {safeArray(
              group.urgent
            ).map(
              item => (
                <li
                  key={
                    item
                  }
                >
                  {item}
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {/* AGE-SPECIFIC SOURCES */}

      <SourceSection
        title="Sources for this age guidance"
        description="These official references support the guidance shown for the selected developmental stage. Some trusted sources cover more than one age group, so a source may appropriately appear in multiple age ranges."
        sources={
          groupSources
        }
        reviewedAt={
          reviewedAt
        }
        linkLabel="Open source →"
      />

      {/* DISCLAIMER */}

      <div
        className="notice-box"
        style={{
          marginTop:
            "20px",
        }}
      >
        <strong>
          Educational guidance
        </strong>

        <p>
          {meta?.disclaimer ||
            "InnerVoice Parent Education Hub provides general educational information and does not diagnose abuse, trauma or mental-health conditions."}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   REVIEW ROW
========================================================= */

function ReviewRow({
  reviewedAt,
  sourceCount,
  label,
}) {
  return (
    <section
      style={
        styles.reviewRow
      }
      aria-label="Guidance review information"
    >
      <div
        style={
          styles.reviewBadge
        }
      >
        <span
          style={
            styles.reviewDot
          }
          aria-hidden="true"
        />

        <span>
          Last reviewed{" "}
          {formatDate(
            reviewedAt
          )}
        </span>
      </div>

      <p
        style={
          styles.reviewText
        }
      >
        {sourceCount}{" "}
        {label}
      </p>
    </section>
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
      {VALID_AGES.map(
        age => {
          const active =
            selected ===
            age;

          return (
            <button
              key={age}
              type="button"
              aria-pressed={
                active
              }
              style={{
                ...styles.tab,

                ...(active
                  ? styles
                      .activeTab
                  : {}),
              }}
              onClick={() =>
                onSelect(age)
              }
            >
              {AGE_LABELS[age]}
            </button>
          );
        }
      )}
    </div>
  );
}

/* =========================================================
   LIST CARD
========================================================= */

function ListCard({
  icon,
  title,
  items,
}) {
  const safeItems =
    safeArray(items);

  return (
    <article style={styles.infoCard}>
      <h3
        style={{
          margin:
            "0 0 12px",

          fontSize:
            "18px",
        }}
      >
        <span
          style={{
            marginRight:
              "8px",
          }}
        >
          {icon}
        </span>

        {title}
      </h3>

      {safeItems.length >
      0 ? (
        <ul style={styles.list}>
          {safeItems.map(
            item => (
              <li
                key={item}
              >
                {item}
              </li>
            )
          )}
        </ul>
      ) : (
        <p style={styles.paragraph}>
          No additional items are currently published for
          this section.
        </p>
      )}
    </article>
  );
}

/* =========================================================
   SOURCE SECTION
========================================================= */

function SourceSection({
  title,
  description,
  sources,
  reviewedAt,
  linkLabel,
}) {
  return (
    <section style={styles.sourceSection}>
      <span className="eyebrow">
        EVIDENCE & PROVENANCE
      </span>

      <h2
        style={{
          margin:
            "8px 0 6px",

          fontSize:
            "22px",
        }}
      >
        {title}
      </h2>

      <p style={styles.paragraph}>
        {description}
      </p>

      <p
        style={{
          margin:
            "8px 0 0",

          color:
            "#87756a",

          fontSize:
            "11px",
        }}
      >
        Last reviewed{" "}
        {formatDate(
          reviewedAt
        )}
      </p>

      {sources.length >
      0 ? (
        <div style={styles.sourceGrid}>
          {sources.map(
            source => (
              <article
                key={
                  source.id
                }
                style={
                  styles.sourceCard
                }
              >
                <span
                  style={{
                    display:
                      "block",

                    marginBottom:
                      "5px",

                    color:
                      "#a15f42",

                    fontSize:
                      "10px",

                    fontWeight:
                      850,

                    letterSpacing:
                      "0.08em",
                  }}
                >
                  {source.organization}
                </span>

                <strong
                  style={{
                    display:
                      "block",

                    lineHeight:
                      1.45,
                  }}
                >
                  {source.title}
                </strong>

                {source.type && (
                  <span
                    style={
                      styles.sourceType
                    }
                  >
                    {source.type}
                  </span>
                )}

                {source.note && (
                  <p
                    style={
                      styles.sourceNote
                    }
                  >
                    {source.note}
                  </p>
                )}

                <div
                  style={
                    styles.sourceLink
                  }
                >
                  <a
                    href={
                      source.url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    {linkLabel}
                  </a>
                </div>
              </article>
            )
          )}
        </div>
      ) : (
        <div
          className="notice-box"
          style={{
            marginTop:
              "14px",
          }}
        >
          Source references for this section are currently
          unavailable.
        </div>
      )}
    </section>
  );
}