"use strict";

const express = require("express");

const { db } = require("../config/firebase");

const authenticate = require("../middleware/auth");
const allowRoles = require("../middleware/roleAuth");

const router = express.Router();

router.use(
  authenticate,
  allowRoles("admin")
);

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.patch("/:reportId/status", async (req, res) => {
  const { reportId } = req.params;
  const nextStatus = req.body?.status;

  if (
    !/^[A-Za-z0-9_-]{16,128}$/.test(reportId) ||
    ![
      "in_review",
      "resolved",
      "closed"
    ].includes(nextStatus)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid report status request."
    });
  }

  try {
    const ref = db
      .collection("reports")
      .doc(reportId);

    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists) {
        throw Object.assign(
          new Error("Report not found."),
          { status: 404 }
        );
      }

      const report = snapshot.data();

      if (
        report.privacyVersion !== 2 ||
        report.adminUid !== req.user.uid
      ) {
        throw Object.assign(
          new Error(
            "Report requires owner migration or belongs to another Admin."
          ),
          { status: 403 }
        );
      }

      const allowed = {
        pending: ["in_review"],
        in_review: ["resolved", "closed"],
        resolved: ["closed"],
        closed: []
      };

      if (
        !allowed[report.status || "pending"]
          ?.includes(nextStatus)
      ) {
        throw Object.assign(
          new Error(
            "Refresh: report status has changed or this action is unavailable."
          ),
          { status: 409 }
        );
      }

      transaction.update(ref, {
        status: nextStatus,
        reviewedBy: req.user.uid,
        updatedAt: new Date()
      });
    });

    return res.json({
      success: true,
      id: reportId,
      status: nextStatus
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,

      message: error.status
        ? error.message
        : "Could not update report status."
    });
  }
});

module.exports = router;