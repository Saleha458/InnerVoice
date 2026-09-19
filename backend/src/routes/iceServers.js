"use strict";

const express = require("express");
const authenticate = require("../middleware/auth");

const {
  getSessionAccess
} = require("../services/sessionAccessService");

const {
  getIceConfiguration
} = require("../services/turnService");

const router = express.Router();

router.get(
  "/:sessionId",
  authenticate,
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    const { sessionId } = req.params;

    if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID."
      });
    }

    try {
      const access = await getSessionAccess(
        req.user.uid,
        sessionId
      );

      if (!access.exists) {
        return res.status(404).json({
          success: false,
          message: "Session not found."
        });
      }

      if (!access.isParticipant) {
        return res.status(403).json({
          success: false,
          message: "Access denied."
        });
      }

      if (!access.active) {
        return res.status(403).json({
          success: false,
          message:
            "Calling is available only during the booked session."
        });
      }

      const configuration =
        await getIceConfiguration(
          req.user.uid,
          sessionId
        );

      return res.json({
        success: true,
        ...configuration
      });
    } catch (error) {
      console.error(
        "TURN configuration:",
        error?.status ||
          error?.name ||
          "error"
      );

      return res.status(
        error.status || 503
      ).json({
        success: false,
        message:
          "Call relay is not ready. Check the backend TURN configuration."
      });
    }
  }
);

module.exports = router;