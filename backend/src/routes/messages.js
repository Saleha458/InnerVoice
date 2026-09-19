"use strict";

const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth");

const { db } = require("../config/firebase");

const {
  FieldValue
} = require("firebase-admin/firestore");

const {
  decrypt
} = require("../services/encryptionService");

const {
  getSessionAccess,
  serializeSessionAccess,
  getSessionLockMessage
} = require("../services/sessionAccessService");

const validId = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]{1,128}$/.test(value);

const b64 = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9+/=]+$/.test(value);

const validEnvelope = value =>
  value?.v === 1 &&
  b64(value.epk) &&
  value.epk.length < 1000 &&
  b64(value.salt) &&
  value.salt.length < 60 &&
  [value.sender, value.receiver].every(
    part =>
      part?.v === 1 &&
      b64(part.iv) &&
      part.iv.length <= 24 &&
      b64(part.ct) &&
      part.ct.length < 850000
  ) &&
  JSON.stringify(value).length <= 1500000;

router.use(authenticate);

function fail(res, error, message) {
  return res.status(error.status || 500).json({
    success: false,
    message: error.status
      ? error.message
      : message
  });
}

async function accessOrFail(
  uid,
  sessionId,
  mustBeActive
) {
  if (!validId(sessionId)) {
    throw Object.assign(
      new Error("Invalid session ID."),
      { status: 400 }
    );
  }

  const access = await getSessionAccess(
    uid,
    sessionId
  );

  if (!access.exists) {
    throw Object.assign(
      new Error("Session not found."),
      { status: 404 }
    );
  }

  if (!access.isParticipant) {
    throw Object.assign(
      new Error("Access denied."),
      { status: 403 }
    );
  }

  if (
    mustBeActive &&
    !access.active
  ) {
    throw Object.assign(
      new Error(
        getSessionLockMessage(access)
      ),
      { status: 409 }
    );
  }

  return access;
}

function publicMessage(doc) {
  const data = doc.data();

  const common = {
    id: doc.id,
    sessionId: data.sessionId,
    senderId: data.senderId,
    receiverId: data.receiverId,
    type: data.type,
    createdAt: data.createdAt,

    ...(data.mimeType
      ? { mimeType: data.mimeType }
      : {})
  };

  if (
    data.privacyVersion === 2 &&
    data.e2ee
  ) {
    return {
      ...common,
      privacyVersion: 2,
      e2ee: data.e2ee
    };
  }

  // Legacy data remains readable only to
  // verified session participants for migration.

  const plain = decrypt(
    data.encryptedData,
    data.iv,
    data.authTag
  );

  return {
    ...common,
    legacy: true,

    ...(data.type === "voice"
      ? { audio: plain }
      : { message: plain })
  };
}

router.get(
  "/:sessionId",
  async (req, res) => {
    try {
      const access = await accessOrFail(
        req.user.uid,
        req.params.sessionId,
        false
      );

      const snapshot = await db
        .collection("messages")
        .where(
          "sessionId",
          "==",
          req.params.sessionId
        )
        .get();

      const messages = snapshot.docs
        .map(publicMessage)
        .sort(
          (a, b) =>
            new Date(
              a.createdAt?.toDate?.() ||
              a.createdAt ||
              0
            ) -
            new Date(
              b.createdAt?.toDate?.() ||
              b.createdAt ||
              0
            )
        );

      res.set("Cache-Control", "no-store");

      return res.json({
        success: true,
        messages,
        communication:
          serializeSessionAccess(access)
      });
    } catch (error) {
      return fail(
        res,
        error,
        "Could not load private messages."
      );
    }
  }
);

router.post("/", async (_req, res) => {
  return res.status(400).json({
    success: false,
    message:
      "Plaintext messaging is disabled. Use client-encrypted chat."
  });
});

router.post(
  "/:id/migrate",
  async (req, res) => {
    try {
      if (
        !validId(req.params.id) ||
        !validEnvelope(req.body?.e2ee)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid encrypted migration."
        });
      }

      const ref = db
        .collection("messages")
        .doc(req.params.id);

      const message = await ref.get();

      if (!message.exists) {
        return res.status(404).json({
          success: false,
          message: "Message not found."
        });
      }

      const data = message.data();

      await accessOrFail(
        req.user.uid,
        data.sessionId,
        false
      );

      await db.runTransaction(
        async transaction => {
          const latest =
            await transaction.get(ref);

          if (
            !latest.exists ||
            latest.data().privacyVersion === 2 ||
            latest.data().sessionId !==
              data.sessionId
          ) {
            throw Object.assign(
              new Error(
                "Message already migrated or missing."
              ),
              { status: 409 }
            );
          }

          transaction.update(ref, {
            privacyVersion: 2,
            e2ee: req.body.e2ee,

            encryptedData: FieldValue.delete(),
            iv: FieldValue.delete(),
            authTag: FieldValue.delete(),

            message: FieldValue.delete(),
            audio: FieldValue.delete(),

            legacyMigratedAt: new Date()
          });
        }
      );

      return res.json({
        success: true
      });
    } catch (error) {
      return fail(
        res,
        error,
        "Could not migrate private message."
      );
    }
  }
);

module.exports = router;