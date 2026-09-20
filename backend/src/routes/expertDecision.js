
"use strict";

const express = require("express");
const { auth, db } = require("../config/firebase");

const authenticate = require("../middleware/auth");
const allowRoles = require("../middleware/roleAuth");

const router = express.Router();

const validId = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]{1,128}$/.test(value);

/*
 * The preceding expertDocuments router checks
 * protected license delivery for approval.
 * This router performs the actual decision.
 */

router.use(
  authenticate,
  allowRoles("admin")
);

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.patch("/:expertId/verify", async (req, res) => {
  const { expertId } = req.params;
  const status = req.body?.status;

  const reason =
    typeof req.body?.reason === "string"
      ? req.body.reason.trim()
      : "";

  if (
    !validId(expertId) ||
    !["verified", "rejected"].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid expert ID or verification decision."
    });
  }

  if (
    status === "rejected" &&
    (reason.length < 3 || reason.length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Enter a rejection reason (3–500 characters)."
    });
  }

  try {
    const ref = db
      .collection("experts")
      .doc(expertId);

    const reviewedAt = new Date();

    const expert = await db.runTransaction(
      async transaction => {
        const expertDoc = await transaction.get(ref);

        if (!expertDoc.exists) {
          const error = new Error(
            "Expert application not found."
          );

          error.status = 404;
          throw error;
        }

        const record = expertDoc.data();

        if (
          record.verificationStatus !== "pending"
        ) {
          const error = new Error(
            "This application has already been reviewed."
          );

          error.status = 409;
          throw error;
        }

        if (!validId(record.uid)) {
          const error = new Error(
            "Expert account is unavailable."
          );

          error.status = 409;
          throw error;
        }

        const userRef = db
          .collection("users")
          .doc(record.uid);

        const userDoc = await transaction.get(userRef);

        if (
          !userDoc.exists ||
          userDoc.data().role !== "expert" ||
          userDoc.data().status !== "active"
        ) {
          const error = new Error(
            "Expert account is unavailable."
          );

          error.status = 409;
          throw error;
        }

        const verified = status === "verified";

        transaction.update(ref, {
          verificationStatus: status,
          verified,
          available: verified,

          rejectionReason: verified
            ? ""
            : reason,

          reviewedBy: req.user.uid,
          reviewedAt,
          updatedAt: reviewedAt
        });

        transaction.update(userRef, {
          verificationStatus: status,
          updatedAt: reviewedAt
        });

        /*
         * Do not copy the license image,
         * private details, or rejection reason
         * into notifications.
         */
        transaction.create(
          db.collection("notifications").doc(),
          {
            userId: record.uid,
            type: "general",
            title: "InnerVoice update",

            message:
              "Your expert application has been reviewed. Sign in to see your status.",

            data: {},
            read: false,
            createdAt: reviewedAt
          }
        );

        return {
          uid: record.uid,
          anonymousId: record.anonymousId
        };
      }
    );

    let tokenRefreshRequired = false;

    try {
      const account = await auth.getUser(expert.uid);

      await auth.setCustomUserClaims(
        expert.uid,
        {
          ...(account.customClaims || {}),
          role: "expert",
          anonymousId: expert.anonymousId,
          verificationStatus: status
        }
      );
    } catch (error) {
      tokenRefreshRequired = true;

      console.error(
        "Expert claim update pending:",
        error?.code || error?.name
      );
    }

    return res.json({
      success: true,
      status,

      message:
        status === "verified"
          ? "Expert verified successfully."
          : "Expert application rejected.",

      tokenRefreshRequired
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    console.error(
      "Expert decision error:",
      error?.code || error?.name
    );

    return res.status(500).json({
      success: false,
      message:
        "Expert decision could not be saved. Please retry."
    });
  }
});

module.exports = router;