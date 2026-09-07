import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AgeVerification = () => {
  const navigate = useNavigate();
  const [age, setAge] = useState("");
  const [error, setError] = useState("");

  const continueHandler = (e) => {
    e.preventDefault();

    const numericAge = Number(age);

    if (!numericAge || numericAge < 15) {
      setError(
        "InnerVoice is available for users aged 15 and above."
      );
      return;
    }

    sessionStorage.setItem(
      "innervoiceAgeVerified",
      String(numericAge)
    );

    navigate("/register");
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-brand">
            <h1>
              Inner<span>Voice</span>
            </h1>
          </div>

          <h2 className="auth-title">
            Before we continue
          </h2>

          <p className="auth-subtitle">
            Please enter your age so we can provide
            the appropriate InnerVoice experience.
          </p>

          <form
            className="auth-form"
            onSubmit={continueHandler}
          >
            <div className="form-group">
              <label className="form-label">
                Your age
              </label>

              <input
                className="form-input"
                type="number"
                min="15"
                max="120"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  setError("");
                }}
                placeholder="Enter your age"
              />
            </div>

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgeVerification;