
import { Link } from "react-router-dom";
import "./Landing.css";

const supportOptions = [
  {
    number: "01",
    icon: "✦",
    category: "AI COMPANION",
    title: "A place to put feelings into words.",
    description:
      "Talk with InnerVoice AI when you need a starting point. Share what feels comfortable and receive a supportive response.",
    className: "iv-home-card-lavender",
  },
  {
    number: "02",
    icon: "◌",
    category: "PERSONAL REFLECTION",
    title: "Make space for your own thoughts.",
    description:
      "Check in with your mood, write in your private journal, and return to your reflections whenever you want.",
    className: "iv-home-card-sage",
  },
  {
    number: "03",
    icon: "♡",
    category: "HUMAN SUPPORT",
    title: "Reach out when you're ready.",
    description:
      "Explore administrator-verified professional profiles, request a session, and connect after an expert accepts.",
    className: "iv-home-card-peach",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your private space",
    description:
      "Users aged 15 and above can register with an anonymous ID instead of providing their real name.",
  },
  {
    number: "02",
    title: "Choose your starting point",
    description:
      "Begin an AI conversation, reflect privately, or explore support from a verified professional.",
  },
  {
    number: "03",
    title: "Continue at your own pace",
    description:
      "Return to your saved conversations and reflections when you sign back in.",
  },
];

export default function Landing() {
  return (
    <div className="iv-home" id="top">
      <a className="iv-home-skip" href="#main-content">
        Skip to content
      </a>

      {/* =========================================
          NAVIGATION
      ========================================= */}

      <header className="iv-home-header">
        <div className="iv-home-container iv-home-nav">
          <Link
            to="/"
            className="iv-home-brand"
            aria-label="InnerVoice home"
          >
            <span className="iv-home-brand-icon" aria-hidden="true">
              ✳
            </span>

            <span className="iv-home-brand-name">
              Inner<span>Voice</span>
            </span>
          </Link>

          <nav
            className="iv-home-nav-links"
            aria-label="Main navigation"
          >
            <a href="#support">Our approach</a>
            <a href="#how-it-works">How it works</a>
            <a href="#for-everyone">For everyone</a>
          </nav>

          <div className="iv-home-nav-actions">
            <Link to="/login" className="iv-home-signin">
              Sign in
            </Link>

            <Link to="/register" className="iv-home-nav-cta">
              Create your space
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* =========================================
            HERO
        ========================================= */}

        <section className="iv-home-hero">
          <div className="iv-home-container iv-home-hero-grid">
            <div className="iv-home-hero-copy">
              <div className="iv-home-eyebrow">
                <span className="iv-home-eyebrow-dot" />
                A THOUGHTFUL SPACE TO BE HEARD
              </div>

              <h1>
                Every feeling
                <br />
                deserves
                <br />
                <em>a little space.</em>
              </h1>

              <p className="iv-home-hero-description">
                Some things are difficult to say out loud.
                InnerVoice brings together a supportive AI
                companion, personal reflection tools, and
                access to verified professionals — so you
                can begin in the way that feels right for you.
              </p>

              <a className="iv-home-explore-link" href="#support">
                <span
                  className="iv-home-explore-icon"
                  aria-hidden="true"
                >
                  ↓
                </span>

                Explore InnerVoice
              </a>

              <div className="iv-home-hero-bottom">
                <span>ANONYMOUS USER IDENTITY</span>

                <span
                  className="iv-home-hero-divider"
                  aria-hidden="true"
                />

                <span>YOUR PACE, YOUR SPACE</span>
              </div>
            </div>

            {/* Illustrative preview, not an actual chat */}

            <div className="iv-home-hero-art">
              <div
                className="iv-home-art-circle iv-home-art-circle-one"
                aria-hidden="true"
              />

              <div
                className="iv-home-art-circle iv-home-art-circle-two"
                aria-hidden="true"
              />

              <span
                className="iv-home-art-leaf iv-home-art-leaf-one"
                aria-hidden="true"
              >
                ✳
              </span>

              <span
                className="iv-home-art-leaf iv-home-art-leaf-two"
                aria-hidden="true"
              >
                ✦
              </span>

              <div className="iv-home-preview">
                <div className="iv-home-preview-top">
                  <span className="iv-home-preview-avatar">
                    ✦
                  </span>

                  <div className="iv-home-preview-identity">
                    <strong>InnerVoice AI</strong>

                    <small>
                      <span className="iv-home-preview-online" />
                      Here to listen
                    </small>
                  </div>

                  <span className="iv-home-preview-private">
                    ◇ Private
                  </span>
                </div>

                <div className="iv-home-preview-body">
                  <span className="iv-home-preview-caption">
                    A SMALL MOMENT OF SUPPORT
                  </span>

                  <div className="iv-home-preview-user">
                    I don't know where to begin.
                  </div>

                  <div className="iv-home-preview-response">
                    <span
                      className="iv-home-preview-response-icon"
                      aria-hidden="true"
                    >
                      ✦
                    </span>

                    <p>
                      That's okay. You don't need to find
                      the perfect words. We can start
                      wherever feels comfortable.
                    </p>
                  </div>

                  <div className="iv-home-preview-input">
                    Your thoughts, in your own words…

                    <span aria-hidden="true">↗</span>
                  </div>

                  <small className="iv-home-preview-footnote">
                    Illustrative preview
                  </small>
                </div>
              </div>

              <div className="iv-home-floating-card">
                <span aria-hidden="true">♡</span>

                <div>
                  <strong>One step at a time</strong>
                  <small>There's no perfect way to begin.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            FEATURES STRIP
        ========================================= */}

        <div className="iv-home-values">
          <div className="iv-home-container iv-home-values-inner">
            <span>✳ Anonymous user accounts</span>
            <span>✳ Personal reflection</span>
            <span>✳ Verified expert profiles</span>
          </div>
        </div>

        {/* =========================================
            OUR APPROACH
        ========================================= */}

        <section
          id="support"
          className="iv-home-section iv-home-support"
        >
          <div className="iv-home-container">
            <div className="iv-home-section-heading">
              <span className="iv-home-section-label">
                THE INNERVOICE APPROACH
              </span>

              <h2>
                Support can begin
                <br />
                <em>in different ways.</em>
              </h2>

              <span
                className="iv-home-heading-decoration"
                aria-hidden="true"
              />
            </div>

            <div className="iv-home-support-grid">
              {supportOptions.map((option) => (
                <article
                  key={option.number}
                  className={`iv-home-support-card ${option.className}`}
                >
                  <div className="iv-home-support-card-top">
                    <span
                      className="iv-home-support-icon"
                      aria-hidden="true"
                    >
                      {option.icon}
                    </span>

                    <span className="iv-home-support-number">
                      {option.number}
                    </span>
                  </div>

                  <div className="iv-home-support-content">
                    <span className="iv-home-card-label">
                      {option.category}
                    </span>

                    <h3>{option.title}</h3>

                    <p>{option.description}</p>
                  </div>

                  <span
                    className="iv-home-card-ornament"
                    aria-hidden="true"
                  >
                    ✳
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================
            HOW IT WORKS
        ========================================= */}

        <section
          id="how-it-works"
          className="iv-home-section iv-home-how"
        >
          <div className="iv-home-container iv-home-how-grid">
            <div className="iv-home-how-intro">
              <span className="iv-home-section-label">
                A GENTLE BEGINNING
              </span>

              <h2>
                Start simply.
                <br />
                <em>Stay in control.</em>
              </h2>

              <p>
                You decide what to share, which tools
                to use, and when to return.
              </p>

              <div
                className="iv-home-how-decoration"
                aria-hidden="true"
              >
                <span>✳</span>
                <span />
              </div>
            </div>

            <div className="iv-home-steps">
              {steps.map((step) => (
                <article className="iv-home-step" key={step.number}>
                  <span className="iv-home-step-number">
                    {step.number}
                  </span>

                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================
            PARENTS AND EXPERTS
        ========================================= */}

        <section
          id="for-everyone"
          className="iv-home-section iv-home-people"
        >
          <div className="iv-home-container">
            <div className="iv-home-people-heading">
              <span className="iv-home-section-label">
                SUPPORT BEYOND ONE PERSON
              </span>

              <h2>
                Understanding grows
                <br />
                <em>when we grow together.</em>
              </h2>

              <p>
                Dedicated spaces for parents and
                qualified professionals.
              </p>
            </div>

            <div className="iv-home-people-grid">
              <article className="iv-home-people-card iv-home-parent">
                <div className="iv-home-people-top">
                  <span
                    className="iv-home-people-icon"
                    aria-hidden="true"
                  >
                    ♡
                  </span>

                  <span className="iv-home-people-index">
                    01 / PARENTS
                  </span>
                </div>

                <h3>
                  Understanding
                  <br />
                  starts at home.
                </h3>

                <p>
                  Explore age-appropriate parenting
                  guidance, healthy boundaries,
                  conversation starters, and warning
                  signs in the Parent Education Hub.
                </p>

                <span className="iv-home-people-note">
                  Parenting foundations · Ages 0–18
                </span>
              </article>

              <article className="iv-home-people-card iv-home-expert">
                <div className="iv-home-people-top">
                  <span
                    className="iv-home-people-icon"
                    aria-hidden="true"
                  >
                    ✳
                  </span>

                  <span className="iv-home-people-index">
                    02 / PROFESSIONALS
                  </span>
                </div>

                <h3>
                  Human connection
                  <br />
                  matters.
                </h3>

                <p>
                  Qualified professionals can submit
                  their details for administrator review.
                  Approved experts can receive support
                  requests and conduct private sessions.
                </p>

                <span className="iv-home-people-note">
                  Professional review · Session support
                </span>
              </article>
            </div>

            {/* Compact safety information instead of
                a large footer or closing banner. */}

            <p className="iv-home-safety-note">
              InnerVoice offers emotional support and
              education, not emergency care. If someone
              is in immediate danger, contact appropriate
              local emergency services.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}