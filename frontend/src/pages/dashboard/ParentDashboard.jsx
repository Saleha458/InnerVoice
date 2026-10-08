import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getGuidelines,
} from "../../services/guidelineService";

/* =========================================================
   PARENT HUB MODULES
========================================================= */

const parentModules = [
  {
    id:
      "foundations",

    eyebrow:
      "CORE PARENTING SUPPORT",

    title:
      "Parenting Foundations",

    icon:
      "♡",

    description:
      "Learn how to listen calmly, take concerns seriously, support your child and respond when they share something difficult.",

    highlights: [
      "Listen without immediate judgement",
      "Respond calmly and supportively",
      "Know what to do when a child shares a concern",
    ],

    button:
      "Open foundations",

    to:
      "/parent/foundations",

    primary:
      true,
  },

  {
    id:
      "guidelines",

    eyebrow:
      "SOURCE-BACKED AGE GUIDANCE",

    title:
      "Parenting Guidelines",

    icon:
      "▤",

    description:
      "Explore age-specific guidance served dynamically from the Parent Education Hub and linked to trusted public-health sources.",

    highlights: [
      "Guidance for ages 0–18",
      "Healthy boundaries and communication",
      "Digital safety with source provenance",
    ],

    button:
      "Explore guidelines",

    to:
      "/parent/guidelines?age=0-3",

    primary:
      false,
  },

  {
    id:
      "warnings",

    eyebrow:
      "NOTICE IMPORTANT CHANGES",

    title:
      "Warning Signs",

    icon:
      "!",

    description:
      "Review age-specific behavioural and emotional changes with clear context about persistence, daily functioning and when to seek help.",

    highlights: [
      "Age-specific warning signs",
      "How parents can respond",
      "Urgent-safety guidance for serious risk",
    ],

    button:
      "View warning signs",

    to:
      "/parent/warnings?age=0-3",

    primary:
      false,
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  value
) {
  if (
    !value
  ) {
    return "Not available";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value
    );
  }

  return date
    .toLocaleDateString(
      undefined,

      {
        day:
          "numeric",

        month:
          "short",

        year:
          "numeric",
      }
    );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  intro: {
    maxWidth:
      "760px",

    marginBottom:
      "28px",
  },

  introText: {
    color:
      "#5f6678",

    lineHeight:
      1.7,

    marginTop:
      "10px",

    maxWidth:
      "720px",
  },

  evidencePanel: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",

    gap:
      "12px",

    marginBottom:
      "24px",

    padding:
      "18px 20px",

    border:
      "1px solid #ead9cd",

    borderRadius:
      "18px",

    background:
      "linear-gradient(135deg, #fffaf6 0%, #ffffff 100%)",
  },

  evidenceItem: {
    minWidth:
      0,
  },

  evidenceLabel: {
    display:
      "block",

    marginBottom:
      "5px",

    color:
      "#a15f42",

    fontSize:
      "10px",

    fontWeight:
      800,

    letterSpacing:
      "0.1em",
  },

  evidenceValue: {
    margin:
      0,

    color:
      "#403631",

    lineHeight:
      1.55,

    fontSize:
      "13px",
  },

  grid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",

    gap:
      "20px",
  },

  card: {
    position:
      "relative",

    display:
      "flex",

    flexDirection:
      "column",

    minHeight:
      "390px",

    padding:
      "28px",

    border:
      "1px solid #e5e7ef",

    borderRadius:
      "22px",

    background:
      "#ffffff",

    boxShadow:
      "0 12px 35px rgba(30, 35, 60, 0.05)",
  },

  icon: {
    width:
      "54px",

    height:
      "54px",

    display:
      "grid",

    placeItems:
      "center",

    borderRadius:
      "15px",

    background:
      "#fff0e5",

    color:
      "#a85f3c",

    fontSize:
      "24px",

    marginBottom:
      "22px",
  },

  title: {
    margin:
      "7px 0 10px",

    fontSize:
      "25px",

    lineHeight:
      1.25,
  },

  description: {
    color:
      "#5d6578",

    lineHeight:
      1.65,

    margin:
      0,
  },

  list: {
    display:
      "grid",

    gap:
      "10px",

    listStyle:
      "none",

    padding:
      0,

    margin:
      "22px 0 28px",
  },

  listItem: {
    display:
      "flex",

    gap:
      "10px",

    alignItems:
      "flex-start",

    color:
      "#4e5669",

    lineHeight:
      1.5,
  },

  check: {
    width:
      "22px",

    height:
      "22px",

    minWidth:
      "22px",

    display:
      "grid",

    placeItems:
      "center",

    borderRadius:
      "50%",

    background:
      "#fff0e5",

    color:
      "#a85f3c",

    fontSize:
      "11px",

    fontWeight:
      700,
  },

  buttonArea: {
    marginTop:
      "auto",
  },

  contextCard: {
    marginTop:
      "24px",

    padding:
      "20px 22px",

    border:
      "1px solid #ead9cd",

    borderRadius:
      "18px",

    background:
      "#fffaf6",
  },

  sourceGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",

    gap:
      "12px",

    marginTop:
      "14px",
  },

  sourceCard: {
    padding:
      "14px 15px",

    border:
      "1px solid #eadfd7",

    borderRadius:
      "13px",

    background:
      "#ffffff",
  },

  footer: {
    marginTop:
      "28px",

    padding:
      "18px 22px",

    border:
      "1px solid #e5e7ef",

    borderRadius:
      "16px",

    background:
      "#fafaff",
  },
};

/* =========================================================
   COMPONENT
========================================================= */

export default function ParentDashboard() {
  const [
    meta,
    setMeta,
  ] = useState(
    null
  );

  const [
    sources,
    setSources,
  ] = useState(
    []
  );

  const [
    sourceStatus,
    setSourceStatus,
  ] = useState(
    "loading"
  );

  /* =======================================================
     LOAD CURRENT SOURCE METADATA
  ======================================================= */

  useEffect(
    () => {
      let active =
        true;

      const load =
        async () => {
          try {
            setSourceStatus(
              "loading"
            );

            const response =
              await getGuidelines();

            if (
              !active
            ) {
              return;
            }

            setMeta(
              response
                ?.meta ||
                null
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

            setSourceStatus(
              "ready"
            );
          } catch (
            error
          ) {
            console.error(
              "Parent evidence summary error:",

              error
            );

            if (
              active
            ) {
              setSourceStatus(
                "unavailable"
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
     CURRENT CONTEXT
  ======================================================= */

  const contextItem =
    Array.isArray(
      meta?.context
    )
      ? meta
          .context[0]
      : null;

  const featuredSources =
    useMemo(
      () =>
        sources.slice(
          0,
          4
        ),

      [
        sources,
      ]
    );

  const sourceForContext =
    useMemo(
      () =>
        sources.find(
          source =>
            source.id ===
            contextItem
              ?.sourceId
        ) ||
        null,

      [
        sources,
        contextItem,
      ]
    );

  return (
    <div className="page-shell">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div style={styles.intro}>
        <span className="eyebrow">
          PARENT EDUCATION HUB
        </span>

        <h1
          style={{
            margin:
              "8px 0 0",
          }}
        >
          Parent Support Center
        </h1>

        <p style={styles.introText}>
          Practical parenting information with age-specific
          guidance, warning-sign context and clear links to
          trusted public-health sources.
        </p>
      </div>

      {/* =================================================
          SOURCE / REVIEW STATUS
      ================================================= */}

      <section
        style={
          styles.evidencePanel
        }
        aria-label="Parent guidance evidence status"
      >
        <div style={styles.evidenceItem}>
          <span style={styles.evidenceLabel}>
            CONTENT MODEL
          </span>

          <p style={styles.evidenceValue}>
            {sourceStatus ===
            "ready"
              ? "Source-backed guidance loaded from Firestore"

              : sourceStatus ===
                "loading"
                ? "Loading source-backed guidance..."

                : "Guidance is available, but source metadata could not be loaded."}
          </p>
        </div>

        <div style={styles.evidenceItem}>
          <span style={styles.evidenceLabel}>
            LAST REVIEWED
          </span>

          <p style={styles.evidenceValue}>
            {formatDate(
              meta
                ?.reviewedAt
            )}
          </p>
        </div>

        <div style={styles.evidenceItem}>
          <span style={styles.evidenceLabel}>
            TRUSTED SOURCES
          </span>

          <p style={styles.evidenceValue}>
            {sources.length
              ? `${sources.length} official source references available`
              : "Source directory loading"}
          </p>
        </div>
      </section>

      {/* =================================================
          THREE MAIN MODULES
      ================================================= */}

      <div style={styles.grid}>
        {parentModules.map(
          module => (
            <article
              key={
                module.id
              }
              style={
                styles.card
              }
            >
              <div style={styles.icon}>
                {
                  module
                    .icon
                }
              </div>

              <span className="eyebrow">
                {
                  module
                    .eyebrow
                }
              </span>

              <h2 style={styles.title}>
                {
                  module
                    .title
                }
              </h2>

              <p style={styles.description}>
                {
                  module
                    .description
                }
              </p>

              <ul style={styles.list}>
                {module
                  .highlights
                  .map(
                    item => (
                      <li
                        key={
                          item
                        }
                        style={
                          styles
                            .listItem
                        }
                      >
                        <span
                          style={
                            styles
                              .check
                          }
                        >
                          ✓
                        </span>

                        <span>
                          {
                            item
                          }
                        </span>
                      </li>
                    )
                  )}
              </ul>

              <div style={styles.buttonArea}>
                <Link
                  to={
                    module.to
                  }
                  className={
                    module
                      .primary
                      ? "primary-button"
                      : "secondary-button"
                  }
                >
                  {
                    module
                      .button
                  }{" "}
                  →
                </Link>
              </div>
            </article>
          )
        )}
      </div>

      {/* =================================================
          CURRENT REAL-WORLD CONTEXT
      ================================================= */}

      {contextItem && (
        <section style={styles.contextCard}>
          <span className="eyebrow">
            CURRENT EVIDENCE SNAPSHOT
          </span>

          <h2
            style={{
              margin:
                "8px 0 8px",

              fontSize:
                "21px",
            }}
          >
            {
              contextItem
                .title
            }
          </h2>

          <p
            style={{
              margin:
                0,

              color:
                "#555d70",

              lineHeight:
                1.7,
            }}
          >
            {
              contextItem
                .text
            }
          </p>

          <p
            style={{
              margin:
                "10px 0 0",

              color:
                "#77706b",

              lineHeight:
                1.6,

              fontSize:
                "12px",
            }}
          >
            {
              contextItem
                .note
            }
          </p>

          <div
            style={{
              marginTop:
                "12px",

              display:
                "flex",

              flexWrap:
                "wrap",

              gap:
                "10px",

              alignItems:
                "center",
            }}
          >
            <span
              style={{
                fontSize:
                  "12px",

                color:
                  "#75665e",
              }}
            >
              Evidence date:{" "}
              {formatDate(
                contextItem
                  .asOf
              )}
            </span>

            {sourceForContext
              ?.url && (
              <a
                href={
                  sourceForContext
                    .url
                }
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Open official source →
              </a>
            )}
          </div>
        </section>
      )}

      {/* =================================================
          TRUSTED SOURCE DIRECTORY PREVIEW
      ================================================= */}

      {featuredSources.length >
        0 && (
        <section
          style={{
            marginTop:
              "24px",
          }}
        >
          <span className="eyebrow">
            TRUSTED SOURCE DIRECTORY
          </span>

          <h2
            style={{
              margin:
                "8px 0 5px",

              fontSize:
                "22px",
            }}
          >
            Where this guidance comes from
          </h2>

          <p
            style={{
              margin:
                0,

              color:
                "#666d7e",

              lineHeight:
                1.6,
            }}
          >
            InnerVoice summarizes general educational
            guidance and always keeps the official source
            available for parents to review directly.
          </p>

          <div style={styles.sourceGrid}>
            {featuredSources.map(
              source => (
                <article
                  key={
                    source.id
                  }
                  style={
                    styles
                      .sourceCard
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
                        800,

                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    {
                      source
                        .organization
                    }
                  </span>

                  <strong
                    style={{
                      display:
                        "block",

                      lineHeight:
                        1.45,
                    }}
                  >
                    {
                      source
                        .title
                    }
                  </strong>

                  <a
                    href={
                      source.url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                    style={{
                      display:
                        "inline-block",

                      marginTop:
                        "9px",
                    }}
                  >
                    View source →
                  </a>
                </article>
              )
            )}
          </div>
        </section>
      )}

      {/* =================================================
          DISCLAIMER
      ================================================= */}

      <div style={styles.footer}>
        <strong>
          Educational support, not diagnosis
        </strong>

        <p
          style={{
            margin:
              "5px 0 0",

            color:
              "#666d7e",

            lineHeight:
              1.6,
          }}
        >
          InnerVoice provides general educational
          information. A single warning sign does not prove
          abuse, trauma or a mental-health condition.
          Persistent, severe or safety-related concerns
          should be discussed with an appropriate qualified
          professional.
        </p>
      </div>
    </div>
  );
}