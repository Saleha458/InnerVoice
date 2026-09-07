import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  signInWithCustomToken,
} from "firebase/auth";

import useAuth from "../../hooks/useAuth";

import {
  auth,
} from "../../services/firebase";

import {
  registerExpert,
} from "../../services/expertService";


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
  bio: "",
};


const Register = () => {
  const navigate =
    useNavigate();

  const {
    register,
  } = useAuth();


  const [
    form,
    setForm,
  ] = useState(
    initialForm
  );


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  // =========================================================
  // CHANGE
  // =========================================================

  const handleChange =
    (event) => {
      const {
        name,
        value,
        files,
      } = event.target;


      if (
        name ===
        "licenseImage"
      ) {
        setForm(
          (previous) => ({
            ...previous,
            licenseImage:
              files?.[0] ||
              null,
          })
        );

        return;
      }


      setForm(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );
    };


  // =========================================================
  // PASSWORD RULES
  // =========================================================

  const passwordRules = {
    length:
      form.password.length >= 8,

    uppercase:
      /[A-Z]/.test(
        form.password
      ),

    lowercase:
      /[a-z]/.test(
        form.password
      ),

    number:
      /\d/.test(
        form.password
      ),

    special:
      /[^A-Za-z0-9]/.test(
        form.password
      ),
  };


  const passwordValid =
    Object.values(
      passwordRules
    ).every(Boolean);


  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");


      // -------------------------------------------------------
      // ANONYMOUS ID
      // -------------------------------------------------------

      const anonymousId =
        form.anonymousId.trim();


      if (!anonymousId) {
        setError(
          "Anonymous ID is required."
        );

        return;
      }


      if (
        !/^[A-Za-z0-9_]{3,30}$/.test(
          anonymousId
        )
      ) {
        setError(
          "Anonymous ID must be 3-30 characters and may contain only letters, numbers and underscores."
        );

        return;
      }


      // -------------------------------------------------------
      // AGE
      // -------------------------------------------------------

      if (
        form.age === ""
      ) {
        setError(
          "Age is required."
        );

        return;
      }


      const numericAge =
        Number(form.age);


      if (
        !Number.isInteger(
          numericAge
        ) ||
        numericAge <= 0 ||
        numericAge > 120
      ) {
        setError(
          "Please enter a valid age."
        );

        return;
      }


      // User only: 15+
      if (
        form.role === "user" &&
        numericAge < 15
      ) {
        setError(
          "Users must be at least 15 years old."
        );

        return;
      }


      // -------------------------------------------------------
      // PASSWORD
      // -------------------------------------------------------

      if (!passwordValid) {
        setError(
          "Password must contain at least 8 characters, uppercase, lowercase, number and special character."
        );

        return;
      }


      if (
        form.password !==
        form.confirmPassword
      ) {
        setError(
          "Passwords do not match."
        );

        return;
      }


      // -------------------------------------------------------
      // EXPERT VALIDATION
      // -------------------------------------------------------

      if (
        form.role === "expert"
      ) {
        if (
          !form.professionalName.trim()
        ) {
          setError(
            "Professional name is required."
          );

          return;
        }


        if (
          !form.professionalEmail.trim()
        ) {
          setError(
            "Professional email is required."
          );

          return;
        }


        const emailValid =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            form.professionalEmail.trim()
          );


        if (!emailValid) {
          setError(
            "Please enter a valid professional email."
          );

          return;
        }


        if (!form.gender) {
          setError(
            "Please select your gender."
          );

          return;
        }


        if (
          !form.licenseNumber.trim()
        ) {
          setError(
            "License number is required."
          );

          return;
        }


        if (!form.licenseImage) {
          setError(
            "Please upload your license / verification image."
          );

          return;
        }


        if (
          !form.licenseImage.type.startsWith(
            "image/"
          )
        ) {
          setError(
            "License file must be an image."
          );

          return;
        }


        if (
          form.licenseImage.size >
          5 * 1024 * 1024
        ) {
          setError(
            "License image must be 5 MB or smaller."
          );

          return;
        }


        if (
          !form.qualification.trim()
        ) {
          setError(
            "Qualification is required."
          );

          return;
        }


        if (
          !form.specialization.trim()
        ) {
          setError(
            "Specialization is required."
          );

          return;
        }


        if (
          form.experienceYears !== ""
        ) {
          const experience =
            Number(
              form.experienceYears
            );


          if (
            !Number.isFinite(
              experience
            ) ||
            experience < 0
          ) {
            setError(
              "Please enter valid experience years."
            );

            return;
          }
        }
      }


      // =======================================================
      // REGISTER ACCOUNT
      // =======================================================

      try {
        setLoading(true);


        const accountResponse =
          await register({
            anonymousId,

            password:
              form.password,

            confirmPassword:
              form.confirmPassword,

            role:
              form.role,

            age:
              numericAge,
          });


        // =====================================================
        // EXPERT APPLICATION
        // =====================================================

        if (
          form.role === "expert"
        ) {
          const token =
            accountResponse?.token;


          if (!token) {
            throw new Error(
              "Account was created but authentication token was not returned."
            );
          }


          // Sign the newly-created account
          // into Firebase so /experts/register
          // can authenticate the request.
          await signInWithCustomToken(
            auth,
            token
          );


          const firebaseUser =
            auth.currentUser;


          if (!firebaseUser) {
            throw new Error(
              "Could not authenticate the new expert account."
            );
          }


          await firebaseUser.getIdToken(
            true
          );


          const expertData =
            new FormData();


          expertData.append(
            "anonymousId",
            anonymousId
          );


          expertData.append(
            "name",
            form.professionalName.trim()
          );


          expertData.append(
            "email",
            form.professionalEmail
              .trim()
              .toLowerCase()
          );


          expertData.append(
            "gender",
            form.gender
          );


          expertData.append(
            "age",
            String(numericAge)
          );


          expertData.append(
            "licenseNumber",
            form.licenseNumber.trim()
          );


          expertData.append(
            "qualification",
            form.qualification.trim()
          );


          expertData.append(
            "specialization",
            form.specialization.trim()
          );


          expertData.append(
            "experienceYears",
            form.experienceYears === ""
              ? "0"
              : String(
                  Number(
                    form.experienceYears
                  )
                )
          );


          expertData.append(
            "bio",
            form.bio.trim()
          );


          expertData.append(
            "licenseImage",
            form.licenseImage
          );


          await registerExpert(
            expertData
          );


          setSuccess(
            "Expert account and application created successfully. Your application is now pending admin verification."
          );


          setForm(
            initialForm
          );


          window.setTimeout(
            () => {
              navigate(
                "/login",
                {
                  replace: true,
                }
              );
            },
            2500
          );


          return;
        }


        // =====================================================
        // NORMAL USER / PARENT
        // =====================================================

        setSuccess(
          "Account created successfully. You can now sign in."
        );


        setForm(
          initialForm
        );


        window.setTimeout(
          () => {
            navigate(
              "/login",
              {
                replace: true,
              }
            );
          },
          1800
        );
      } catch (err) {
        console.error(
          "Registration:",
          err
        );


        setError(
          err?.response?.data
            ?.message ||
          err?.message ||
          "Registration failed."
        );
      } finally {
        setLoading(false);
      }
    };


  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="auth-page">

      <div
        className="auth-card"
        style={{
          maxWidth:
            form.role === "expert"
              ? "760px"
              : "560px",
        }}
      >

        <div className="auth-header">

          <span className="eyebrow">
            INNERVOICE
          </span>

          <h1>
            Create your account
          </h1>

          <p>
            Your identity stays
            anonymous.
          </p>

        </div>


        {error && (
          <div
            className="error-box"
            role="alert"
          >
            {error}
          </div>
        )}


        {success && (
          <div
            className="notice-box"
            role="status"
          >
            {success}
          </div>
        )}


        <form
          onSubmit={
            handleSubmit
          }
          className="auth-form"
        >

          {/* =================================================
              BASIC ACCOUNT
          ================================================= */}

          <div className="form-group">
            <label htmlFor="anonymousId">
              Anonymous ID
            </label>

            <input
              id="anonymousId"
              name="anonymousId"
              type="text"
              value={
                form.anonymousId
              }
              onChange={
                handleChange
              }
              placeholder="e.g. quiet_soul"
              autoComplete="username"
              disabled={loading}
            />

            <small>
              3-30 characters. Letters,
              numbers and underscores
              only.
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
              onChange={
                handleChange
              }
              disabled={loading}
            >
              <option value="user">
                User
              </option>

              <option value="parent">
                Parent
              </option>

              <option value="expert">
                Expert
              </option>
            </select>

          </div>


          <div className="form-group">

            <label htmlFor="age">
              Age
            </label>

            <input
              id="age"
              name="age"
              type="number"
              min="1"
              max="120"
              value={form.age}
              onChange={
                handleChange
              }
              placeholder="Enter your age"
              disabled={loading}
            />

            {form.role ===
              "user" && (
              <small>
                Users must be
                15 or older.
              </small>
            )}

          </div>


          {/* =================================================
              EXPERT PROFESSIONAL INFORMATION
          ================================================= */}

          {form.role ===
            "expert" && (
            <>
              <div
                className="notice-box"
              >
                <strong>
                  Expert Verification
                </strong>

                <p>
                  Complete your
                  professional profile
                  below. Your application
                  will remain pending and
                  your profile will stay
                  hidden from users until
                  an admin verifies it.
                </p>
              </div>


              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 16,
                }}
              >

                <div className="form-group">

                  <label htmlFor="professionalName">
                    Professional Name
                  </label>

                  <input
                    id="professionalName"
                    name="professionalName"
                    type="text"
                    value={
                      form.professionalName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Your professional name"
                    disabled={loading}
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
                    value={
                      form.professionalEmail
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="professional@example.com"
                    disabled={loading}
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
                    onChange={
                      handleChange
                    }
                    disabled={loading}
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
                    value={
                      form.licenseNumber
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Professional license number"
                    disabled={loading}
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
                    value={
                      form.qualification
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. MS Clinical Psychology"
                    disabled={loading}
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
                    value={
                      form.specialization
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Child Psychology"
                    disabled={loading}
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
                    value={
                      form.experienceYears
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. 5"
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
                  onChange={
                    handleChange
                  }
                  disabled={loading}
                />

                <small>
                  Upload a clear image.
                  Maximum size: 5 MB.
                </small>

                {form.licenseImage && (
                  <small>
                    Selected:{" "}
                    {
                      form
                        .licenseImage
                        .name
                    }
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
                  value={form.bio}
                  onChange={
                    handleChange
                  }
                  placeholder="Briefly describe your professional background and approach..."
                  rows={5}
                  maxLength={2000}
                  disabled={loading}
                />

              </div>

            </>
          )}


          {/* =================================================
              PASSWORD
          ================================================= */}

          <div className="form-group">

            <label htmlFor="password">
              Password
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >

              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  form.password
                }
                onChange={
                  handleChange
                }
                placeholder="Create a strong password"
                autoComplete="new-password"
                disabled={loading}
                style={{
                  paddingRight:
                    80,
                  width: "100%",
                }}
              />


              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value
                  )
                }
                disabled={loading}
                style={{
                  position:
                    "absolute",
                  right: 10,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  border: "none",
                  background:
                    "transparent",
                  cursor:
                    "pointer",
                }}
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>

            </div>


            <div
              style={{
                marginTop: 10,
                fontSize: 13,
              }}
            >

              <div>
                {passwordRules.length
                  ? "✓"
                  : "○"}{" "}
                At least 8 characters
              </div>

              <div>
                {passwordRules.uppercase
                  ? "✓"
                  : "○"}{" "}
                One uppercase letter
              </div>

              <div>
                {passwordRules.lowercase
                  ? "✓"
                  : "○"}{" "}
                One lowercase letter
              </div>

              <div>
                {passwordRules.number
                  ? "✓"
                  : "○"}{" "}
                One number
              </div>

              <div>
                {passwordRules.special
                  ? "✓"
                  : "○"}{" "}
                One special character
              </div>

            </div>

          </div>


          {/* =================================================
              CONFIRM PASSWORD
          ================================================= */}

          <div className="form-group">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  form.confirmPassword
                }
                onChange={
                  handleChange
                }
                placeholder="Repeat your password"
                autoComplete="new-password"
                disabled={loading}
                style={{
                  paddingRight:
                    80,
                  width: "100%",
                }}
              />


              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (value) =>
                      !value
                  )
                }
                disabled={loading}
                style={{
                  position:
                    "absolute",
                  right: 10,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  border: "none",
                  background:
                    "transparent",
                  cursor:
                    "pointer",
                }}
              >
                {showConfirmPassword
                  ? "Hide"
                  : "Show"}
              </button>

            </div>

          </div>


          {/* =================================================
              EXPERT FINAL NOTICE
          ================================================= */}

          {form.role ===
            "expert" && (
            <div
              className="notice-box"
            >
              <strong>
                What happens after
                registration?
              </strong>

              <p>
                Your expert application
                will be submitted as
                <strong>
                  {" "}Pending
                </strong>
                . An admin must verify
                your professional details
                before you become visible
                to users and can receive
                support requests.
              </p>
            </div>
          )}


          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? form.role ===
                "expert"
                ? "Creating expert application..."
                : "Creating account..."
              : form.role ===
                "expert"
              ? "Create Expert Account"
              : "Create Account"}
          </button>

        </form>


        <div className="auth-footer">

          <p>
            Already have an
            account?{" "}

            <Link to="/login">
              Sign in
            </Link>
          </p>

        </div>

      </div>

    </div>
  );
};


export default Register;