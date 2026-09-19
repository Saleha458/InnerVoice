import {
  Link,
} from "react-router-dom";

/* =========================================================
   STYLES
========================================================= */

const styles = {
  intro: {
    padding:
      "28px",

    border:
      "1px solid #e4e6ee",

    borderRadius:
      "20px",

    background:
      "#ffffff",

    marginBottom:
      "22px",
  },

  gridThree: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",

    gap:
      "16px",

    marginTop:
      "22px",
  },

  gridFour: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",

    gap:
      "16px",

    marginTop:
      "20px",
  },

  card: {
    padding:
      "22px",

    border:
      "1px solid #e5e7ef",

    borderRadius:
      "17px",

    background:
      "#fafaff",
  },

  whiteCard: {
    padding:
      "22px",

    border:
      "1px solid #e5e7ef",

    borderRadius:
      "17px",

    background:
      "#ffffff",
  },

  paragraph: {
    margin:
      0,

    color:
      "#555d70",

    lineHeight:
      1.65,
  },

  navigation: {
    display:
      "flex",

    gap:
      "12px",

    flexWrap:
      "wrap",

    marginTop:
      "24px",
  },
};

/* =========================================================
   COMPONENT
========================================================= */

export default function ParentingFoundations() {
  return (
    <div className="page-shell">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-header">
        <div>
          <span className="eyebrow">
            PARENT EDUCATION HUB
          </span>

          <h1>
            Parenting Foundations
          </h1>

          <p>
            Core communication principles that can help
            children and teenagers feel safer, heard and
            supported.
          </p>
        </div>
      </div>

      {/* =================================================
          LISTEN FIRST
      ================================================= */}

      <section
        style={
          styles.intro
        }
      >
        <span className="eyebrow">
          PARENTING FOUNDATION
        </span>

        <h2
          style={{
            margin:
              "8px 0 10px",
          }}
        >
          Listen first. Respond calmly.
        </h2>

        <p
          style={{
            ...styles.paragraph,

            maxWidth:
              "950px",
          }}
        >
          Children and teenagers are more likely to speak
          openly when they feel heard without immediate
          blame, punishment or humiliation.
        </p>

        <div
          style={
            styles.gridThree
          }
        >
          {/* LISTEN */}

          <article
            style={
              styles.card
            }
          >
            <span className="eyebrow">
              01
            </span>

            <h3>
              Listen
            </h3>

            <p
              style={
                styles.paragraph
              }
            >
              Give them time to speak before asking lots of
              questions or immediately offering solutions.
            </p>
          </article>

          {/* CONCERNS */}

          <article
            style={
              styles.card
            }
          >
            <span className="eyebrow">
              02
            </span>

            <h3>
              Take concerns seriously
            </h3>

            <p
              style={
                styles.paragraph
              }
            >
              Fear, discomfort and sudden emotional changes
              deserve calm attention rather than dismissal.
            </p>
          </article>

          {/* SUPPORT */}

          <article
            style={
              styles.card
            }
          >
            <span className="eyebrow">
              03
            </span>

            <h3>
              Stay supportive
            </h3>

            <p
              style={
                styles.paragraph
              }
            >
              Make it clear that asking for help is allowed
              and that another person's harmful behaviour is
              not their fault.
            </p>
          </article>
        </div>
      </section>

      {/* =================================================
          CHILD SHARES A CONCERN
      ================================================= */}

      <section
        style={
          styles.intro
        }
      >
        <span className="eyebrow">
          IF A CHILD SHARES A CONCERN
        </span>

        <h2
          style={{
            margin:
              "8px 0 10px",
          }}
        >
          Four things to remember
        </h2>

        <p
          style={{
            ...styles.paragraph,

            maxWidth:
              "900px",
          }}
        >
          Your first response can strongly influence whether
          a child feels safe enough to continue speaking.
        </p>

        <div
          style={
            styles.gridFour
          }
        >
          <article
            style={
              styles.whiteCard
            }
          >
            <h3>
              Stay calm
            </h3>

            <p
              style={
                styles.paragraph
              }
            >
              A calm response makes it easier for them to
              continue speaking.
            </p>
          </article>

          <article
            style={
              styles.whiteCard
            }
          >
            <h3>
              Listen
            </h3>

            <p
              style={
                styles.paragraph
              }
            >
              Allow them to use their own words without
              repeated questioning.
            </p>
          </article>

          <article
            style={
              styles.whiteCard
            }
          >
            <h3>
              Reassure
            </h3>

            <p
              style={
                styles.paragraph
              }
            >
              Tell them they did the right thing by speaking
              and that another person's harmful behaviour is
              not their fault.
            </p>
          </article>

          <article
            style={
              styles.whiteCard
            }
          >
            <h3>
              Seek help when needed
            </h3>

            <p
              style={
                styles.paragraph
              }
            >
              Serious safety or emotional concerns may
              require qualified professional or emergency
              support.
            </p>
          </article>
        </div>
      </section>

      {/* =================================================
          ADDITIONAL PRINCIPLES
      ================================================= */}

      <section
        style={
          styles.intro
        }
      >
        <span className="eyebrow">
          EVERYDAY COMMUNICATION
        </span>

        <h2
          style={{
            margin:
              "8px 0 10px",
          }}
        >
          Create a safer environment for communication
        </h2>

        <div
          style={
            styles.gridThree
          }
        >
          <article
            style={
              styles.whiteCard
            }
          >
            <h3>
              Avoid blame
            </h3>

            <p
              style={
                styles.paragraph
              }
            >
              Children should not feel responsible for
              another person's inappropriate or harmful
              actions.
            </p>
          </article>

          <article
            style={
              styles.whiteCard
            }
          >
            <h3>
              Respect boundaries
            </h3>

            <p
              style={
                styles.paragraph
              }
            >
              Respect age-appropriate privacy and teach that
              personal boundaries matter.
            </p>
          </article>

          <article
            style={
              styles.whiteCard
            }
          >
            <h3>
              Keep communication open
            </h3>

            <p
              style={
                styles.paragraph
              }
            >
              Remind children that they can return to you
              later if they are not ready to talk immediately.
            </p>
          </article>
        </div>
      </section>

      {/* =================================================
          NEXT SECTIONS
      ================================================= */}

      <div
        style={
          styles.navigation
        }
      >
        <Link
          to="/parent/guidelines?age=0-3"
          className="primary-button"
        >
          Age-specific guidelines →
        </Link>

        <Link
          to="/parent/warnings?age=0-3"
          className="secondary-button"
        >
          Warning signs →
        </Link>
      </div>

      {/* =================================================
          DISCLAIMER
      ================================================= */}

      <div
        className="notice-box"
        style={{
          marginTop:
            "24px",
        }}
      >
        <strong>
          Educational guidance
        </strong>

        <p>
          InnerVoice Parent Education Hub provides general
          educational information. It does not diagnose
          abuse, trauma or mental-health conditions.
        </p>
      </div>
    </div>
  );
}