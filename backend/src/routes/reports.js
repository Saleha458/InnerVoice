const express = require("express");

const {
  db,
} = require("../config/firebase");

const authenticate =
  require("../middleware/auth");

const allowRoles =
  require("../middleware/roleAuth");

const router =
  express.Router();

const toDate = (value) => {
  if (!value) {
    return new Date(0);
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  return new Date(value);
};


// ========================================================
// CREATE REPORT
// ========================================================

router.post(
  "/",
  authenticate,
  allowRoles("user"),
  async (req, res) => {
    try {
      const {
        category = "general",
        description,
        severity = "medium",
      } = req.body;

      const cleanDescription =
        String(
          description || ""
        ).trim();

      if (
        cleanDescription.length <
        10
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Report description must be at least 10 characters.",
        });
      }

      const allowedSeverity = [
        "low",
        "medium",
        "high",
        "critical",
      ];

      if (
        !allowedSeverity.includes(
          severity
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid severity.",
        });
      }

      const now =
        new Date();

      const data = {
        reporterId:
          req.user.uid,

        category:
          String(
            category
          ),

        description:
          cleanDescription,

        severity,

        anonymous:
          true,

        status:
          "pending",

        createdAt:
          now,

        updatedAt:
          now,
      };

      const ref =
        await db
          .collection("reports")
          .add(data);

      res.status(201).json({
        success: true,

        message:
          "Report submitted successfully.",

        report: {
          id:
            ref.id,

          ...data,
        },
      });
    } catch (error) {
      console.error(
        "Create report:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to submit report.",
      });
    }
  }
);


// ========================================================
// USER REPORTS
// ========================================================

router.get(
  "/",
  authenticate,
  allowRoles("user"),
  async (req, res) => {
    try {
      const snapshot =
        await db
          .collection("reports")
          .where(
            "reporterId",
            "==",
            req.user.uid
          )
          .get();

      const reports =
        snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );

      reports.sort(
        (a, b) =>
          toDate(
            b.createdAt
          ).getTime() -
          toDate(
            a.createdAt
          ).getTime()
      );

      res.json({
        success: true,
        reports,
      });
    } catch (error) {
      console.error(
        "Get reports:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch reports.",
      });
    }
  }
);


// ========================================================
// ADMIN REPORTS
// ========================================================

router.get(
  "/admin/all",
  authenticate,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const snapshot =
        await db
          .collection("reports")
          .get();

      const reports =
        snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );

      reports.sort(
        (a, b) =>
          toDate(
            b.createdAt
          ).getTime() -
          toDate(
            a.createdAt
          ).getTime()
      );

      res.json({
        success: true,
        reports,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "Failed to fetch reports.",
      });
    }
  }
);

module.exports = router;