const express = require("express");
const authenticate = require("../middleware/auth");
const { db } = require("../config/firebase");

const router = express.Router();

const MIN_DURATION = 20;
const MAX_DURATION = 45;
const DURATION_STEP = 5;

const DAY_START = 9 * 60; // 09:00
const DAY_END = 21 * 60; // 21:00

// Slots are generated every 5 minutes.
const STEP = 5;

/* =========================================================
   HELPERS
========================================================= */

const toDate = (value) => {
  if (!value) {
    return null;
  }

  // Firestore Timestamp
  if (
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  // Native Date
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  // Firestore Timestamp serialized object
  if (typeof value === "object") {
    const seconds =
      value.seconds ?? value._seconds;

    const nanoseconds =
      value.nanoseconds ??
      value._nanoseconds ??
      0;

    if (
      Number.isFinite(Number(seconds))
    ) {
      const date = new Date(
        Number(seconds) * 1000 +
          Math.floor(
            Number(nanoseconds) / 1e6
          )
      );

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const isValidDuration = (duration) => {
  return (
    Number.isFinite(duration) &&
    duration >= MIN_DURATION &&
    duration <= MAX_DURATION &&
    duration % DURATION_STEP === 0
  );
};

const overlaps = (
  firstStart,
  firstEnd,
  secondStart,
  secondEnd
) => {
  return (
    firstStart < secondEnd &&
    firstEnd > secondStart
  );
};

/*
 * Converts a user's local date + local minutes
 * into the correct UTC Date.
 *
 * timezoneOffset follows JavaScript's
 * getTimezoneOffset() convention:
 * UTC - local time.
 */
const buildLocalSlot = (
  date,
  minutes,
  timezoneOffset
) => {
  const [
    year,
    month,
    day,
  ] = date
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      Math.floor(minutes / 60),
      minutes % 60
    ) +
      timezoneOffset * 60000
  );
};

/* =========================================================
   GET BUSY RANGES
========================================================= */

const getBusyRanges = async (
  expertId
) => {
  const [
    sessionsSnapshot,
    requestsSnapshot,
  ] = await Promise.all([
    db
      .collection("sessions")
      .where(
        "expertId",
        "==",
        expertId
      )
      .get(),

    db
      .collection("expertRequests")
      .where(
        "expertId",
        "==",
        expertId
      )
      .get(),
  ]);

  const ranges = [];

  /* -------------------------------------------------------
     EXISTING SCHEDULED SESSIONS
  ------------------------------------------------------- */

  sessionsSnapshot.docs.forEach(
    (doc) => {
      const session = doc.data();

      if (
        session.status !==
        "scheduled"
      ) {
        return;
      }

      const start = toDate(
        session.startTime
      );

      const end = toDate(
        session.endTime
      );

      if (start && end) {
        ranges.push({
          start,
          end,
        });
      }
    }
  );

  /* -------------------------------------------------------
     PENDING EXPERT REQUESTS
     
     Pending requests also block that time so two users
     cannot request the same expert/time simultaneously.
  ------------------------------------------------------- */

  requestsSnapshot.docs.forEach(
    (doc) => {
      const request = doc.data();

      if (
        request.status !==
        "pending"
      ) {
        return;
      }

      const start = toDate(
        request.requestedStartTime
      );

      let end = toDate(
        request.requestedEndTime
      );

      if (
        !end &&
        start
      ) {
        const duration = Number(
          request.requestedDuration || 0
        );

        if (
          duration > 0
        ) {
          end = new Date(
            start.getTime() +
              duration * 60000
          );
        }
      }

      if (start && end) {
        ranges.push({
          start,
          end,
        });
      }
    }
  );

  return ranges;
};

/* =========================================================
   AVAILABLE SLOTS
========================================================= */

router.get(
  "/availability/:expertId",
  authenticate,
  async (req, res) => {
    try {
      const {
        expertId,
      } = req.params;

      const date = String(
        req.query.date || ""
      );

      const duration = Number(
        req.query.duration || 30
      );

      const timezoneOffset = Number(
        req.query.timezoneOffset ?? 0
      );

      /* ---------------------------------------------------
         DATE VALIDATION
      --------------------------------------------------- */

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          date
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Choose a valid date.",
        });
      }

      const parsedDate = new Date(
        `${date}T00:00:00`
      );

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Choose a valid date.",
        });
      }

      /* ---------------------------------------------------
         DURATION VALIDATION
         
         Allowed:
         20, 25, 30, 35, 40, 45
      --------------------------------------------------- */

      if (
        !isValidDuration(duration)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Session duration must be between 20 and 45 minutes in 5-minute increments.",
        });
      }

      /* ---------------------------------------------------
         TIMEZONE VALIDATION
      --------------------------------------------------- */

      if (
        !Number.isFinite(
          timezoneOffset
        ) ||
        Math.abs(
          timezoneOffset
        ) > 840
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid timezone.",
        });
      }

      /* ---------------------------------------------------
         EXPERT LOOKUP
      --------------------------------------------------- */

      const expertDoc =
        await db
          .collection("experts")
          .doc(expertId)
          .get();

      if (!expertDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Expert not found.",
        });
      }

      const expert =
        expertDoc.data();

      /* ---------------------------------------------------
         EXPERT VERIFICATION / AVAILABILITY
      --------------------------------------------------- */

      if (
        expert.verificationStatus !==
          "verified" ||
        expert.available === false
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This expert is not currently available for booking.",
        });
      }

      /* ---------------------------------------------------
         GET BUSY RANGES
      --------------------------------------------------- */

      const busyRanges =
        await getBusyRanges(
          expertId
        );

      const now = new Date();

      const slots = [];

      /* ---------------------------------------------------
         GENERATE SLOTS
         
         09:00 -> 21:00
         Every 5 minutes
      --------------------------------------------------- */

      for (
        let minute = DAY_START;
        minute + duration <= DAY_END;
        minute += STEP
      ) {
        const start =
          buildLocalSlot(
            date,
            minute,
            timezoneOffset
          );

        const end = new Date(
          start.getTime() +
            duration * 60000
        );

        /* -------------------------------------------------
           DO NOT SHOW PAST SLOTS
        ------------------------------------------------- */

        if (start <= now) {
          continue;
        }

        /* -------------------------------------------------
           CHECK CONFLICTS
        ------------------------------------------------- */

        const busy =
          busyRanges.some(
            (range) =>
              overlaps(
                start,
                end,
                range.start,
                range.end
              )
          );

        if (busy) {
          continue;
        }

        slots.push({
          startTime:
            start.toISOString(),

          endTime:
            end.toISOString(),
        });
      }

      return res.json({
        success: true,

        expert: {
          id: expertId,
          name:
            expert.name ||
            "Support Professional",
        },

        date,

        duration,

        slots,
      });
    } catch (error) {
      console.error(
        "Availability error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not load available session times.",
      });
    }
  }
);

/* =========================================================
   USER SESSIONS
========================================================= */

router.get(
  "/user",
  authenticate,
  async (req, res) => {
    try {
      const snapshot =
        await db
          .collection("sessions")
          .where(
            "userId",
            "==",
            req.user.uid
          )
          .get();

      const sessions =
        snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );

      sessions.sort(
        (a, b) => {
          const first =
            toDate(
              a.startTime
            )?.getTime() || 0;

          const second =
            toDate(
              b.startTime
            )?.getTime() || 0;

          return first - second;
        }
      );

      return res.json({
        success: true,
        sessions,
      });
    } catch (error) {
      console.error(
        "User sessions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not load your sessions.",
      });
    }
  }
);

/* =========================================================
   EXPERT SESSIONS
========================================================= */

router.get(
  "/expert",
  authenticate,
  async (req, res) => {
    try {
      const expertSnapshot =
        await db
          .collection("experts")
          .where(
            "uid",
            "==",
            req.user.uid
          )
          .limit(1)
          .get();

      if (
        expertSnapshot.empty
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Expert profile not found.",
        });
      }

      const expertId =
        expertSnapshot.docs[0].id;

      const snapshot =
        await db
          .collection("sessions")
          .where(
            "expertId",
            "==",
            expertId
          )
          .get();

      const sessions =
        snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );

      sessions.sort(
        (a, b) => {
          const first =
            toDate(
              a.startTime
            )?.getTime() || 0;

          const second =
            toDate(
              b.startTime
            )?.getTime() || 0;

          return first - second;
        }
      );

      return res.json({
        success: true,
        sessions,
      });
    } catch (error) {
      console.error(
        "Expert sessions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not load expert sessions.",
      });
    }
  }
);

/* =========================================================
   SINGLE SESSION
========================================================= */

router.get(
  "/:sessionId",
  authenticate,
  async (req, res) => {
    try {
      const doc =
        await db
          .collection("sessions")
          .doc(
            req.params.sessionId
          )
          .get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found.",
        });
      }

      const session =
        doc.data();

      /* ---------------------------------------------------
         USER ACCESS
      --------------------------------------------------- */

      if (
        session.userId ===
        req.user.uid
      ) {
        return res.json({
          success: true,
          session: {
            id: doc.id,
            ...session,
          },
        });
      }

      /* ---------------------------------------------------
         EXPERT ACCESS
      --------------------------------------------------- */

      const expert =
        await db
          .collection("experts")
          .doc(
            session.expertId
          )
          .get();

      if (
        !expert.exists ||
        expert.data().uid !==
          req.user.uid
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied.",
        });
      }

      return res.json({
        success: true,
        session: {
          id: doc.id,
          ...session,
        },
      });
    } catch (error) {
      console.error(
        "Get session error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not load session.",
      });
    }
  }
);

module.exports = router;