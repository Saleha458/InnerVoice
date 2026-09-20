
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../services/api";
import useAuth from "../../hooks/useAuth";
import AuthShell from "./AuthShell";

const initialForm = {
  anonymousId: "",
  password: "",
  confirmPassword: "",
  role: "user",
  age: "",
  professionalName: "",
  professionalEmail: "",
  gender: "",
  licenseNumber: "",
  licenseImage: null,
  qualification: "",
  specialization: "",
  experienceYears: "",
  bio: ""
};

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = event => {
    const { name, value, files } = event.target;

    if (name === "licenseImage") {
      setForm(previous => ({
        ...previous,
        licenseImage: files?.[0] || null
      }));
      return;
    }

    setForm(previous => ({
      ...previous,
      [name]: value
    }));
  };

  const passwordRules = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password)
  };

  const passwordValid =
    Object.values(passwordRules).every(Boolean);

  const passwordScore = Object.values(passwordRules)
    .filter(Boolean).length;

  const passwordsMatch =
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword;

  const strength = !form.password
    ? "Not entered"
    : passwordScore <= 2
      ? "Weak"
      : !passwordValid
        ? "Needs improvement"
        : form.password.length >= 14
          ? "Strong"
          : "Good";

  const strengthColor = passwordValid
    ? "#287c58"
    : passwordScore <= 2
      ? "#ae493a"
      : "#b47b32";

  const strengthWidth = !form.password
    ? "0%"
    : passwordValid
      ? form.password.length >= 14
        ? "100%"
        : "80%"
      : `${Math.max(10, passwordScore * 12)}%`;

  const handleSubmit = async event => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const anonymousId = form.anonymousId.trim();

    if (!/^[A-Za-z0-9_]{3,30}$/.test(anonymousId)) {
      setError(
        "Anonymous ID must be 3–30 characters and may contain only letters, numbers and underscores."
      );
      return;
    }

    if (form.age === "") {
      setError("Age is required.");
      return;
    }

    const numericAge = Number(form.age);

    if (
      !Number.isInteger(numericAge) ||
      numericAge <= 0 ||
      numericAge > 120
    ) {
      setError("Please enter a valid age.");
      return;
    }

    if (form.role === "user" && numericAge < 15) {
      setError("Users must be at least 15 years old.");
      return;
    }

    if (!passwordValid) {
      setError(
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.role === "expert") {
      if (!form.professionalName.trim()) {
        setError("Professional name is required.");
        return;
      }

      if (!form.professionalEmail.trim()) {
        setError("Professional email is required.");
        return;
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form.professionalEmail.trim()
        )
      ) {
        setError(
          "Please enter a valid professional email."
        );
        return;
      }

      if (!form.gender) {
        setError("Please select your gender.");
        return;
      }

      if (!form.licenseNumber.trim()) {
        setError("License number is required.");
        return;
      }

      if (!form.qualification.trim()) {
        setError("Qualification is required.");
        return;
      }

      if (!form.specialization.trim()) {
        setError("Specialization is required.");
        return;
      }

      if (!form.licenseImage) {
        setError(
          "Please upload your license / verification image."
        );
        return;
      }

      if (
        !form.licenseImage.type.startsWith("image/")
      ) {
        setError(
          "License / verification file must be an image."
        );
        return;
      }

      if (
        form.licenseImage.size >
        5 * 1024 * 1024
      ) {
        setError("License image must be 5 MB or smaller.");
        return;
      }

      if (form.experienceYears !== "") {
        const experience = Number(form.experienceYears);

        if (
          !Number.isFinite(experience) ||
          experience < 0 ||
          experience > 80
        ) {
          setError(
            "Years of experience must be between 0 and 80."
          );
          return;
        }
      }
    }

    try {
      setLoading(true);

      if (form.role === "expert") {
        const data = new FormData();

        data.append("anonymousId", anonymousId);
        data.append("password", form.password);
        data.append(
          "confirmPassword",
          form.confirmPassword
        );
        data.append("age", String(numericAge));

        data.append(
          "professionalName",
          form.professionalName.trim()
        );

        data.append(
          "professionalEmail",
          form.professionalEmail.trim().toLowerCase()
        );

        data.append("gender", form.gender);

        data.append(
          "licenseNumber",
          form.licenseNumber.trim()
        );

        data.append(
          "qualification",
          form.qualification.trim()
        );

        data.append(
          "specialization",
          form.specialization.trim()
        );

        data.append(
          "experienceYears",
          form.experienceYears === ""
            ? "0"
            : String(Number(form.experienceYears))
        );

        data.append("bio", form.bio.trim());
        data.append("licenseImage", form.licenseImage);

        const response = await api.post(
          "/experts/register-account",
          data
        );

        setSuccess(
          response?.data?.message ||
          "Expert account created successfully. Your application is pending admin verification."
        );

        setForm(initialForm);

        window.setTimeout(() => {
          navigate("/login", {
            replace: true
          });
        }, 2500);

        return;
      }

      await register({
        anonymousId,
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role,
        age: numericAge
      });

      setSuccess(
        "Account created successfully. You can now sign in."
      );

      setForm(initialForm);

      window.setTimeout(() => {
        navigate("/login", {
          replace: true
        });
      }, 1800);
    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell variant="register">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">
            INNERVOICE
          </span>

          <h1>Create your account.</h1>

          <p>
            Begin with an anonymous identity.
            Your space is yours to shape.
          </p>
        </div>

        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="notice-box" role="status">
            {success}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label htmlFor="anonymousId">
              Anonymous ID
            </label>

            <input
              id="anonymousId"
              name="anonymousId"
              type="text"
              value={form.anonymousId}
              onChange={handleChange}
              placeholder="e.g. mind_helper_48212"
              autoComplete="username"
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_]+"
              required
              disabled={loading}
            />

            <small>
              Use 3–30 letters, numbers or underscores.
              No real name is required for user accounts.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="role">
              I am registering as
            </label>

            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="user">User</option>
              <option value="parent">Parent</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="age">Age</label>

            <input
              id="age"
              name="age"
              type="number"
              min="1"
              max="120"
              value={form.age}
              onChange={handleChange}
              placeholder="Enter your age"
              required
              disabled={loading}
            />

            {form.role === "user" && (
              <small>Users must be 15 or older.</small>
            )}
          </div>

          {form.role === "expert" && (
            <>
              <div className="notice-box">
                <strong>
                  Expert verification
                </strong>

                <p>
                  Complete your professional details
                  below. Your application will stay
                  pending and your profile will remain
                  hidden until an admin verifies it.
                </p>
              </div>

              <div className="expert-grid">
                <div className="form-group">
                  <label htmlFor="professionalName">
                    Professional Name
                  </label>

                  <input
                    id="professionalName"
                    name="professionalName"
                    type="text"
                    value={form.professionalName}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="professionalEmail">
                    Professional Email
                  </label>

                  <input
                    id="professionalEmail"
                    name="professionalEmail"
                    type="email"
                    value={form.professionalEmail}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">
                    Gender
                  </label>

                  <select
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  >
                    <option value="">
                      Select gender
                    </option>
                    <option value="male">
                      Male
                    </option>
                    <option value="female">
                      Female
                    </option>
                    <option value="other">
                      Other
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="licenseNumber">
                    License Number
                  </label>

                  <input
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    value={form.licenseNumber}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="qualification">
                    Qualification
                  </label>

                  <input
                    id="qualification"
                    name="qualification"
                    type="text"
                    value={form.qualification}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="specialization">
                    Specialization
                  </label>

                  <input
                    id="specialization"
                    name="specialization"
                    type="text"
                    value={form.specialization}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="experienceYears">
                    Years of Experience
                  </label>

                  <input
                    id="experienceYears"
                    name="experienceYears"
                    type="number"
                    min="0"
                    max="80"
                    value={form.experienceYears}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="licenseImage">
                  License / Verification Image
                </label>

                <input
                  id="licenseImage"
                  name="licenseImage"
                  type="file"
                  accept="image/*"
                  onChange={handleChange}
                  disabled={loading}
                  required
                />

                <small>
                  Upload a clear image. Maximum size:
                  5 MB.
                </small>

                {form.licenseImage && (
                  <small>
                    Selected: {form.licenseImage.name}
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="bio">
                  Professional Bio
                </label>

                <textarea
                  id="bio"
                  name="bio"
                  rows={5}
                  maxLength={2000}
                  value={form.bio}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Briefly describe your professional background and approach..."
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <div className="iv-auth-password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
                required
                style={{
                  paddingRight: 80,
                  width: "100%"
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(value => !value)
                }
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer"
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="iv-auth-password-rules">
              <div>
                {passwordRules.length ? "✓" : "○"}{" "}
                At least 8 characters
              </div>

              <div>
                {passwordRules.uppercase ? "✓" : "○"}{" "}
                One uppercase letter
              </div>

              <div>
                {passwordRules.lowercase ? "✓" : "○"}{" "}
                One lowercase letter
              </div>

              <div>
                {passwordRules.number ? "✓" : "○"}{" "}
                One number
              </div>

              <div>
                {passwordRules.special ? "✓" : "○"}{" "}
                One special character
              </div>
            </div>

            <div
              aria-live="polite"
              style={{ marginTop: 12 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 12
                }}
              >
                <span>Password strength</span>

                <strong
                  style={{
                    color: strengthColor
                  }}
                >
                  {strength}
                </strong>
              </div>

              <div
                aria-hidden="true"
                style={{
                  height: 7,
                  marginTop: 7,
                  borderRadius: 999,
                  background: "#ebe6e0",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: strengthWidth,
                    height: "100%",
                    background: strengthColor,
                    borderRadius: "inherit",
                    transition: "width 0.2s ease"
                  }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div className="iv-auth-password-field">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
                required
                style={{
                  paddingRight: 80,
                  width: "100%"
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    value => !value
                  )
                }
                disabled={loading}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer"
                }}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>

            {form.confirmPassword.length > 0 && (
              <p
                role="status"
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  fontWeight: 650,
                  color: passwordsMatch
                    ? "#287c58"
                    : "#ae493a"
                }}
              >
                {passwordsMatch
                  ? "✓ Passwords match"
                  : "✕ Passwords do not match"}
              </p>
            )}
          </div>

          {form.role === "expert" && (
            <div className="notice-box">
              <strong>
                What happens after registration?
              </strong>

              <p>
                Your expert application will be submitted
                as <strong>Pending</strong>. An admin must
                verify your professional details before
                you become visible to users and receive
                support requests.
              </p>
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? form.role === "expert"
                ? "Creating expert application..."
                : "Creating account..."
              : form.role === "expert"
                ? "Create Expert Account"
                : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}