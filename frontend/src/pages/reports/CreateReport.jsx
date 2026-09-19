import {
  useEffect,
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import {
  createReport,
  getReportRecipient
} from "../../services/reportService";

import {
  isVaultUnlocked
} from "../../services/privateVault";

import "./CreateReport.css";

const categories = [
  ["general", "General concern"],
  ["bullying", "Bullying"],
  ["abuse", "Abuse"],
  ["neglect", "Neglect"],
  ["online-safety", "Online safety"],
  ["other", "Other"]
];

const errorText = error =>
  error?.response?.data?.message ||
  error?.message ||
  "Report could not be sent.";

export default function CreateReport() {
  const navigate = useNavigate();

  const [category, setCategory] = useState("general");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");

  const [recipient, setRecipient] = useState(null);
  const [loadingRecipient, setLoadingRecipient] =
    useState(true);

  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadRecipient() {
    if (!isVaultUnlocked()) {
      return;
    }

    setLoadingRecipient(true);
    setError("");

    try {
      setRecipient(
        await getReportRecipient()
      );
    } catch (cause) {
      setRecipient(null);
      setError(errorText(cause));
    } finally {
      setLoadingRecipient(false);
    }
  }

  useEffect(() => {
    void loadRecipient();
  }, []);

  const clean = description.trim();

  const canSend =
    !busy &&
    Boolean(recipient) &&
    consent &&
    clean.length > 0 &&
    clean.length <= 10000;

  async function submit(event) {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await createReport({
        category,
        severity,
        description: clean
      });

      navigate(
        "/reports",
        {
          replace: true,
          state: {
            submitted: true
          }
        }
      );
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!isVaultUnlocked()) {
    return (
      <div className="page-shell iv-report-page">
        <div className="error-box">
          Unlock your private vault first.{" "}

          <Link to="/journal">
            Go to Journal →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell iv-report-page">
      <header className="page-header iv-report-header">
        <div>
          <span className="eyebrow">
            PRIVATE SUPPORT
          </span>

          <h1>Share a concern</h1>

          <p>
            Your words are a request for support,
            not an independently verified finding.
          </p>
        </div>

        <Link
          className="secondary-button"
          to="/reports"
        >
          ← My reports
        </Link>
      </header>

      <form
        className="iv-report-form"
        onSubmit={submit}
      >
        <div className="iv-report-intro">
          <span className="iv-report-step">
            YOUR EXPERIENCE
          </span>

          <h2>
            What would you like to share?
          </h2>

          <p>
            Write as much or as little as you feel
            comfortable with. Evidence is not required
            to request support.
          </p>
        </div>

        <div className="iv-report-fields">
          <div className="iv-report-field-grid">
            <div className="iv-report-field">
              <label htmlFor="report-category">
                Concern type
              </label>

              <select
                id="report-category"
                value={category}
                disabled={busy}
                onChange={event =>
                  setCategory(event.target.value)
                }
              >
                {categories.map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="iv-report-field">
              <label htmlFor="report-severity">
                How urgent does it feel?
              </label>

              <select
                id="report-severity"
                value={severity}
                disabled={busy}
                onChange={event =>
                  setSeverity(event.target.value)
                }
              >
                {[
                  ["low", "Low"],
                  ["medium", "Medium"],
                  ["high", "High"],
                  ["critical", "Very urgent"]
                ].map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="iv-report-field">
            <label htmlFor="report-description">
              Your description
            </label>

            <textarea
              id="report-description"
              rows={6}
              required
              minLength={1}
              maxLength={10000}
              value={description}
              disabled={busy}
              placeholder="Tell us what you would like help with…"
              onChange={event =>
                setDescription(event.target.value)
              }
            />

            <small>
              {clean.length}/10,000 characters ·
              A short message is okay.
            </small>
          </div>

          <div
            className="iv-report-privacy-note"
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "minmax(0, 1fr)",
              padding: 22
            }}
          >
            <strong>
              Private support request
            </strong>

            <p>
              InnerVoice selects the designated Admin
              automatically and encrypts your report
              for their vault and yours. You do not
              need to exchange keys.
            </p>

            <p>
              The Admin can review your concern, but
              InnerVoice does not determine whether
              an allegation is proven or perform legal
              investigations. Your report is linked
              to your account in server metadata.
            </p>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                lineHeight: 1.55
              }}
            >
              <input
                type="checkbox"
                checked={consent}
                disabled={busy || !recipient}
                onChange={event =>
                  setConsent(event.target.checked)
                }
                style={{
                  marginTop: 5,
                  flexShrink: 0
                }}
              />

              <span>
                I understand that the designated Admin
                may read this report and this is not a
                live emergency service.
              </span>
            </label>
          </div>

          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}

          {!recipient && (
            <p
              role="status"
              style={{
                margin: 0,
                color: "#815b45"
              }}
            >
              {loadingRecipient
                ? "Checking the Admin's private vault…"
                : "Recipient unavailable. Unlock your vault, then retry."}
            </p>
          )}

          {!recipient && !loadingRecipient && (
            <button
              type="button"
              className="secondary-button"
              onClick={loadRecipient}
            >
              Retry recipient lookup
            </button>
          )}

          {recipient && !canSend && !busy && (
            <small
              role="status"
              style={{ color: "#765a49" }}
            >
              {!clean
                ? "Write a description to enable submission."
                : !consent
                  ? "Tick the privacy acknowledgement to continue."
                  : "Please check the form."}
            </small>
          )}

          <div className="iv-report-actions">
            <Link
              className="iv-report-cancel"
              to="/reports"
            >
              Cancel
            </Link>

            <button
              className="primary-button iv-report-submit"
              type="submit"
              disabled={!canSend}
            >
              {busy
                ? "Encrypting and submitting…"
                : "Submit private report →"}
            </button>
          </div>
        </div>
      </form>

      <p className="iv-report-footnote">
        If you are in immediate danger, contact
        local emergency services or a trusted person.
      </p>
    </div>
  );
}