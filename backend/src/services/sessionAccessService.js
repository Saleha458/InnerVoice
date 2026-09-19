const {
  db,
} = require("../config/firebase");

/* =========================================================
   DATE HELPER
========================================================= */

const toDate = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    const date =
      value.toDate();

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  if (
    value instanceof Date
  ) {
    return Number.isNaN(
      value.getTime()
    )
      ? null
      : value;
  }

  if (
    typeof value ===
    "object"
  ) {
    const seconds =
      value.seconds ??
      value._seconds;

    const nanoseconds =
      value.nanoseconds ??
      value._nanoseconds ??
      0;

    if (
      Number.isFinite(
        Number(seconds)
      )
    ) {
      const date =
        new Date(
          Number(seconds) *
            1000 +
            Number(
              nanoseconds
            ) /
              1000000
        );

      return Number.isNaN(
        date.getTime()
      )
        ? null
        : date;
    }
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};

/* =========================================================
   GET END TIME
========================================================= */

const getSessionEndTime =
  (
    session
  ) => {
    const directEnd =
      toDate(
        session?.endTime
      );

    if (directEnd) {
      return directEnd;
    }

    const start =
      toDate(
        session?.startTime
      );

    const duration =
      Number(
        session?.duration ||
          0
      );

    if (
      start &&
      Number.isFinite(
        duration
      ) &&
      duration > 0
    ) {
      return new Date(
        start.getTime() +
          duration *
            60000
      );
    }

    return null;
  };

/* =========================================================
   GET SESSION + PARTICIPANT ACCESS
========================================================= */

const getSessionAccess =
  async (
    uid,
    sessionId
  ) => {
    if (
      !uid ||
      !sessionId
    ) {
      return {
        exists:
          false,

        isParticipant:
          false,

        active:
          false,

        phase:
          "invalid",
      };
    }

    const sessionDoc =
      await db
        .collection(
          "sessions"
        )
        .doc(
          sessionId
        )
        .get();

    if (
      !sessionDoc.exists
    ) {
      return {
        exists:
          false,

        isParticipant:
          false,

        active:
          false,

        phase:
          "not-found",
      };
    }

    const session = {
      id:
        sessionDoc.id,

      ...sessionDoc.data(),
    };

    let role =
      null;

    let peerUid =
      null;

    /* -----------------------------------------------------
       USER
    ----------------------------------------------------- */

    if (
      session.userId ===
      uid
    ) {
      role =
        "user";

      if (
        session.expertId
      ) {
        const expertDoc =
          await db
            .collection(
              "experts"
            )
            .doc(
              session.expertId
            )
            .get();

        if (
          expertDoc.exists
        ) {
          peerUid =
            expertDoc.data()
              .uid ||
            null;
        }
      }
    } else {
      /* ---------------------------------------------------
         EXPERT
      --------------------------------------------------- */

      if (
        session.expertId
      ) {
        const expertDoc =
          await db
            .collection(
              "experts"
            )
            .doc(
              session.expertId
            )
            .get();

        if (
          expertDoc.exists &&
          expertDoc.data()
            .uid ===
            uid
        ) {
          role =
            "expert";

          peerUid =
            session.userId ||
            null;
        }
      }
    }

    if (!role) {
      return {
        exists:
          true,

        isParticipant:
          false,

        active:
          false,

        phase:
          "forbidden",

        session,
      };
    }

    const startTime =
      toDate(
        session.startTime
      );

    const endTime =
      getSessionEndTime(
        session
      );

    if (
      !startTime ||
      !endTime
    ) {
      return {
        exists:
          true,

        isParticipant:
          true,

        active:
          false,

        phase:
          "invalid-time",

        role,

        peerUid,

        session,

        startTime,

        endTime,
      };
    }

    const now =
      new Date();

    /* -----------------------------------------------------
       CANCELLED / NON-USABLE SESSION
    ----------------------------------------------------- */

    if (
      ![
        "scheduled",
        "completed",
      ].includes(
        session.status
      )
    ) {
      return {
        exists:
          true,

        isParticipant:
          true,

        active:
          false,

        phase:
          "closed",

        role,

        peerUid,

        session,

        startTime,

        endTime,

        now,
      };
    }

    /* -----------------------------------------------------
       BEFORE SESSION
    ----------------------------------------------------- */

    if (
      now <
      startTime
    ) {
      return {
        exists:
          true,

        isParticipant:
          true,

        active:
          false,

        phase:
          "upcoming",

        role,

        peerUid,

        session,

        startTime,

        endTime,

        now,

        millisecondsUntilStart:
          startTime.getTime() -
          now.getTime(),
      };
    }

    /* -----------------------------------------------------
       SESSION ENDED

       We check actual endTime, not only status.
       Even if scheduler is late, communication closes.
    ----------------------------------------------------- */

    if (
      now >=
        endTime ||
      session.status ===
        "completed"
    ) {
      return {
        exists:
          true,

        isParticipant:
          true,

        active:
          false,

        phase:
          "ended",

        role,

        peerUid,

        session,

        startTime,

        endTime,

        now,
      };
    }

    /* -----------------------------------------------------
       ACTIVE SESSION
    ----------------------------------------------------- */

    return {
      exists:
        true,

      isParticipant:
        true,

      active:
        true,

      phase:
        "active",

      role,

      peerUid,

      session,

      startTime,

      endTime,

      now,

      millisecondsRemaining:
        endTime.getTime() -
        now.getTime(),
    };
  };

/* =========================================================
   CLIENT-SAFE ACCESS INFO
========================================================= */

const serializeSessionAccess =
  (
    access
  ) => ({
    active:
      Boolean(
        access?.active
      ),

    phase:
      access?.phase ||
      "invalid",

    startTime:
      access?.startTime
        ? access.startTime.toISOString()
        : null,

    endTime:
      access?.endTime
        ? access.endTime.toISOString()
        : null,

    millisecondsRemaining:
      access?.millisecondsRemaining ??
      null,

    millisecondsUntilStart:
      access?.millisecondsUntilStart ??
      null,
  });

/* =========================================================
   USER-FRIENDLY MESSAGE
========================================================= */

const getSessionLockMessage =
  (
    access
  ) => {
    if (
      access?.phase ===
      "upcoming"
    ) {
      return "This session has not started yet. Communication will unlock at the booked start time.";
    }

    if (
      access?.phase ===
      "ended"
    ) {
      return "This session has ended. The conversation is now read-only. Book another session to continue support.";
    }

    if (
      access?.phase ===
      "closed"
    ) {
      return "This session is no longer available for communication.";
    }

    return "This session is not currently available for communication.";
  };

module.exports = {
  toDate,
  getSessionEndTime,
  getSessionAccess,
  serializeSessionAccess,
  getSessionLockMessage,
};