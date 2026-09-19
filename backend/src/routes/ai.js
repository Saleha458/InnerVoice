"use strict";

const express = require("express");
const router = express.Router();

router.use("/voice", require("./aiVoice"));

const authenticate = require("../middleware/auth");

const { db } = require("../config/firebase");

const {
  decrypt
} = require("../services/encryptionService");

const {
  generateAIResponse,
  getSafeReply
} = require("../services/aiService");

const {
  detectRisk
} = require("../services/riskDetectionService");

const {
  escalateCrisis
} = require("../services/crisisService");

const {
  FieldValue
} = require("firebase-admin/firestore");

const conversations =
  db.collection("aiConversations");

const validId = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]{1,128}$/.test(value);

const validBase64 = value =>
  typeof value === "string" &&
  value.length > 0 &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(value);

function validEnvelope(value) {
  return (
    value?.v === 1 &&
    validBase64(value.iv) &&
    Buffer.from(
      value.iv,
      "base64"
    ).length === 12 &&
    validBase64(value.ct) &&
    Buffer.from(
      value.ct,
      "base64"
    ).length > 16 &&
    value.ct.length <= 35000
  );
}

function sendError(
  res,
  error,
  fallback
) {
  return res.status(
    error.status || 500
  ).json({
    success: false,

    message: error.status
      ? error.message
      : fallback
  });
}

router.use(authenticate);

async function ownerRef(
  uid,
  conversationId
) {
  if (!validId(conversationId)) {
    throw Object.assign(
      new Error(
        "Invalid conversation ID."
      ),
      { status: 400 }
    );
  }

  const ref =
    conversations.doc(conversationId);

  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw Object.assign(
      new Error(
        "Conversation not found."
      ),
      { status: 404 }
    );
  }

  if (
    snapshot.data().userId !== uid
  ) {
    throw Object.assign(
      new Error("Access denied."),
      { status: 403 }
    );
  }

  return ref;
}

/* ------------------------------------------
   CREATE PRIVATE CONVERSATION
------------------------------------------ */

router.post(
  "/conversations",
  async (req, res) => {
    try {
      const vault = await db
        .collection("privateVaults")
        .doc(req.user.uid)
        .get();

      if (!vault.exists) {
        return res.status(409).json({
          success: false,

          message:
            "Create your private vault first."
        });
      }

      const now = new Date();

      const ref = conversations.doc();

      await ref.set({
        userId: req.user.uid,
        privacyVersion: 2,
        createdAt: now,
        updatedAt: now
      });

      return res.status(201).json({
        success: true,
        conversationId: ref.id
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Could not create AI conversation."
      );
    }
  }
);

/* ------------------------------------------
   LOAD OWNER'S ENCRYPTED HISTORY
------------------------------------------ */

router.get(
  "/conversations/:conversationId",
  async (req, res) => {
    try {
      const ref = await ownerRef(
        req.user.uid,
        req.params.conversationId
      );

      const snapshot = await ref
        .collection("messages")
        .orderBy("createdAt", "asc")
        .get();

      const messages =
        snapshot.docs.map(doc => {
          const data = doc.data();

          const common = {
            id: doc.id,
            role: data.role,
            createdAt: data.createdAt
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

          // Historical messages remain
          // server-decryptable until migrated.
          // Only the authenticated owner
          // can access this endpoint.

          try {
            return {
              ...common,
              legacy: true,

              content: decrypt(
                data.encryptedData,
                data.iv,
                data.authTag
              )
            };
          } catch {
            return {
              ...common,
              legacy: true,
              damaged: true,

              content:
                "[Old message could not be decrypted]"
            };
          }
        });

      res.set(
        "Cache-Control",
        "no-store"
      );

      return res.json({
        success: true,
        conversationId: ref.id,
        generationStatus: "idle",
        messages
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Could not load AI history."
      );
    }
  }
);

/* ------------------------------------------
   SAVE DEVICE-ENCRYPTED MESSAGE
------------------------------------------ */

router.post(
  "/conversations/:conversationId/messages",
  async (req, res) => {
    try {
      const ref = await ownerRef(
        req.user.uid,
        req.params.conversationId
      );

      const {
        id,
        role,
        e2ee
      } = req.body || {};

      if (
        !validId(id) ||
        id.length < 16 ||
        !["user", "assistant"].includes(role) ||
        !validEnvelope(e2ee)
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Only valid encrypted AI messages are accepted."
        });
      }

      const now = new Date();

      await ref
        .collection("messages")
        .doc(id)
        .create({
          role,
          e2ee,
          privacyVersion: 2,
          createdAt: now
        });

      await ref.update({
        updatedAt: now
      });

      return res.status(201).json({
        success: true,
        id
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Could not save encrypted AI message."
      );
    }
  }
);

/* ------------------------------------------
   MIGRATE OWNER'S LEGACY MESSAGE
------------------------------------------ */

router.post(
  "/conversations/:conversationId/messages/:messageId/migrate",
  async (req, res) => {
    try {
      const ref = await ownerRef(
        req.user.uid,
        req.params.conversationId
      );

      const messageId =
        req.params.messageId;

      if (
        !validId(messageId) ||
        !validEnvelope(req.body?.e2ee)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid encrypted migration."
        });
      }

      const messageRef = ref
        .collection("messages")
        .doc(messageId);

      await db.runTransaction(
        async transaction => {
          const snapshot =
            await transaction.get(
              messageRef
            );

          if (
            !snapshot.exists ||
            snapshot.data().privacyVersion === 2
          ) {
            throw Object.assign(
              new Error(
                "Message missing or already migrated."
              ),
              { status: 409 }
            );
          }

          transaction.update(
            messageRef,
            {
              privacyVersion: 2,
              e2ee: req.body.e2ee,

              encryptedData:
                FieldValue.delete(),

              iv:
                FieldValue.delete(),

              authTag:
                FieldValue.delete(),

              content:
                FieldValue.delete(),

              text:
                FieldValue.delete()
            }
          );
        }
      );

      return res.json({
        success: true
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Could not migrate AI message."
      );
    }
  }
);

/* ------------------------------------------
   GENERATE AI RESPONSE
------------------------------------------ */

router.post(
  "/chat",
  async (req, res) => {
    if (
      req.body?.aiProcessingConsent !== true
    ) {
      return res.status(403).json({
        success: false,
        code: "AI_CONSENT_REQUIRED",

        message:
          "Consent is required for AI processing."
      });
    }

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    const history = req.body?.history;

    if (
      !message ||
      message.length > 4000 ||
      !Array.isArray(history) ||
      history.length > 8 ||
      !history.every(
        item =>
          ["user", "assistant"].includes(
            item?.role
          ) &&
          typeof item.content === "string" &&
          item.content.length <= 2000
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid AI message or history."
      });
    }

    try {
      await ownerRef(
        req.user.uid,
        req.body.conversationId
      );

      // Detection happens in memory.
      // Do not persist the message,
      // detection reason or risk label.

      const risk = detectRisk(message);

      let safetyNoticeCreated = false;

      if (
        ["high", "crisis"].includes(
          risk.riskLevel
        )
      ) {
        const support =
          await escalateCrisis({
            userId: req.user.uid,
            riskLevel: risk.riskLevel
          });

        safetyNoticeCreated =
          support.notificationSent;
      }

      let timer;
      let result;

      try {
        result = await Promise.race([
          generateAIResponse(
            message,
            history,
            risk.riskLevel
          ),

          new Promise(
            (_, reject) => {
              timer = setTimeout(
                () =>
                  reject(
                    new Error(
                      "AI_TIMEOUT"
                    )
                  ),
                30000
              );
            }
          )
        ]);
      } catch {
        result = {
          text: getSafeReply(
            risk.riskLevel,
            message
          ),

          fallback: true
        };
      } finally {
        clearTimeout(timer);
      }

      const response = String(
        result?.text ||
        getSafeReply(
          risk.riskLevel,
          message
        )
      );

      res.set(
        "Cache-Control",
        "no-store"
      );

      return res.json({
        success: true,

        response,

        risk: {
          level: risk.riskLevel,
          detected:
            risk.riskLevel !== "low"
        },

        fallback:
          Boolean(result?.fallback),

        safetyNoticeCreated,

        // A generic notification is NOT
        // human crisis intervention.
        crisisEscalated: false,

        note:
          "InnerVoice does not provide live " +
          "monitoring or emergency response. " +
          "If in immediate danger, contact " +
          "local emergency services or " +
          "someone you trust."
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Could not process AI request."
      );
    }
  }
);

module.exports = router;