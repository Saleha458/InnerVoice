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

/* =========================================================
   DATE HELPERS
========================================================= */

const formatDateForInput = (dateObject) => {
  const year =
    dateObject.getFullYear();

  const month =
    String(
      dateObject.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      dateObject.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getToday = () => {
  return formatDateForInput(
    new Date()
  );
};

const addDays = (
  dateString,
  numberOfDays
) => {
  const [
    year,
    month,
    day,
  ] = dateString
    .split("-")
    .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  date.setDate(
    date.getDate() +
      numberOfDays
  );

  return formatDateForInput(
    date
  );
};

/*
 * InnerVoice booking hours:
 * 09:00 AM -> 09:00 PM
 *
 * Latest possible START time depends on duration.
 * Example:
 * 30-minute session:
 * latest start = 08:30 PM.
 */
const getDefaultBookingDate = (
  duration = 30
) => {
  const now =
    new Date();

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  const dayEnd =
    21 * 60;

  const latestStart =
    dayEnd -
    Number(duration);

  /*
   * If there is no longer enough
   * time today for this duration,
   * start booking from tomorrow.
   */
  if (
    currentMinutes >=
    latestStart
  ) {
    return addDays(
      getToday(),
      1
    );
  }

  return getToday();
};

const formatDateTime = (
  value
) => {
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

const formatFriendlyDate = (
  dateString
) => {
  if (!dateString) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = dateString
    .split("-")
    .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateString;
  }

  return date.toLocaleDateString(
    [],
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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

  /* =======================================================
     STATE
  ======================================================= */

  const [
    expert,
    setExpert,
  ] = useState(null);

  const [
    duration,
    setDuration,
  ] = useState(30);

  const [
    date,
    setDate,
  ] = useState(() =>
    getDefaultBookingDate(
      30
    )
  );

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

  const [
    availabilityMessage,
    setAvailabilityMessage,
  ] = useState("");

  const minimumDate =
    useMemo(
      () => getToday(),
      []
    );

  const isToday =
    date === getToday();

  /* =======================================================
     LOAD EXPERT
  ======================================================= */

  useEffect(() => {
    let active =
      true;

    const loadExpert =
      async () => {
        try {
          setLoading(
            true
          );

          setError("");

          const response =
            await getExpert(
              expertId
            );

          const item =
            response?.expert ||
            response;

          if (
            active
          ) {
            setExpert(
              item
            );
          }
        } catch (err) {
          if (
            active
          ) {
            setError(
              err?.response
                ?.data
                ?.message ||
                "Could not load expert."
            );
          }
        } finally {
          if (
            active
          ) {
            setLoading(
              false
            );
          }
        }
      };

    if (
      expertId
    ) {
      loadExpert();
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
     WHEN DURATION CHANGES

     If today's remaining time is no longer enough
     for the chosen duration, automatically move to tomorrow.
  ======================================================= */

  useEffect(() => {
    const today =
      getToday();

    if (
      date !== today
    ) {
      return;
    }

    const now =
      new Date();

    const currentMinutes =
      now.getHours() *
        60 +
      now.getMinutes();

    const latestStart =
      21 * 60 -
      Number(duration);

    if (
      currentMinutes >=
      latestStart
    ) {
      setDate(
        addDays(
          today,
          1
        )
      );

      setSelectedSlot(
        ""
      );

      setAvailabilityMessage(
        "Today's booking window has ended for this session length, so we moved you to tomorrow."
      );
    }
  }, [
    duration,
    date,
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

          /*
           * Do not permanently remove useful
           * informational messages here unless
           * new availability is actually found.
           */
          const response =
            await getAvailableSlots(
              {
                expertId,
                date,
                duration,
              }
            );

          if (
            !active
          ) {
            return;
          }

          const availableSlots =
            Array.isArray(
              response?.slots
            )
              ? response.slots
              : [];

          setSlots(
            availableSlots
          );

          if (
            availableSlots.length >
            0
          ) {
            setAvailabilityMessage(
              `${availableSlots.length} free ${
                availableSlots.length ===
                1
                  ? "time is"
                  : "times are"
              } available for this date.`
            );
          } else {
            /*
             * Today may legitimately have no slots
             * because the booking day is almost over.
             */
            if (
              date ===
              getToday()
            ) {
              setAvailabilityMessage(
                "There are no remaining free times today. Choose another date to continue."
              );
            } else {
              setAvailabilityMessage(
                "This expert has no free times for the selected date and session length."
              );
            }
          }
        } catch (err) {
          if (
            active
          ) {
            setSlots(
              []
            );

            setAvailabilityMessage(
              ""
            );

            setError(
              err?.response
                ?.data
                ?.message ||
                "Could not load free slots."
            );
          }
        } finally {
          if (
            active
          ) {
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
     DATE CHANGE
  ======================================================= */

  const handleDateChange =
    (event) => {
      const newDate =
        event.target.value;

      if (
        !newDate
      ) {
        return;
      }

      setDate(
        newDate
      );

      setSlots(
        []
      );

      setSelectedSlot(
        ""
      );

      setError("");

      setAvailabilityMessage(
        ""
      );
    };

  /* =======================================================
     DURATION CHANGE
  ======================================================= */

  const handleDurationChange =
    (event) => {
      const newDuration =
        Number(
          event.target
            .value
        );

      setDuration(
        newDuration
      );

      setSlots(
        []
      );

      setSelectedSlot(
        ""
      );

      setError("");

      setAvailabilityMessage(
        ""
      );
    };

  /* =======================================================
     NEXT DAY
  ======================================================= */

  const goToNextDay =
    () => {
      setDate(
        addDays(
          date,
          1
        )
      );

      setSlots(
        []
      );

      setSelectedSlot(
        ""
      );

      setError("");

      setAvailabilityMessage(
        ""
      );
    };

  /* =======================================================
     SUBMIT BOOKING REQUEST
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

      const selectedDate =
        new Date(
          selectedSlot
        );

      if (
        Number.isNaN(
          selectedDate.getTime()
        ) ||
        selectedDate <=
          new Date()
      ) {
        setError(
          "This session time is no longer available. Please choose another free time."
        );

        setSelectedSlot(
          ""
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
          "Your session request has been sent successfully. The expert must accept it before the session is confirmed."
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

        /*
         * Reload availability because someone else
         * may have taken the selected slot.
         */
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
            Array.isArray(
              response?.slots
            )
              ? response.slots
              : []
          );

          setSelectedSlot(
            ""
          );
        } catch (_) {
          setSlots(
            []
          );
        }
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div className="page-shell">
        <div className="empty-card">
          Loading expert...
        </div>
      </div>
    );
  }

  /* =======================================================
     EXPERT NOT FOUND
  ======================================================= */

  if (
    !expert
  ) {
    return (
      <div className="page-shell">
        <div className="error-box">
          {error ||
            "Expert not found."}
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

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
            Choose a date,
            session length and
            genuinely available
            time. Your request
            becomes confirmed only
            after the expert accepts
            it.
          </p>
        </div>
      </div>

      <section className="feature-card">
        {/* ===============================================
            EXPERT HEADER
        =============================================== */}

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

        {/* ===============================================
            ERROR
        =============================================== */}

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {/* ===============================================
            FORM
        =============================================== */}

        <form
          onSubmit={
            submit
          }
        >
          {/* DATE */}

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
              value={
                date
              }
              onChange={
                handleDateChange
              }
              disabled={
                submitting
              }
              required
            />

            <small>
              {isToday
                ? "Showing only future times remaining today."
                : `Selected: ${formatFriendlyDate(
                    date
                  )}`}
            </small>
          </div>

          {/* SESSION LENGTH */}

          <div className="form-group">
            <label className="form-label">
              Session length
            </label>

            <select
              className="form-input"
              value={
                duration
              }
              onChange={
                handleDurationChange
              }
              disabled={
                submitting
              }
            >
              {[
                20,
                25,
                30,
                35,
                40,
                45,
              ].map(
                (
                  minutes
                ) => (
                  <option
                    key={
                      minutes
                    }
                    value={
                      minutes
                    }
                  >
                    {
                      minutes
                    }{" "}
                    minutes
                  </option>
                )
              )}
            </select>

            <small>
              Minimum 20 minutes
              and maximum 45
              minutes. For longer
              support, book another
              session.
            </small>
          </div>

          {/* AVAILABLE TIMES */}

          <div className="form-group">
            <label className="form-label">
              Free times on{" "}
              {formatFriendlyDate(
                date
              )}
            </label>

            {slotsLoading ? (
              <div className="empty-card">
                <p>
                  Checking the
                  expert&apos;s live
                  availability...
                </p>
              </div>
            ) : slots.length ===
              0 ? (
              <div className="empty-card">
                <h3>
                  No free slots
                </h3>

                <p>
                  {availabilityMessage ||
                    "Try another date or session length."}
                </p>

                <div
                  className="button-row"
                  style={{
                    marginTop:
                      "12px",
                  }}
                >
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      goToNextDay
                    }
                    disabled={
                      submitting
                    }
                  >
                    Check next day
                  </button>
                </div>
              </div>
            ) : (
              <>
                {availabilityMessage && (
                  <div className="notice-box">
                    {
                      availabilityMessage
                    }
                  </div>
                )}

                <div
                  className="button-row"
                  style={{
                    flexWrap:
                      "wrap",

                    gap:
                      "10px",

                    marginTop:
                      "12px",
                  }}
                >
                  {slots.map(
                    (
                      slot
                    ) => {
                      const slotDate =
                        new Date(
                          slot.startTime
                        );

                      const label =
                        Number.isNaN(
                          slotDate.getTime()
                        )
                          ? "Unavailable"
                          : slotDate.toLocaleTimeString(
                              [],
                              {
                                hour:
                                  "2-digit",

                                minute:
                                  "2-digit",
                              }
                            );

                      return (
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
                          onClick={() => {
                            setSelectedSlot(
                              slot.startTime
                            );

                            setError(
                              ""
                            );
                          }}
                          disabled={
                            submitting
                          }
                        >
                          {
                            label
                          }
                        </button>
                      );
                    }
                  )}
                </div>
              </>
            )}

            {/* SELECTED SLOT */}

            {selectedSlot && (
              <div
                className="notice-box"
                style={{
                  marginTop:
                    "14px",
                }}
              >
                Selected session:
                <strong>
                  {" "}
                  {formatDateTime(
                    selectedSlot
                  )}
                </strong>

                <div
                  style={{
                    marginTop:
                      "6px",
                  }}
                >
                  Duration:{" "}
                  <strong>
                    {
                      duration
                    }{" "}
                    minutes
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* OPTIONAL MESSAGE */}

          <div className="form-group">
            <label className="form-label">
              Optional message
            </label>

            <textarea
              className="form-input"
              rows="5"
              maxLength={
                2000
              }
              value={
                message
              }
              onChange={(event) =>
                setMessage(
                  event.target
                    .value
                )
              }
              placeholder="Share only what you are comfortable sharing before the session."
              disabled={
                submitting
              }
            />

            <small>
              {
                message.length
              }
              /2000 characters
            </small>
          </div>

          {/* BUTTONS */}

          <div className="button-row">
            <button
              type="submit"
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
                navigate(
                  -1
                )
              }
              disabled={
                submitting
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