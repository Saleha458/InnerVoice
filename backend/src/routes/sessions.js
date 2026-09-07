const express = require("express");
const authenticate = require("../middleware/auth");
const { db } = require("../config/firebase");

const router = express.Router();

const MIN_DURATION = 20;
const MAX_DURATION = 45;

const DAY_START =
  9 * 60;

const DAY_END =
  21 * 60;

const STEP =
  15;

const toDate = (value) => {
  if (!value) return null;

  if (
    typeof value.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};

const overlaps = (
  firstStart,
  firstEnd,
  secondStart,
  secondEnd
) =>
  firstStart < secondEnd &&
  firstEnd > secondStart;

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
      Math.floor(
        minutes / 60
      ),
      minutes % 60
    ) +
      timezoneOffset *
        60000
  );
};

const getBusyRanges =
  async (expertId) => {
    const [
      sessions,
      requests,
    ] =
      await Promise.all([
        db
          .collection(
            "sessions"
          )
          .where(
            "expertId",
            "==",
            expertId
          )
          .get(),

        db
          .collection(
            "expertRequests"
          )
          .where(
            "expertId",
            "==",
            expertId
          )
          .get(),
      ]);

    const ranges = [];

    sessions.docs.forEach(
      (doc) => {
        const session =
          doc.data();

        if (
          session.status !==
          "scheduled"
        ) {
          return;
        }

        const start =
          toDate(
            session.startTime
          );

        const end =
          toDate(
            session.endTime
          );

        if (
          start &&
          end
        ) {
          ranges.push({
            start,
            end,
          });
        }
      }
    );

    requests.docs.forEach(
      (doc) => {
        const request =
          doc.data();

        if (
          request.status !==
          "pending"
        ) {
          return;
        }

        const start =
          toDate(
            request.requestedStartTime
          );

        const end =
          toDate(
            request.requestedEndTime
          ) ||
          (
            start
              ? new Date(
                  start.getTime() +
                    Number(
                      request.requestedDuration ||
                        0
                    ) *
                      60000
                )
              : null
          );

        if (
          start &&
          end
        ) {
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

      const date =
        String(
          req.query.date || ""
        );

      const duration =
        Number(
          req.query.duration ||
            30
        );

      const timezoneOffset =
        Number(
          req.query
            .timezoneOffset ??
            0
        );

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

      if (
        !Number.isFinite(
          duration
        ) ||
        duration <
          MIN_DURATION ||
        duration >
          MAX_DURATION
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Session duration must be between 20 and 45 minutes.",
        });
      }

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

      const expertDoc =
        await db
          .collection("experts")
          .doc(expertId)
          .get();

      if (
        !expertDoc.exists
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Expert not found.",
        });
      }

      const expert =
        expertDoc.data();

      if (
        expert.verificationStatus !==
          "verified" ||
        expert.available ===
          false
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This expert is not currently available for booking.",
        });
      }

      const busyRanges =
        await getBusyRanges(
          expertId
        );

      const now =
        new Date();

      const slots = [];

      for (
        let minute =
          DAY_START;
        minute +
          duration <=
          DAY_END;
        minute += STEP
      ) {
        const start =
          buildLocalSlot(
            date,
            minute,
            timezoneOffset
          );

        const end =
          new Date(
            start.getTime() +
              duration *
                60000
          );

        if (
          start <= now
        ) {
          continue;
        }

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
          id:
            expertId,
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
        (a, b) =>
          (
            toDate(
              a.startTime
            )?.getTime() || 0
          ) -
          (
            toDate(
              b.startTime
            )?.getTime() || 0
          )
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
        expertSnapshot.docs[0]
          .id;

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
        (a, b) =>
          (
            toDate(
              a.startTime
            )?.getTime() || 0
          ) -
          (
            toDate(
              b.startTime
            )?.getTime() || 0
          )
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