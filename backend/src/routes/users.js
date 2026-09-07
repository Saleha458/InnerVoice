const express = require("express");
const router = express.Router();

const {
  db,
} = require("../config/firebase");

const authenticate =
  require("../middleware/auth");

const usersCollection =
  db.collection("users");

/*
========================================================
USER HELPERS
========================================================
*/

const createUser = async (userData) => {
  const now = new Date();

  const docRef =
    await usersCollection.add({
      ...userData,
      createdAt: now,
      updatedAt: now,
    });

  return {
    id: docRef.id,
    ...userData,
  };
};

const getUserById = async (id) => {
  const doc =
    await usersCollection
      .doc(id)
      .get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
};

const updateUser = async (
  id,
  data
) => {
  await usersCollection
    .doc(id)
    .update({
      ...data,
      updatedAt: new Date(),
    });

  return getUserById(id);
};

const deleteUser = async (id) => {
  await usersCollection
    .doc(id)
    .delete();

  return true;
};

/*
========================================================
GET CURRENT USER
========================================================
*/

router.get(
  "/me",
  authenticate,
  async (req, res) => {
    try {
      const userId =
        req.user?.uid;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      const user =
        await getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      return res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error(
        "GET /users/me error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to get user profile.",
      });
    }
  }
);

/*
========================================================
UPDATE CURRENT USER
========================================================
*/

router.patch(
  "/me",
  authenticate,
  async (req, res) => {
    try {
      const userId =
        req.user?.uid;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      /*
       * Do not allow users to change
       * security-sensitive fields.
       */

      const allowedFields = [
        "displayName",
        "anonymousId",
        "age",
        "gender",
        "quickExitPreferences",
      ];

      const safeData = {};

      allowedFields.forEach(
        (field) => {
          if (
            req.body[field] !==
            undefined
          ) {
            safeData[field] =
              req.body[field];
          }
        }
      );

      const updatedUser =
        await updateUser(
          userId,
          safeData
        );

      return res.json({
        success: true,
        user: updatedUser,
      });
    } catch (error) {
      console.error(
        "PATCH /users/me error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update profile.",
      });
    }
  }
);

/*
========================================================
DELETE CURRENT USER
========================================================
*/

router.delete(
  "/me",
  authenticate,
  async (req, res) => {
    try {
      const userId =
        req.user?.uid;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      await deleteUser(userId);

      return res.json({
        success: true,
        message:
          "User account deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE /users/me error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete account.",
      });
    }
  }
);

/*
========================================================
EXPORT
========================================================
*/

module.exports = router;

module.exports.createUser =
  createUser;

module.exports.getUserById =
  getUserById;

module.exports.updateUser =
  updateUser;

module.exports.deleteUser =
  deleteUser;