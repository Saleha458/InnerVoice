"use strict";

const {
  createNotification
} = require("./notificationService");

/*
 * Privacy-first self-support.
 *
 * This service NEVER stores:
 * - the user's message or voice transcript
 * - the risk-detection reason
 * - risk level in Firestore
 * - a crisisAlerts document
 *
 * It does not notify an admin, expert,
 * emergency responder, or trusted contact.
 */

async function escalateCrisis({
  userId,
  riskLevel
}) {
  if (
    typeof userId !== "string" ||
    !userId.trim()
  ) {
    throw new Error(
      "Authenticated user required."
    );
  }

  if (
    !["high", "crisis"].includes(riskLevel)
  ) {
    throw new Error(
      "Invalid self-support request."
    );
  }

  try {
    await createNotification({
      userId,

      type: "support_resources",

      title: "Support options are available",

      message:
        "If you feel unsafe, contact someone " +
        "you trust or appropriate local emergency " +
        "services. InnerVoice does not provide " +
        "live emergency monitoring.",

      data: {}
    });

    return {
      status: "self_support_only",
      notificationSent: true,
      humanNotified: false
    };
  } catch {
    // Notification failure must not prevent
    // the user from receiving a safety response.

    return {
      status: "self_support_only",
      notificationSent: false,
      humanNotified: false
    };
  }
}

module.exports = {
  escalateCrisis
};