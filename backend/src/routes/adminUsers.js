"use strict";

const express = require("express");

const { db } = require("../config/firebase");

const authenticate = require("../middleware/auth");
const allowRoles = require("../middleware/roleAuth");

const {
  queueAdminDeletion
} = require("../services/accountLifecycle");

const router = express.Router();

router.use(
  authenticate,
  allowRoles("admin")
);

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const validUid = uid =>
  typeof uid === "string" &&
  /^[A-Za-z0-9_-]{1,128}$/.test(uid);

const fail = (res, code, message) =>
  res.status(code).json({
    success: false,
    message
  });

router.get("/", async (_req, res) => {
  try {
    const snapshot = await db
      .collection("users")
      .get();

    const users = snapshot.docs.map(doc => {
      const account = doc.data();

      return {
        uid: doc.id,

        anonymousId: String(
          account.anonymousId || "Anonymous"
        ).slice(0, 60),

        role: account.role || "user",

        age: Number.isInteger(account.age)
          ? account.age
          : null,

        status: account.status || "active"
      };
    });

    return res.json({
      success: true,
      users
    });
  } catch {
    return fail(
      res,
      500,
      "Could not load users."
    );
  }
});

router.patch("/:uid/status", async (req, res) => {
  const { uid } = req.params;
  const { status } = req.body || {};

  if (
    !validUid(uid) ||
    !["active", "suspended"].includes(status)
  ) {
    return fail(
      res,
      400,
      "Invalid user or status."
    );
  }

  if (uid === req.user.uid) {
    return fail(
      res,
      403,
      "Cannot change your own Admin status."
    );
  }

  try {
    const ref = db.collection("users").doc(uid);

    await db.runTransaction(async transaction => {
      const doc = await transaction.get(ref);

      if (!doc.exists) {
        throw Object.assign(
          new Error("User not found."),
          { status: 404 }
        );
      }

      const account = doc.data();

      if (
        account.role === "admin" ||
        !["active", "suspended"].includes(account.status)
      ) {
        throw Object.assign(
          new Error(
            "This account cannot be changed here."
          ),
          { status: 409 }
        );
      }

      transaction.update(ref, {
        status,
        updatedAt: new Date()
      });
    });

    return res.json({
      success: true,
      status
    });
  } catch (error) {
    return fail(
      res,
      error.status || 500,
      error.status
        ? error.message
        : "Could not update account."
    );
  }
});

router.delete("/:uid", async (req, res) => {
  const { uid } = req.params;

  if (
    !validUid(uid) ||
    uid === req.user.uid ||
    req.body?.confirm !== "DELETE"
  ) {
    return fail(
      res,
      400,
      "Choose another account and type DELETE to confirm."
    );
  }

  try {
    // Existing accountLifecycle safety gate remains active.
    await queueAdminDeletion(uid);

    return res.status(202).json({
      success: true,
      queued: true,
      message:
        "Deletion queued, not yet completed."
    });
  } catch (error) {
    return fail(
      res,
      error.status || 500,
      error.status
        ? error.message
        : "Could not queue deletion."
    );
  }
});

module.exports = router;