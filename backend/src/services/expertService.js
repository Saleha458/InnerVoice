const express = require("express");
const { auth, db } = require("../config/firebase");
const authenticate = require("../middleware/auth");
const allowRoles = require("../middleware/roleAuth");

const router = express.Router();

const adminOnly = [authenticate, allowRoles("admin")];

// =========================================================
// GET PENDING EXPERT APPLICATIONS
// =========================================================

router.get("/experts/pending", ...adminOnly, async (req, res) => {
  try {
    const snapshot = await db
      .collection("experts")
      .where("verificationStatus", "==", "pending")
      .get();

    const experts = snapshot.docs.map((doc) => {
      const { password, ...safeData } = doc.data();

      return {
        id: doc.id,
        ...safeData,
      };
    });

    return res.json({
      success: true,
      experts,
    });
  } catch (error) {
    console.error("Pending experts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load pending expert applications.",
    });
  }
});

// =========================================================
// VERIFY / REJECT EXPERT
// =========================================================

router.patch(
  "/experts/:expertId/verify",
  ...adminOnly,
  async (req, res) => {
    try {
      const { status, reason = "" } = req.body;

      if (!["verified", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid verification status.",
        });
      }

      if (status === "rejected" && !String(reason).trim()) {
        return res.status(400).json({
          success: false,
          message: "A rejection reason is required.",
        });
      }

      const expertRef = db
        .collection("experts")
        .doc(req.params.expertId);

      const expertDoc = await expertRef.get();

      if (!expertDoc.exists) {
        return res.status(404).json({
          success: false,
          message: "Expert application not found.",
        });
      }

      const expert = expertDoc.data();

      if (expert.verificationStatus !== "pending") {
        return res.status(409).json({
          success: false,
          message: "This application has already been processed.",
        });
      }

      const now = new Date();

      const rejectionReason =
        status === "rejected"
          ? String(reason).trim()
          : null;

      const verified = status === "verified";

      // -----------------------------------------------------
      // UPDATE EXPERT
      // -----------------------------------------------------

      await expertRef.update({
        verificationStatus: status,
        verified,
        available: verified,
        rejectionReason,
        updatedAt: now,
      });

      // -----------------------------------------------------
      // UPDATE USER ACCOUNT
      // -----------------------------------------------------

      if (expert.uid) {
        await db
          .collection("users")
          .doc(expert.uid)
          .set(
            {
              verificationStatus: status,
              updatedAt: now,
            },
            { merge: true }
          );

        // ---------------------------------------------------
        // UPDATE FIREBASE CUSTOM CLAIMS
        // ---------------------------------------------------

        const existingUser = await auth.getUser(expert.uid);

        const existingClaims =
          existingUser.customClaims || {};

        await auth.setCustomUserClaims(expert.uid, {
          ...existingClaims,
          role: "expert",
          anonymousId: expert.anonymousId,
          verificationStatus: status,
        });

        // ---------------------------------------------------
        // SEND NOTIFICATION TO EXPERT
        // ---------------------------------------------------

        await db.collection("notifications").add({
          userId: expert.uid,
          type: "expert_verification",

          title: verified
            ? "Expert account verified"
            : "Expert application rejected",

          message: verified
            ? "Your professional credentials have been verified. Your profile can now appear to users."
            : `Your expert application was rejected. Reason: ${rejectionReason}`,

          data: {
            expertId: req.params.expertId,
            status,
          },

          read: false,
          createdAt: now,
        });
      }

      return res.json({
        success: true,

        message: verified
          ? "Expert verified successfully."
          : "Expert rejected successfully.",
      });
    } catch (error) {
      console.error(
        "Expert verification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Expert verification failed.",
      });
    }
  }
);

// =========================================================
// GET ALL USERS
// =========================================================

router.get("/users", ...adminOnly, async (req, res) => {
  try {
    const snapshot = await db
      .collection("users")
      .get();

    const users = snapshot.docs.map((doc) => {
      const { password, ...safeData } = doc.data();

      return {
        id: doc.id,
        ...safeData,
      };
    });

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Admin users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load users.",
    });
  }
});

// =========================================================
// ACTIVATE / SUSPEND USER
// =========================================================

router.patch(
  "/users/:uid/status",
  ...adminOnly,
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!["active", "suspended"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status.",
        });
      }

      // Admin cannot suspend herself
      if (req.params.uid === req.user.uid) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot suspend your own admin account.",
        });
      }

      await db
        .collection("users")
        .doc(req.params.uid)
        .update({
          status,
          updatedAt: new Date(),
        });

      return res.json({
        success: true,
        message: `User ${status}.`,
      });
    } catch (error) {
      console.error(
        "Admin user status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Could not update user.",
      });
    }
  }
);

// =========================================================
// DELETE USER
// =========================================================

router.delete(
  "/users/:uid",
  ...adminOnly,
  async (req, res) => {
    try {
      // Admin cannot delete herself
      if (req.params.uid === req.user.uid) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot delete your own admin account.",
        });
      }

      await db
        .collection("users")
        .doc(req.params.uid)
        .delete();

      try {
        await auth.deleteUser(req.params.uid);
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          throw error;
        }
      }

      return res.json({
        success: true,
        message: "User permanently deleted.",
      });
    } catch (error) {
      console.error(
        "Admin delete user error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Could not delete user.",
      });
    }
  }
);

module.exports = router;