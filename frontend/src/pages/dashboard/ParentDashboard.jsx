import {
  Link,
} from "react-router-dom";

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
      "AGE-SPECIFIC SUPPORT",

    title:
      "Parenting Guidelines",

    icon:
      "▤",

    description:
      "Explore practical guidance designed for different childhood and teenage developmental stages.",

    highlights: [
      "Guidance for ages 0–18",
      "Healthy boundaries and communication",
      "Digital safety and conversation starters",
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
      "Understand age-specific behavioural and emotional changes that may deserve careful attention.",

    highlights: [
      "Age-specific warning signs",
      "How parents can respond",
      "When professional support may help",
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
   STYLES
========================================================= */

const styles = {
  intro: {
    maxWidth:
      "760px",

    marginBottom:
      "34px",
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
      "#f1efff",

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
      "#f1efff",

    fontSize:
      "11px",

    fontWeight:
      700,
  },

  buttonArea: {
    marginTop:
      "auto",
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
  return (
    <div className="page-shell">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div
        style={
          styles.intro
        }
      >
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

        <p
          style={
            styles.introText
          }
        >
          Choose the kind of support you need. Explore core
          parenting principles, age-specific guidance or
          warning signs through dedicated sections.
        </p>
      </div>

      {/* =================================================
          THREE MAIN MODULES
      ================================================= */}

      <div
        style={
          styles.grid
        }
      >
        {parentModules.map(
          (
            module
          ) => (
            <article
              key={
                module.id
              }
              style={
                styles.card
              }
            >
              {/* ICON */}

              <div
                style={
                  styles.icon
                }
              >
                {module.icon}
              </div>

              {/* TITLE */}

              <span className="eyebrow">
                {module.eyebrow}
              </span>

              <h2
                style={
                  styles.title
                }
              >
                {module.title}
              </h2>

              <p
                style={
                  styles.description
                }
              >
                {module.description}
              </p>

              {/* SHORT OVERVIEW */}

              <ul
                style={
                  styles.list
                }
              >
                {module.highlights.map(
                  (
                    item
                  ) => (
                    <li
                      key={
                        item
                      }
                      style={
                        styles.listItem
                      }
                    >
                      <span
                        style={
                          styles.check
                        }
                      >
                        ✓
                      </span>

                      <span>
                        {item}
                      </span>
                    </li>
                  )
                )}
              </ul>

              {/* BUTTON */}

              <div
                style={
                  styles.buttonArea
                }
              >
                <Link
                  to={
                    module.to
                  }
                  className={
                    module.primary
                      ? "primary-button"
                      : "secondary-button"
                  }
                >
                  {module.button}
                  {" "}→
                </Link>
              </div>
            </article>
          )
        )}
      </div>

      {/* =================================================
          SMALL DISCLAIMER
      ================================================= */}

      <div
        style={
          styles.footer
        }
      >
        <strong>
          Educational support
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
          InnerVoice Parent Education Hub provides general
          educational information and does not diagnose
          abuse, trauma or mental-health conditions.
        </p>
      </div>
    </div>
  );
}