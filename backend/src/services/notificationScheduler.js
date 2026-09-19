const {
  db,
} =
  require("../config/firebase");

const {
  notifySessionStarting,
  notifySessionEnding,
  notifySessionCompleted,
} =
  require("./notificationService");

/* =========================================================
   DATE
========================================================= */

const toDate =
  (
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
          Number(
            seconds
          )
        )
      ) {
        return new Date(
          Number(
            seconds
          ) *
            1000 +
            Number(
              nanoseconds
            ) /
              1000000
        );
      }
    }

    const date =
      new Date(
        value
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  };

/* =========================================================
   FIVE MINUTE WINDOW
========================================================= */

const shouldSendReminder =
  (
    target,
    now
  ) => {
    const difference =
      target.getTime() -
      now.getTime();

    return (
      difference >
        0 &&
      difference <=
        5 *
          60 *
          1000
    );
  };

/* =========================================================
   LOCK
========================================================= */

let running =
  false;

let schedulerInterval =
  null;

/* =========================================================
   NOTIFY BOTH
========================================================= */

const notifyBoth =
  async (
    session,
    sessionId,
    notifier
  ) => {
    const jobs =
      [];

    if (
      session.userId
    ) {
      jobs.push(
        notifier(
          session.userId,
          sessionId
        )
      );
    }

    if (
      session.expertId
    ) {
      try {
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
          const expert =
            expertDoc.data();

          if (
            expert.uid
          ) {
            jobs.push(
              notifier(
                expert.uid,
                sessionId
              )
            );
          }
        }
      } catch (
        error
      ) {
        console.error(
          "Expert notification lookup:",
          error.message
        );
      }
    }

    if (
      jobs.length
    ) {
      await Promise.all(
        jobs
      );
    }
  };

/* =========================================================
   CHECK
========================================================= */

const runNotificationCheck =
  async () => {
    if (
      running
    ) {
      return;
    }

    running =
      true;

    try {
      const now =
        new Date();

      const snapshot =
        await db
          .collection(
            "sessions"
          )
          .where(
            "status",
            "==",
            "scheduled"
          )
          .get();

      for (
        const doc
        of snapshot.docs
      ) {
        try {
          const session =
            doc.data();

          const start =
            toDate(
              session.startTime
            );

          const end =
            toDate(
              session.endTime
            );

          if (
            !start ||
            !end
          ) {
            continue;
          }

          /* ---------------------------------------------
             START REMINDER
          --------------------------------------------- */

          if (
            !session.startReminderSent &&
            shouldSendReminder(
              start,
              now
            )
          ) {
            await notifyBoth(
              session,
              doc.id,
              notifySessionStarting
            );

            await doc.ref.update({
              startReminderSent:
                true,

              startReminderSentAt:
                new Date(),

              updatedAt:
                new Date(),
            });

            console.log(
              `Start reminder sent: ${doc.id}`
            );
          }

          /* ---------------------------------------------
             END REMINDER
          --------------------------------------------- */

          if (
            !session.endReminderSent &&
            shouldSendReminder(
              end,
              now
            )
          ) {
            await notifyBoth(
              session,
              doc.id,
              notifySessionEnding
            );

            await doc.ref.update({
              endReminderSent:
                true,

              endReminderSentAt:
                new Date(),

              updatedAt:
                new Date(),
            });

            console.log(
              `End reminder sent: ${doc.id}`
            );
          }

          /* ---------------------------------------------
             SESSION COMPLETE
          --------------------------------------------- */

          if (
            end <= now &&
            !session.completedNotificationSent
          ) {
            await notifyBoth(
              session,
              doc.id,
              notifySessionCompleted
            );

            await doc.ref.update({
              status:
                "completed",

              completedNotificationSent:
                true,

              completedAt:
                new Date(),

              updatedAt:
                new Date(),
            });

            console.log(
              `Session completed: ${doc.id}`
            );
          }
        } catch (
          error
        ) {
          console.error(
            `Notification check failed for ${doc.id}:`,
            error.message
          );
        }
      }
    } catch (
      error
    ) {
      console.error(
        "Notification scheduler error:",
        error
      );
    } finally {
      running =
        false;
    }
  };

/* =========================================================
   START SCHEDULER
========================================================= */

const startNotificationScheduler =
  () => {
    if (
      schedulerInterval
    ) {
      return;
    }

    console.log(
      "Session notification scheduler started"
    );

    /*
     * First check immediately.
     */
    runNotificationCheck();

    /*
     * Then every 30 seconds.
     *
     * No node-cron missed-execution spam.
     */
    schedulerInterval =
      setInterval(
        () => {
          runNotificationCheck();
        },
        30000
      );
  };

module.exports = {
  startNotificationScheduler,
  runNotificationCheck,
};