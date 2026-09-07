const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth");

const {
  getUserNotifications,
  markNotificationRead,
} = require("../models/Notification");

const { db } = require("../config/firebase");

router.get(
  "/:userId",
  authenticate,
  async (req, res) => {
    try {
      if (
        req.user.uid !==
        req.params.userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied.",
        });
      }

      const notifications =
        await getUserNotifications(
          req.user.uid
        );

      return res.json({
        success: true,
        notifications,
      });
    } catch (error) {
      console.error(
        "Get notifications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch notifications.",
      });
    }
  }
);

router.patch(
  "/:notificationId/read",
  authenticate,
  async (req, res) => {
    try {
      const reference = db
        .collection("notifications")
        .doc(
          req.params.notificationId
        );

      const snapshot =
        await reference.get();

      if (!snapshot.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      const data = snapshot.data();

      if (
        data.userId !== req.user.uid
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied.",
        });
      }

      await markNotificationRead(
        req.params.notificationId
      );

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "Mark notification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update notification.",
      });
    }
  }
);

module.exports = router;