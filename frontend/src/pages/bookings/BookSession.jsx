import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  getExpert,
  sendExpertRequest,
} from "../../services/expertService";

import {
  getAvailableSlots,
} from "../../services/bookingService";

const getToday =
  () => {
    const now =
      new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    )}-${String(
      now.getDate()
    ).padStart(
      2,
      "0"
    )}`;
  };

const formatDateTime =
  (value) => {
    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? "Date unavailable"
      : date.toLocaleString(
          [],
          {
            dateStyle:
              "medium",

            timeStyle:
              "short",
          }
        );
  };

export default function BookSession() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const navigate =
    useNavigate();

  const expertId =
    searchParams.get(
      "expertId"
    );

  const [
    expert,
    setExpert,
  ] = useState(null);

  const [
    date,
    setDate,
  ] = useState(
    getToday()
  );

  const [
    duration,
    setDuration,
  ] = useState(30);

  const [
    slots,
    setSlots,
  ] = useState([]);

  const [
    selectedSlot,
    setSelectedSlot,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    slotsLoading,
    setSlotsLoading,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const minimumDate =
    useMemo(
      () =>
        getToday(),
      []
    );

  /* =======================================================
     LOAD EXPERT
  ======================================================= */

  useEffect(() => {
    let active =
      true;

    const load =
      async () => {
        try {
          setLoading(
            true
          );

          const response =
            await getExpert(
              expertId
            );

          const item =
            response?.expert ||
            response;

          if (active) {
            setExpert(
              item
            );
          }
        } catch (err) {
          if (active) {
            setError(
              err?.response
                ?.data
                ?.message ||
                "Could not load expert."
            );
          }
        } finally {
          if (active) {
            setLoading(
              false
            );
          }
        }
      };

    if (expertId) {
      load();
    } else {
      setLoading(
        false
      );
      setError(
        "No expert was selected."
      );
    }

    return () => {
      active =
        false;
    };
  }, [
    expertId,
  ]);

  /* =======================================================
     LOAD FREE SLOTS
  ======================================================= */

  useEffect(() => {
    if (
      !expertId ||
      !date ||
      !expert
    ) {
      return;
    }

    let active =
      true;

    const loadSlots =
      async () => {
        try {
          setSlotsLoading(
            true
          );

          setError("");

          setSelectedSlot(
            ""
          );

          const response =
            await getAvailableSlots(
              {
                expertId,

                date,

                duration,
              }
            );

          if (active) {
            setSlots(
              Array.isArray(
                response?.slots
              )
                ? response.slots
                : []
            );
          }
        } catch (err) {
          if (active) {
            setSlots(
              []
            );

            setError(
              err?.response
                ?.data
                ?.message ||
                "Could not load free slots."
            );
          }
        } finally {
          if (active) {
            setSlotsLoading(
              false
            );
          }
        }
      };

    loadSlots();

    return () => {
      active =
        false;
    };
  }, [
    expertId,
    date,
    duration,
    expert,
  ]);

  /* =======================================================
     SUBMIT
  ======================================================= */

  const submit =
    async (event) => {
      event.preventDefault();

      setError("");

      if (
        !selectedSlot
      ) {
        setError(
          "Please select a free session time."
        );

        return;
      }

      try {
        setSubmitting(
          true
        );

        await sendExpertRequest(
          {
            expertId,

            message:
              message.trim(),

            startTime:
              selectedSlot,

            duration:
              Number(
                duration
              ),
          }
        );

        window.alert(
          "Your request has been sent. The expert has been notified. The session will become confirmed after the expert accepts it."
        );

        navigate(
          "/bookings",
          {
            replace:
              true,
          }
        );
      } catch (err) {
        setError(
          err?.response
            ?.data
            ?.message ||
            "Could not send session request."
        );

        try {
          const response =
            await getAvailableSlots(
              {
                expertId,
                date,
                duration,
              }
            );

          setSlots(
            response?.slots ||
              []
          );

          setSelectedSlot(
            ""
          );
        } catch (_) {}
      } finally {
        setSubmitting(
          false
        );
      }
    };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-card">
          Loading expert...
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="page-shell">
        <div className="error-box">
          {error ||
            "Expert not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            SESSION BOOKING
          </span>

          <h1>
            Book a private session
          </h1>

          <p>
            Choose the date,
            session length and
            genuinely free time.
            Your request is only
            confirmed after the
            expert accepts it.
          </p>
        </div>
      </div>

      <section className="feature-card">
        <div className="item-top">
          <div>
            <h2>
              {expert.name ||
                "Support Professional"}
            </h2>

            <p>
              {expert.specialization ||
                "Mental health professional"}
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
            Experience:{" "}
            {expert.experienceYears ||
              0}{" "}
            years
          </span>
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form
          onSubmit={
            submit
          }
        >
          <div className="form-group">
            <label className="form-label">
              Date
            </label>

            <input
              className="form-input"
              type="date"
              min={
                minimumDate
              }
              value={date}
              onChange={(e) =>
                setDate(
                  e.target
                    .value
                )
              }
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Session length
            </label>

            <select
              className="form-input"
              value={duration}
              onChange={(e) =>
                setDuration(
                  Number(
                    e.target
                      .value
                  )
                )
              }
              disabled={
                submitting
              }
            >
              {[20, 25, 30, 35, 40, 45].map(
                (minutes) => (
                  <option
                    key={
                      minutes
                    }
                    value={
                      minutes
                    }
                  >
                    {minutes}{" "}
                    minutes
                  </option>
                )
              )}
            </select>

            <small>
              Minimum 20 minutes
              and maximum 45
              minutes. For
              longer support,
              book another
              session.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">
              Free times on{" "}
              {date}
            </label>

            {slotsLoading ? (
              <div className="empty-card">
                Checking the
                expert's live
                availability...
              </div>
            ) : slots.length ===
              0 ? (
              <div className="empty-card">
                <h3>
                  No free slots
                </h3>

                <p>
                  Try another
                  date or session
                  length.
                </p>
              </div>
            ) : (
              <div
                className="button-row"
                style={{
                  flexWrap:
                    "wrap",
                }}
              >
                {slots.map(
                  (slot) => (
                    <button
                      key={
                        slot.startTime
                      }
                      type="button"
                      className={
                        selectedSlot ===
                        slot.startTime
                          ? "primary-button"
                          : "secondary-button"
                      }
                      onClick={() =>
                        setSelectedSlot(
                          slot.startTime
                        )
                      }
                      disabled={
                        submitting
                      }
                    >
                      {new Date(
                        slot.startTime
                      ).toLocaleTimeString(
                        [],
                        {
                          hour:
                            "2-digit",

                          minute:
                            "2-digit",
                        }
                      )}
                    </button>
                  )
                )}
              </div>
            )}

            {selectedSlot && (
              <div className="notice-box">
                Selected:
                <strong>
                  {" "}
                  {formatDateTime(
                    selectedSlot
                  )}
                </strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Optional message
            </label>

            <textarea
              className="form-input"
              rows="5"
              maxLength={2000}
              value={message}
              onChange={(e) =>
                setMessage(
                  e.target
                    .value
                )
              }
              placeholder="Share only what you are comfortable sharing before the session."
            />
          </div>

          <div className="button-row">
            <button
              className="primary-button"
              disabled={
                submitting ||
                slotsLoading ||
                !selectedSlot
              }
            >
              {submitting
                ? "Sending request..."
                : "Request session"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate(-1)
              }
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}