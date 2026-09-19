"use strict";

const { db } = require("../config/firebase");

const {
  sanitizeNotification
} = require("./notificationPolicy");

let notificationIO = null;

function setNotificationIO(io) {
  notificationIO = io;
}

async function createNotification({
  userId,
  type,
  title,
  message,
  data
} = {}) {
  if (
    typeof userId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(userId)
  ) {
    return null;
  }

  const safe = sanitizeNotification({
    type,
    title,
    message,
    data
  });

  const now = new Date();

  const payload = {
    userId,
    ...safe,
    read: false,
    createdAt: now,
    privacyVersion: 2
  };

  const ref = await db
    .collection("notifications")
    .add(payload);

  notificationIO
    ?.to(`user:${userId}`)
    .emit("notification:new", {
      id: ref.id,
      ...payload,
      createdAt: now.toISOString()
    });

  return ref.id;
}

function notifyNewRequest(
  expertUid,
  _anonymousId,
  requestId,
  sessionInfo = {}
) {
  return createNotification({
    userId: expertUid,
    type: "expert_request",
    data: {
      requestId,
      sessionId: sessionInfo.sessionId
    }
  });
}

function notifyRequestDecision(
  userId,
  status,
  _expertName,
  _reason,
  requestId,
  sessionId
) {
  return createNotification({
    userId,
    type:
      status === "accepted"
        ? "request_accepted"
        : "request_rejected",
    data: {
      requestId,
      sessionId
    }
  });
}

function notifyExpertMessage(
  userId,
  sessionId,
  messageId,
  _messageType = "text"
) {
  return createNotification({
    userId,
    type: "expert_message",
    data: {
      sessionId,
      messageId
    }
  });
}

function notifySessionStarting(userId, sessionId) {
  return createNotification({
    userId,
    type: "session_starting",
    data: { sessionId }
  });
}

function notifySessionEnding(userId, sessionId) {
  return createNotification({
    userId,
    type: "session_ending",
    data: { sessionId }
  });
}

function notifySessionCompleted(userId, sessionId) {
  return createNotification({
    userId,
    type: "session_completed",
    data: { sessionId }
  });
}

module.exports = {
  setNotificationIO,
  createNotification,
  notifyNewRequest,
  notifyRequestDecision,
  notifyExpertMessage,
  notifySessionStarting,
  notifySessionEnding,
  notifySessionCompleted
};