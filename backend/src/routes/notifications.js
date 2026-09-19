"use strict";

const router = require("express").Router();

const { db } = require("../config/firebase");

const authenticate = require("../middleware/auth");

const {
  sanitizeNotification
} = require("../services/notificationPolicy");

router.use(authenticate);

const validId = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]{1,128}$/.test(value);

function publicNotification(doc) {
  const raw = doc.data();

  return {
    id: doc.id,
    ...sanitizeNotification(raw),
    read: Boolean(raw.read),

    createdAt:
      raw.createdAt?.toDate?.()?.toISOString?.() ||
      raw.createdAt ||
      null
  };
}

async function listMine(req, res) {
  try {
    const snap = await db
      .collection("notifications")
      .where("userId", "==", req.user.uid)
      .get();

    const notifications = snap.docs
      .map(publicNotification)
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      );

    res.set("Cache-Control", "no-store");

    return res.json({
      success: true,
      notifications,
      unreadCount: notifications.filter(
        item => !item.read
      ).length
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Could not load notifications."
    });
  }
}

router.get("/me", listMine);

router.get(
  "/status/unread-count",
  async (req, res) => {
    try {
      const snap = await db
        .collection("notifications")
        .where("userId", "==", req.user.uid)
        .get();

      return res.json({
        success: true,
        unreadCount: snap.docs.filter(
          doc => !doc.data().read
        ).length
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: "Could not load notification count."
      });
    }
  }
);

router.patch(
  "/read-all",
  async (req, res) => {
    try {
      const snap = await db
        .collection("notifications")
        .where("userId", "==", req.user.uid)
        .get();

      const unread = snap.docs.filter(
        doc => !doc.data().read
      );

      let updated = 0;

      for (
        let i = 0;
        i < unread.length;
        i += 400
      ) {
        const batch = db.batch();

        for (
          const doc of unread.slice(i, i + 400)
        ) {
          batch.update(doc.ref, {
            read: true,
            readAt: new Date()
          });
        }

        await batch.commit();

        updated += Math.min(
          400,
          unread.length - i
        );
      }

      return res.json({
        success: true,
        updated
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: "Could not mark notifications read."
      });
    }
  }
);

router.patch(
  "/:notificationId/read",
  async (req, res) => {
    if (!validId(req.params.notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification."
      });
    }

    try {
      const ref = db
        .collection("notifications")
        .doc(req.params.notificationId);

      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({
          success: false,
          message: "Notification not found."
        });
      }

      if (snap.data().userId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: "Access denied."
        });
      }

      await ref.update({
        read: true,
        readAt: new Date()
      });

      return res.json({
        success: true,
        notificationId: ref.id
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: "Could not mark notification read."
      });
    }
  }
);

// Compatibility with existing /notifications/:userId callers.
router.get(
  "/:userId",
  (req, res) =>
    req.params.userId === req.user.uid
      ? listMine(req, res)
      : res.status(403).json({
          success: false,
          message: "Access denied."
        })
);

module.exports = router;