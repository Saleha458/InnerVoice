const { db } = require("../config/firebase");

const createNotification = async ({
  userId,
  type,
  title,
  message,
  data = {},
}) => {
  if (!userId) {
    return null;
  }

  const ref =
    await db
      .collection(
        "notifications"
      )
      .add({
        userId,
        type,
        title,
        message,
        data,
        read: false,
        createdAt:
          new Date(),
      });

  return ref.id;
};

const notifyNewRequest = (
  expertUid,
  anonymousId,
  requestId,
  sessionInfo = {}
) =>
  createNotification({
    userId:
      expertUid,

    type:
      "expert_request",

    title:
      "New session request",

    message:
      `${
        anonymousId ||
        "An anonymous user"
      } requested a support session with you.`,

    data: {
      requestId,
      ...sessionInfo,
    },
  });

const notifyRequestDecision = (
  userId,
  status,
  expertName,
  reason = null,
  requestId = null,
  sessionId = null
) => {
  const accepted =
    status ===
    "accepted";

  return createNotification({
    userId,

    type:
      accepted
        ? "request_accepted"
        : "request_rejected",

    title:
      accepted
        ? "Session confirmed"
        : "Session request rejected",

    message:
      accepted
        ? `${
            expertName ||
            "Your expert"
          } accepted your request. Your session is confirmed.`
        : `${
            expertName ||
            "The expert"
          } rejected your request. Reason: ${
            reason ||
            "No reason provided."
          }`,

    data: {
      status,
      reason,
      requestId,
      sessionId,
    },
  });
};

const notifySessionStarting = (
  userId,
  sessionId
) =>
  createNotification({
    userId,

    type:
      "session_starting",

    title:
      "Session starts in 5 minutes",

    message:
      "Your InnerVoice support session will begin in about 5 minutes.",

    data: {
      sessionId,
    },
  });

const notifySessionEnding = (
  userId,
  sessionId
) =>
  createNotification({
    userId,

    type:
      "session_ending",

    title:
      "Session ends in 5 minutes",

    message:
      "Your InnerVoice support session will end in about 5 minutes.",

    data: {
      sessionId,
    },
  });

const notifySessionCompleted = (
  userId,
  sessionId
) =>
  createNotification({
    userId,

    type:
      "session_completed",

    title:
      "Session completed",

    message:
      "Your InnerVoice support session has ended. You can book another session if you need continued support.",

    data: {
      sessionId,
    },
  });

module.exports = {
  createNotification,
  notifyNewRequest,
  notifyRequestDecision,
  notifySessionStarting,
  notifySessionEnding,
  notifySessionCompleted,
};