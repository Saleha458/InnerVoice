import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  createReport,
} from "../../services/reportService";

const CreateReport = () => {
  const navigate =
    useNavigate();

  const [category, setCategory] =
    useState("general");

  const [severity, setSeverity] =
    useState("medium");

  const [description, setDescription] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const submit = async (event) => {
    event.preventDefault();

    setError("");

    if (
      description.trim().length < 10
    ) {
      setError(
        "Please describe the concern in at least 10 characters."
      );
      return;
    }

    try {
      setLoading(true);

      await createReport({
        category,
        severity,
        description:
          description.trim(),
      });

      navigate("/reports", {
        replace: true,
        state: {
          submitted: true,
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not submit the report."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE SUPPORT
          </span>

          <h1>Create a report</h1>

          <p>
            Share a concern anonymously.
          </p>
        </div>

        <Link
          to="/reports"
          className="secondary-button"
        >
          Back
        </Link>
      </div>

      <form
        className="feature-card"
        style={{ maxWidth: 800 }}
        onSubmit={submit}
      >
        <label>
          Concern type

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
          >
            <option value="general">
              General concern
            </option>

            <option value="bullying">
              Bullying
            </option>

            <option value="abuse">
              Abuse
            </option>

            <option value="neglect">
              Neglect
            </option>

            <option value="online-safety">
              Online safety
            </option>

            <option value="other">
              Other
            </option>
          </select>
        </label>

        <label>
          Severity

          <select
            value={severity}
            onChange={(e) =>
              setSeverity(e.target.value)
            }
          >
            <option value="low">
              Low
            </option>

            <option value="medium">
              Medium
            </option>

            <option value="high">
              High
            </option>

            <option value="critical">
              Critical
            </option>
          </select>
        </label>

        <label>
          Description

          <textarea
            rows="8"
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            placeholder="Tell us what happened..."
          />
        </label>

        <div className="notice-box">
          Your report is submitted
          anonymously. Do not include
          unnecessary identifying information.
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={loading}
        >
          {loading
            ? "Submitting..."
            : "Submit report"}
        </button>
      </form>
    </div>
  );
};

export default CreateReport;