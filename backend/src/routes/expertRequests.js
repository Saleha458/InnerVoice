const express = require("express");
const authenticate = require("../middleware/auth");
const { db } = require("../config/firebase");

const {
  notifyNewRequest,
  notifyRequestDecision,
} = require("../services/notificationService");

const router = express.Router();

const MIN_DURATION = 20;
const MAX_DURATION = 45;

const toDate = (value) => {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const getUser = async (uid) => {
  const doc = await db
    .collection("users")
    .doc(uid)
    .get();

  return doc.exists
    ? {
        id: doc.id,
        ...doc.data(),
      }
    : null;
};

const getExpert = async (expertId) => {
  const doc = await db
    .collection("experts")
    .doc(expertId)
    .get();

  return doc.exists
    ? {
        id: doc.id,
        ...doc.data(),
      }
    : null;
};

const rangesOverlap = (
  firstStart,
  firstEnd,
  secondStart,
  secondEnd
) =>
  firstStart < secondEnd &&
  firstEnd > secondStart;

const getBusyRanges = async (expertId) => {
  const [
    sessionSnapshot,
    requestSnapshot,
  ] = await Promise.all([
    db
      .collection("sessions")
      .where("expertId", "==", expertId)
      .get(),

    db
      .collection("expertRequests")
      .where("expertId", "==", expertId)
      .get(),
  ]);

  const ranges = [];

  sessionSnapshot.docs.forEach((doc) => {
    const session = doc.data();

    if (session.status !== "scheduled") {
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
  });

  requestSnapshot.docs.forEach((doc) => {
    const request = doc.data();

    if (request.status !== "pending") {
      return;
    }

    const start = toDate(
      request.requestedStartTime
    );

    const end =
      toDate(request.requestedEndTime) ||
      (start
        ? new Date(
            start.getTime() +
              Number(
                request.requestedDuration || 0
              ) *
                60000
          )
        : null);

    if (start && end) {
      ranges.push({
        start,
        end,
      });
    }
  });

  return ranges;
};

const hasConflict = async (
  expertId,
  start,
  end
) => {
  const ranges =
    await getBusyRanges(expertId);

  return ranges.some((range) =>
    rangesOverlap(
      start,
      end,
      range.start,
      range.end
    )
  );
};

/* =========================================================
   CREATE SESSION REQUEST
========================================================= */

router.post(
  "/",
  authenticate,
  async (req, res) => {
    try {
      const uid = req.user.uid;

      const {
        expertId,
        message = "",
        startTime,
        duration,
      } = req.body;

      const user =
        await getUser(uid);

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User account not found.",
        });
      }

      if (user.role !== "user") {
        return res.status(403).json({
          success: false,
          message:
            "Only regular users can book expert sessions.",
        });
      }

      if (!expertId) {
        return res.status(400).json({
          success: false,
          message:
            "Expert is required.",
        });
      }

      const start =
        toDate(startTime);

      const minutes =
        Number(duration);

      if (!start) {
        return res.status(400).json({
          success: false,
          message:
            "A valid session date and time is required.",
        });
      }

      if (
        start.getTime() <=
        Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Session time must be in the future.",
        });
      }

      if (
        !Number.isFinite(minutes) ||
        minutes < MIN_DURATION ||
        minutes > MAX_DURATION
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Session duration must be between 20 and 45 minutes. For longer support, please book another session.",
        });
      }

      const expert =
        await getExpert(expertId);

      if (!expert) {
        return res.status(404).json({
          success: false,
          message:
            "Expert not found.",
        });
      }

      if (
        expert.verificationStatus !==
          "verified" ||
        expert.verified === false ||
        expert.available === false
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This expert is not currently available for booking.",
        });
      }

      const end =
        new Date(
          start.getTime() +
            minutes * 60000
        );

      if (
        await hasConflict(
          expertId,
          start,
          end
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This time is no longer available. Please choose another free slot.",
        });
      }

      /*
       * Prevent the same user from creating
       * the same pending request twice.
       */
      const existing =
        await db
          .collection(
            "expertRequests"
          )
          .where(
            "userId",
            "==",
            uid
          )
          .get();

      const duplicate =
        existing.docs.some((doc) => {
          const request =
            doc.data();

          const existingStart =
            toDate(
              request.requestedStartTime
            );

          return (
            request.expertId ===
              expertId &&
            request.status ===
              "pending" &&
            existingStart &&
            Math.abs(
              existingStart.getTime() -
                start.getTime()
            ) < 60000
          );
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "You already have a pending request for this time.",
        });
      }

      const now =
        new Date();

      const request = {
        userId: uid,

        expertId,

        anonymousId:
          user.anonymousId ||
          req.user.anonymousId ||
          "Anonymous User",

        expertName:
          expert.name ||
          "Support Professional",

        message:
          String(message || "")
            .trim()
            .slice(0, 2000),

        requestedStartTime:
          start,

        requestedDuration:
          minutes,

        requestedEndTime:
          end,

        status:
          "pending",

        reason:
          "",

        sessionId:
          null,

        createdAt:
          now,

        updatedAt:
          now,
      };

      const requestRef =
        await db
          .collection(
            "expertRequests"
          )
          .add(request);

      /*
       * Notify expert immediately.
       */
      await notifyNewRequest(
        expert.uid,
        request.anonymousId,
        requestRef.id,
        {
          expertId,
          startTime:
            start.toISOString(),
          endTime:
            end.toISOString(),
          duration:
            minutes,
        }
      );

      return res.status(201).json({
        success: true,
        requestId:
          requestRef.id,
        request,
      });
    } catch (error) {
      console.error(
        "Create expert request error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not create session request.",
      });
    }
  }
);

/* =========================================================
   USER REQUESTS
========================================================= */

router.get(
  "/user",
  authenticate,
  async (req, res) => {
    try {
      const snapshot =
        await db
          .collection(
            "expertRequests"
          )
          .where(
            "userId",
            "==",
            req.user.uid
          )
          .get();

      const requests =
        snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );

      requests.sort(
        (a, b) =>
          (
            toDate(
              b.createdAt
            )?.getTime() || 0
          ) -
          (
            toDate(
              a.createdAt
            )?.getTime() || 0
          )
      );

      return res.json({
        success: true,
        requests,
      });
    } catch (error) {
      console.error(
        "Get user requests error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not load your session requests.",
      });
    }
  }
);

/* =========================================================
   EXPERT REQUESTS
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

      const expert =
        expertSnapshot.docs[0];

      const expertData =
        expert.data();

      if (
        expertData.verificationStatus !==
        "verified"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Your expert account is not verified.",
        });
      }

      const requestSnapshot =
        await db
          .collection(
            "expertRequests"
          )
          .where(
            "expertId",
            "==",
            expert.id
          )
          .get();

      const requests =
        requestSnapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );

      requests.sort(
        (a, b) =>
          (
            toDate(
              a.requestedStartTime
            )?.getTime() || 0
          ) -
          (
            toDate(
              b.requestedStartTime
            )?.getTime() || 0
          )
      );

      return res.json({
        success: true,
        requests,
      });
    } catch (error) {
      console.error(
        "Get expert requests error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not load support requests.",
      });
    }
  }
);

/* =========================================================
   ACCEPT / REJECT
========================================================= */

router.patch(
  "/:id",
  authenticate,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const status =
        String(
          req.body.status || ""
        ).toLowerCase();

      const reason =
        String(
          req.body.reason || ""
        ).trim();

      if (
        ![
          "accepted",
          "rejected",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Status must be accepted or rejected.",
        });
      }

      if (
        status === "rejected" &&
        !reason
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A rejection reason is required.",
        });
      }

      const requestRef =
        db
          .collection(
            "expertRequests"
          )
          .doc(id);

      const requestDoc =
        await requestRef.get();

      if (
        !requestDoc.exists
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Request not found.",
        });
      }

      const request =
        requestDoc.data();

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
        expertSnapshot.empty ||
        expertSnapshot.docs[0].id !==
          request.expertId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You cannot update this request.",
        });
      }

      const expert =
        expertSnapshot
          .docs[0]
          .data();

      if (
        expert.verificationStatus !==
          "verified" ||
        expert.available === false
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Your expert account is not available.",
        });
      }

      if (
        request.status !==
        "pending"
      ) {
        return res.status(409).json({
          success: false,
          message:
            `This request is already ${request.status}.`,
        });
      }

      /*
       * REJECT
       */
      if (
        status ===
        "rejected"
      ) {
        await requestRef.update({
          status:
            "rejected",
          reason,
          updatedAt:
            new Date(),
        });

        await notifyRequestDecision(
          request.userId,
          "rejected",
          expert.name,
          reason,
          id,
          null
        );

        return res.json({
          success: true,
          status:
            "rejected",
          message:
            "Request rejected and user notified.",
        });
      }

      /*
       * ACCEPT
       */
      const start =
        toDate(
          request.requestedStartTime
        );

      const minutes =
        Number(
          request.requestedDuration
        );

      if (
        !start ||
        !Number.isFinite(minutes) ||
        minutes < MIN_DURATION ||
        minutes > MAX_DURATION
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This request has invalid session timing.",
        });
      }

      if (
        start <= new Date()
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This requested time has already passed. Ask the user to book another session.",
        });
      }

      const end =
        toDate(
          request.requestedEndTime
        ) ||
        new Date(
          start.getTime() +
            minutes * 60000
        );

      if (
        await hasConflict(
          request.expertId,
          start,
          end
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This time is no longer free. Reject this request and ask the user to choose another slot.",
        });
      }

      const sessionRef =
        db
          .collection("sessions")
          .doc();

      const session = {
        userId:
          request.userId,

        expertId:
          request.expertId,

        requestId:
          id,

        startTime:
          start,

        endTime:
          end,

        duration:
          minutes,

        status:
          "scheduled",

        startReminderSent:
          false,

        endReminderSent:
          false,

        completedNotificationSent:
          false,

        createdAt:
          new Date(),

        updatedAt:
          new Date(),
      };

      await db.runTransaction(
        async (transaction) => {
          const latest =
            await transaction.get(
              requestRef
            );

          if (
            !latest.exists ||
            latest.data()
              .status !==
              "pending"
          ) {
            throw new Error(
              "REQUEST_ALREADY_PROCESSED"
            );
          }

          transaction.set(
            sessionRef,
            session
          );

          transaction.update(
            requestRef,
            {
              status:
                "accepted",

              reason:
                "",

              sessionId:
                sessionRef.id,

              requestedEndTime:
                end,

              updatedAt:
                new Date(),
            }
          );
        }
      );

      /*
       * Notify user that session is confirmed.
       */
      await notifyRequestDecision(
        request.userId,
        "accepted",
        expert.name,
        null,
        id,
        sessionRef.id
      );

      return res.json({
        success: true,
        status:
          "accepted",
        sessionId:
          sessionRef.id,
        message:
          "Session confirmed and user notified.",
      });
    } catch (error) {
      if (
        error.message ===
        "REQUEST_ALREADY_PROCESSED"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This request has already been processed.",
        });
      }

      console.error(
        "Update expert request error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not update the request.",
      });
    }
  }
);

module.exports = router;