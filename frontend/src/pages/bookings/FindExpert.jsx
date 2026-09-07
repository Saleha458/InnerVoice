import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getVerifiedExperts,
} from "../../services/expertService";

export default function FindExpert() {
  const [
    experts,
    setExperts,
  ] = useState([]);

  const [
    genderFilter,
    setGenderFilter,
  ] = useState("all");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const loadExperts =
    useCallback(
      async () => {
        try {
          setError("");

          const response =
            await getVerifiedExperts();

          const expertList =
            Array.isArray(
              response?.experts
            )
              ? response.experts
              : [];

          setExperts(
            expertList.filter(
              (expert) =>
                expert.verificationStatus ===
                  "verified" &&
                expert.available !==
                  false
            )
          );
        } catch (err) {
          console.error(
            "Load experts error:",
            err
          );

          setError(
            err?.response?.data
              ?.message ||
              "Could not load verified experts."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    loadExperts();

    const interval =
      setInterval(
        loadExperts,
        10000
      );

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          loadExperts();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      clearInterval(
        interval
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [loadExperts]);

  const filteredExperts =
    useMemo(() => {
      if (
        genderFilter ===
        "all"
      ) {
        return experts;
      }

      return experts.filter(
        (expert) =>
          String(
            expert.gender ||
              ""
          ).toLowerCase() ===
          genderFilter.toLowerCase()
      );
    }, [
      experts,
      genderFilter,
    ]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            VERIFIED SUPPORT
          </span>

          <h1>
            Find an Expert
          </h1>

          <p>
            Choose a verified
            professional you feel
            comfortable talking to.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box">
          {error}

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setLoading(true);
              loadExperts();
            }}
            style={{
              marginLeft:
                "10px",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading &&
        experts.length >
          0 && (
          <div className="feature-card">
            <label
              className="form-label"
              htmlFor="genderFilter"
            >
              Preferred expert
              gender
            </label>

            <select
              id="genderFilter"
              className="form-input"
              value={
                genderFilter
              }
              onChange={(
                event
              ) =>
                setGenderFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="all">
                Any gender
              </option>

              <option value="female">
                Female
              </option>

              <option value="male">
                Male
              </option>

              <option value="non-binary">
                Non-binary
              </option>

              <option value="prefer-not-to-say">
                Prefer not to say
              </option>
            </select>
          </div>
        )}

      {loading ? (
        <div className="empty-card">
          <h2>
            Finding verified
            experts...
          </h2>

          <p>
            Please wait while we
            load available
            professionals.
          </p>
        </div>
      ) : filteredExperts.length ===
        0 ? (
        <div className="empty-card">
          <h2>
            {experts.length ===
            0
              ? "No verified experts yet"
              : "No matching experts"}
          </h2>

          <p>
            {experts.length ===
            0
              ? "Verified professionals will appear here after admin approval."
              : 'Try another gender preference or choose "Any gender".'}
          </p>
        </div>
      ) : (
        <div className="list-grid">
          {filteredExperts.map(
            (expert) => (
              <article
                className="feature-card expert-card"
                key={expert.id}
              >
                <div className="item-top">
                  <div>
                    <div className="profile-avatar small">
                      {expert.name
                        ?.slice(
                          0,
                          1
                        )
                        .toUpperCase() ||
                        "E"}
                    </div>

                    <h2>
                      {expert.name ||
                        "Support Professional"}
                    </h2>

                    <p>
                      {expert.specialization ||
                        "Support Professional"}
                    </p>
                  </div>

                  <span className="status active">
                    ✓ Verified
                  </span>
                </div>

                <div className="expert-meta">
                  <span>
                    Gender:{" "}
                    {expert.gender ||
                      "Not specified"}
                  </span>

                  <span>
                    {expert.experienceYears ||
                      0}{" "}
                    years experience
                  </span>

                  <span>
                    {expert.qualification ||
                      "Qualification available"}
                  </span>
                </div>

                <p>
                  {expert.bio ||
                    "Verified InnerVoice support professional available to provide support."}
                </p>

                <div className="button-row">
                  <Link
                    className="secondary-button"
                    to={`/experts/${expert.id}`}
                  >
                    View profile
                  </Link>

                  <Link
                    className="primary-button"
                    to={`/bookings/new?expertId=${expert.id}`}
                  >
                    Book session
                  </Link>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}