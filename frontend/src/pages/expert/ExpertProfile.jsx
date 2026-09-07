import { useEffect, useState } from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getExpert,
  sendExpertRequest,
} from "../../services/expertService";

export default function ExpertProfile() {
  const { id } = useParams();

  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadExpert = async () => {
      try {
        setLoading(true);

        const response = await getExpert(id);

        setExpert(response.expert);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load expert profile."
        );
      } finally {
        setLoading(false);
      }
    };

    loadExpert();
  }, [id]);

  const handleRequest = async () => {
    try {
      setRequesting(true);
      setError("");
      setMessage("");

      await sendExpertRequest({
        expertId: id,
        message:
          "I would like to request a private support session.",
      });

      setMessage(
        "Your support request has been sent. The expert will be notified."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to send support request."
      );
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="loading-card">
          <div className="loading-spinner" />
          <p>Loading expert profile...</p>
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="page-shell">
        <div className="empty-card">
          <h2>Expert not found</h2>
          <Link to="/experts">
            Return to Find Expert
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Link
        to="/experts"
        className="back-link"
      >
        ← Back to experts
      </Link>

      <section className="expert-profile-card">
        <div className="expert-profile-header">
          <div className="expert-avatar">
            {expert.name
              ?.charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <div className="verification-badge">
              ✓ Verified Expert
            </div>

            <h1>{expert.name}</h1>

            <p className="expert-specialization">
              {expert.specialization}
            </p>
          </div>
        </div>

        <div className="expert-profile-grid">
          <div>
            <span>Gender</span>
            <strong>
              {expert.gender || "Not specified"}
            </strong>
          </div>

          <div>
            <span>Experience</span>
            <strong>
              {expert.experienceYears || 0} years
            </strong>
          </div>

          <div>
            <span>Qualification</span>
            <strong>
              {expert.qualification ||
                "Professional qualification"}
            </strong>
          </div>
        </div>

        <div className="expert-about">
          <h3>About this expert</h3>
          <p>
            {expert.bio ||
              "A verified InnerVoice support professional committed to providing a safe and respectful space."}
          </p>
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {message && (
          <div className="success-box">
            {message}
          </div>
        )}

        <div className="expert-actions">
          <button
            className="primary-button"
            onClick={handleRequest}
            disabled={requesting}
          >
            {requesting
              ? "Sending..."
              : "Request Support"}
          </button>

          <Link
            to={`/bookings/new?expertId=${expert.id}`}
            className="secondary-button"
          >
            Book Session
          </Link>
        </div>
      </section>
    </div>
  );
}