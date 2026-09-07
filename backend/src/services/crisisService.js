const { db } = require("../config/firebase");
const {
  createNotification,
} = require("../models/Notification");

const escalateCrisis = async ({
  userId,
  message,
  riskLevel,
  reason,
}) => {
  const crisisRef = await db
    .collection("crisisAlerts")
    .add({
      userId,
      riskLevel,
      reason,
      message,
      status: "pending",
      createdAt: new Date(),
    });

  await createNotification({
    userId,
    title:
      riskLevel === "crisis"
        ? "Immediate Support Recommended"
        : "Additional Support Available",

    message:
      riskLevel === "crisis"
        ? "Your message suggests you may need immediate support. Please stay with someone you trust and contact appropriate professional or emergency support if you may be in danger."
        : "Your message suggests you may benefit from additional support. A verified InnerVoice expert may be able to help.",

    type: "crisis_alert",

    data: {
      crisisAlertId: crisisRef.id,
      riskLevel,
    },
  });

  return {
    id: crisisRef.id,
    status: "pending",
  };
};

module.exports = {
  escalateCrisis,
};