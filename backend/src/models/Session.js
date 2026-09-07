const { db } = require("../config/firebase");

const createSession = async (sessionData) => {
  const docRef = await db
    .collection("sessions")
    .add({
      ...sessionData,
      status: "scheduled",
      startReminderSent: false,
      endReminderSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  return {
    id: docRef.id,
    ...sessionData,
    status: "scheduled",
  };
};

const getSessionById = async (
  sessionId
) => {
  const doc = await db
    .collection("sessions")
    .doc(sessionId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
};

module.exports = {
  createSession,
  getSessionById,
};