const cron =
  require("node-cron");

const {
  db,
} = require("../config/firebase");

const {
  notifySessionStarting,
  notifySessionEnding,
  notifySessionCompleted,
} = require("./notificationService");

const toDate = (value) => {
  if (!value) {
    return null;
  }

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

const withinFiveMinutes = (
  target,
  now
) => {
  const difference =
    target.getTime() -
    now.getTime();

  return (
    difference >=
      4 * 60000 &&
    difference <=
      6 * 60000
  );
};

let running =
  false;

const notifyBoth = async (
  session,
  sessionId,
  notificationFunction
) => {
  const jobs = [];

  if (
    session.userId
  ) {
    jobs.push(
      notificationFunction(
        session.userId,
        sessionId
      )
    );
  }

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

    const expertUid =
      expertDoc.exists
        ? expertDoc.data()
            .uid
        : null;

    if (expertUid) {
      jobs.push(
        notificationFunction(
          expertUid,
          sessionId
        )
      );
    }
  }

  await Promise.all(
    jobs
  );
};

const runNotificationCheck =
  async () => {
    if (running) {
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
        const doc of
          snapshot.docs
      ) {
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

        /*
         * 5 MIN BEFORE START
         */
        if (
          !session.startReminderSent &&
          withinFiveMinutes(
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

            updatedAt:
              new Date(),
          });
        }

        /*
         * 5 MIN BEFORE END
         */
        if (
          !session.endReminderSent &&
          withinFiveMinutes(
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

            updatedAt:
              new Date(),
          });
        }

        /*
         * SESSION COMPLETED
         */
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

            updatedAt:
              new Date(),
          });
        }
      }
    } catch (error) {
      console.error(
        "Notification scheduler error:",
        error.message
      );
    } finally {
      running =
        false;
    }
  };

const startNotificationScheduler =
  () => {
    cron.schedule(
      "* * * * *",
      runNotificationCheck
    );

    console.log(
      "5-minute session notification scheduler started"
    );

    runNotificationCheck();
  };

module.exports = {
  startNotificationScheduler,
  runNotificationCheck,
};