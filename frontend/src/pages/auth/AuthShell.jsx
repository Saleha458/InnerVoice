
import { Link } from "react-router-dom";
import "./Auth.css";

export default function AuthShell({
  children,
  variant = "login",
}) {
  const isRegister = variant === "register";

  return (
    <div className={`auth-page iv-auth-page iv-auth-page--${variant}`}>
      <header className="iv-auth-header">
        <div className="iv-auth-container iv-auth-nav">
          <Link
            to="/"
            className="iv-auth-brand"
            aria-label="InnerVoice home"
          >
            <span className="iv-auth-brand-icon" aria-hidden="true">
              ✳
            </span>

            <span className="iv-auth-brand-name">
              Inner<span>Voice</span>
            </span>
          </Link>

          <Link to="/" className="iv-auth-home-link">
            <span aria-hidden="true">←</span>
            Back to home
          </Link>
        </div>
      </header>

      <main className="iv-auth-container iv-auth-main">
        <section
          className="iv-auth-intro"
          aria-label="About InnerVoice"
        >
          <div className="iv-auth-intro-content">
            <span className="iv-auth-eyebrow">
              <span className="iv-auth-eyebrow-dot" />
              A THOUGHTFUL SPACE TO BE HEARD
            </span>

            <h2>
              {isRegister ? (
                <>
                  A space to
                  <br />
                  <em>begin.</em>
                </>
              ) : (
                <>
                  A space to
                  <br />
                  <em>return to.</em>
                </>
              )}
            </h2>

            <p>
              {isRegister
                ? "Start with an anonymous identity. Explore support, reflect privately, and move at your own pace."
                : "Your conversations and reflections are here when you're ready to continue."}
            </p>

            <div className="iv-auth-intro-line" aria-hidden="true" />

            <div className="iv-auth-intro-note">
              <span aria-hidden="true">✳</span>
              YOUR PACE, YOUR SPACE
            </div>
          </div>

          <div className="iv-auth-art" aria-hidden="true">
            <span className="iv-auth-art-ring iv-auth-art-ring-one" />
            <span className="iv-auth-art-ring iv-auth-art-ring-two" />
            <span className="iv-auth-art-star">✳</span>
          </div>
        </section>

        <div className="iv-auth-form-column">
          {children}
        </div>
      </main>
    </div>
  );
}