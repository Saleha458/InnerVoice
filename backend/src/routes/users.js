const express = require("express");

const {
  db,
} = require("../config/firebase");

const authenticate = require("../middleware/auth");

const {
  deactivateAccount,
  queueDeletion,
} = require("../services/accountLifecycle");

const router = express.Router();
const users = db.collection("users");

/* =========================================================
   HELPERS
========================================================= */

const getUserById = async (id) => {
  const doc = await users.doc(id).get();

  return doc.exists
    ? {
        id: doc.id,
        ...doc.data(),
      }
    : null;
};

const publicUser = (user) => {
  if (!user) return null;

  const {
    password,
    ...safe
  } = user;

  return safe;
};

const createUser = async (data) => {
  const now = new Date();

  const ref = await users.add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: ref.id,
    ...data,
  };
};

const updateUser = async (id, data) => {
  await users.doc(id).update({
    ...data,
    updatedAt: new Date(),
  });

  return getUserById(id);
};

/* =========================================================
   GET CURRENT PROFILE
========================================================= */

router.get(
  "/me",
  authenticate,
  async (req, res) => {
    try {
      const user = await getUserById(
        req.user.uid
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Account not found.",
        });
      }

      return res.json({
        success: true,
        user: publicUser(user),
      });
    } catch (err) {
      console.error("Profile loading:", err);

      return res.status(500).json({
        success: false,
        message: "Could not load profile.",
      });
    }
  }
);

/* =========================================================
   UPDATE CURRENT PROFILE
========================================================= */

router.patch(
  "/me",
  authenticate,
  async (req, res) => {
    try {
      const user = await getUserById(
        req.user.uid
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Account not found.",
        });
      }

      const safe = {};

      if (req.body.age !== undefined) {
        const age = Number(req.body.age);

        const minimum =
          user.role === "user" ? 15 : 1;

        if (
          !Number.isInteger(age) ||
          age < minimum ||
          age > 120
        ) {
          return res.status(400).json({
            success: false,
            message: `Age must be ${minimum}–120.`,
          });
        }

        safe.age = age;
      }

      if (req.body.displayName !== undefined) {
        const name = String(
          req.body.displayName
        ).trim();

        if (!name || name.length > 80) {
          return res.status(400).json({
            success: false,
            message: "Invalid display name.",
          });
        }

        safe.displayName = name;
      }

      if (req.body.gender !== undefined) {
        const gender = String(
          req.body.gender
        ).trim();

        if (gender.length > 40) {
          return res.status(400).json({
            success: false,
            message: "Invalid gender.",
          });
        }

        safe.gender = gender;
      }

      // Security-sensitive fields cannot be changed here.

      const updated = await updateUser(
        req.user.uid,
        safe
      );

      return res.json({
        success: true,
        user: publicUser(updated),
      });
    } catch (err) {
      console.error("Profile update:", err);

      return res.status(500).json({
        success: false,
        message: "Could not update profile.",
      });
    }
  }
);

/* =========================================================
   DEACTIVATE ACCOUNT
========================================================= */

router.post(
  "/me/deactivate",
  authenticate,
  async (req, res) => {
    try {
      const deleteAfter =
        await deactivateAccount(
          req.user.uid,
          req.body?.password
        );

      return res.json({
        success: true,

        message:
          "Account deactivated. You can restore it within 30 days.",

        deleteAfter: deleteAfter.toISOString(),
      });
    } catch (err) {
      console.error(
        "Account deactivation:",
        err
      );

      return res.status(err.status || 500).json({
        success: false,

        message: err.status
          ? err.message
          : "Could not complete deactivation. Check account status before retrying.",
      });
    }
  }
);

/* =========================================================
   REQUEST PERMANENT DELETION
========================================================= */

router.delete(
  "/me",
  authenticate,
  async (req, res) => {
    if (req.body?.confirmation !== "DELETE") {
      return res.status(400).json({
        success: false,
        message: "Type DELETE to confirm.",
      });
    }

    try {
      await queueDeletion(
        req.user.uid,
        req.body?.password
      );

      return res.status(202).json({
        success: true,
        queued: true,

        message:
          "Account access is closed. Permanent deletion is queued; it may take time to finish.",
      });
    } catch (err) {
      console.error(
        "Account deletion:",
        err
      );

      return res.status(err.status || 500).json({
        success: false,

        message: err.status
          ? err.message
          : "Could not request account deletion.",
      });
    }
  }
);

module.exports = router;

module.exports.createUser = createUser;
module.exports.getUserById = getUserById;
module.exports.updateUser = updateUser;