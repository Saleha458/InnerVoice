import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

import {
  quickExit,
  getQuickExitDestinations,
  getQuickExitPreference,
  setQuickExitPreference,
} from "../../utils/quickExit";

export default function UserDashboard() {
  const { user } = useAuth();

  const destinations =
    getQuickExitDestinations();

  const [exitPreference, setExitPreference] =
    useState(getQuickExitPreference());

  useEffect(() => {
    setQuickExitPreference(exitPreference);
  }, [exitPreference]);

  const handleQuickExit = () => {
    /*
     * Remember that the user left the dashboard.
     * AIChat stores its own conversation state.
     */
    sessionStorage.setItem(
      "innervoice_quick_exit",
      "dashboard-exit"
    );

    quickExit(exitPreference);
  };

  return (
    <div className="dashboard-page">

      {/* =========================================
          DASHBOARD HEADER
      ========================================= */}

      <section className="dashboard-hero">

        <div className="dashboard-welcome">

          <span className="eyebrow">
            YOUR PRIVATE SPACE
          </span>

          <h1>
            Welcome back,
            <br />

            <span>
              {user?.anonymousId ||
                "Anonymous"}
            </span>
          </h1>

          <p>
            You don't have to carry everything
            alone. Take a breath, check in with
            yourself, or reach out when you're ready.
          </p>

        </div>

        {/* =====================================
            QUICK EXIT
            USER DASHBOARD ONLY
        ===================================== */}

        <div className="quick-exit-area">

          <button
            type="button"
            className="quick-exit-button"
            onClick={handleQuickExit}
            title="Quickly leave InnerVoice"
          >
            <span className="quick-exit-icon">
              ↗
            </span>

            Quick Exit
          </button>

          <label
            className="quick-exit-preference"
          >
            <span>
              Exit destination
            </span>

            <select
              value={exitPreference}
              onChange={(event) =>
                setExitPreference(
                  event.target.value
                )
              }
              aria-label="Quick Exit destination"
            >
              {Object.entries(
                destinations
              ).map(
                ([key, destination]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {destination.name}
                  </option>
                )
              )}
            </select>
          </label>

        </div>

      </section>

      {/* =========================================
          FEATURE GRID
      ========================================= */}

      <section className="dashboard-grid">

        <Link
          to="/chat"
          className="dashboard-feature-card ai-card"
        >
          <span className="feature-icon">
            ✦
          </span>

          <h3>
            Talk to InnerVoice AI
          </h3>

          <p>
            A private space to express
            what's on your mind and receive
            supportive guidance.
          </p>

          <span className="card-action">
            Start conversation →
          </span>
        </Link>

        <Link
          to="/experts"
          className="dashboard-feature-card"
        >
          <span className="feature-icon">
            ♧
          </span>

          <h3>
            Find a Verified Expert
          </h3>

          <p>
            Explore verified professionals
            and request human support when
            you're ready.
          </p>

          <span className="card-action">
            Find support →
          </span>
        </Link>

        <Link
          to="/mood"
          className="dashboard-feature-card"
        >
          <span className="feature-icon">
            ◉
          </span>

          <h3>
            Mood Check-in
          </h3>

          <p>
            Track how you're feeling and
            understand your emotional patterns.
          </p>

          <span className="card-action">
            Check in →
          </span>
        </Link>

        <Link
          to="/journal"
          className="dashboard-feature-card"
        >
          <span className="feature-icon">
            ▤
          </span>

          <h3>
            Private Journal
          </h3>

          <p>
            Put your thoughts somewhere private
            and return to them whenever you want.
          </p>

          <span className="card-action">
            Write →
          </span>
        </Link>

        <Link
          to="/bookings"
          className="dashboard-feature-card"
        >
          <span className="feature-icon">
            ◷
          </span>

          <h3>
            My Sessions
          </h3>

          <p>
            View your expert sessions, booking
            details and upcoming appointments.
          </p>

          <span className="card-action">
            View sessions →
          </span>
        </Link>

        <Link
          to="/notifications"
          className="dashboard-feature-card"
        >
          <span className="feature-icon">
            ♢
          </span>

          <h3>
            Notifications
          </h3>

          <p>
            Check AI responses, expert requests,
            session reminders and updates.
          </p>

          <span className="card-action">
            View notifications →
          </span>
        </Link>

      </section>

      {/* =========================================
          PRIVACY BANNER
      ========================================= */}

      <section className="privacy-banner">

        <div className="privacy-icon">
          🔒
        </div>

        <div>
          <strong>
            Your space is private
          </strong>

          <p>
            InnerVoice is designed around
            anonymity, privacy and respectful
            support.
          </p>
        </div>

      </section>

    </div>
  );
}