const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth");

const {
  generateAIResponse,
} = require("../services/aiService");

const {
  detectRisk,
} = require("../services/riskDetectionService");

const {
  escalateCrisis,
} = require("../services/crisisService");

const {
  encrypt,
  decrypt,
} = require("../services/encryptionService");

const {
  createNotification,
} = require("../models/Notification");

const { db } = require("../config/firebase");

const FALLBACK_RESPONSES = [
  "I'm here with you. You don't have to figure everything out at once.",
  "I'm listening. Take your time and tell me what feels most important right now.",
  "That sounds like a lot to carry. I'm here to listen.",
];

const getFallback = () => {
  return FALLBACK_RESPONSES[
    Math.floor(
      Math.random() *
        FALLBACK_RESPONSES.length
    )
  ];
};

router.post(
  "/chat",
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.uid;

      const message = String(
        req.body.message || ""
      ).trim();

      const conversationId =
        req.body.conversationId || null;

      const notifyWhenReady =
        req.body.notifyWhenReady !== false;

      if (!message) {
        return res.status(400).json({
          success: false,
          message:
            "Message is required.",
        });
      }

      let conversationRef;

      if (conversationId) {
        conversationRef = db
          .collection("aiConversations")
          .doc(conversationId);

        const existing =
          await conversationRef.get();

        if (
          existing.exists &&
          existing.data().userId !== userId
        ) {
          return res.status(403).json({
            success: false,
            message:
              "This conversation does not belong to you.",
          });
        }
      } else {
        conversationRef = db
          .collection("aiConversations")
          .doc();
      }

      const conversationSnapshot =
        await conversationRef
          .collection("messages")
          .orderBy("createdAt", "asc")
          .limitToLast(8)
          .get();

      const history = [];

      conversationSnapshot.forEach(
        (doc) => {
          const data = doc.data();

          try {
            const content = decrypt(
              data.encryptedData,
              data.iv,
              data.authTag
            );

            history.push({
              role: data.role,
              content,
            });
          } catch (error) {
            console.warn(
              "Could not decrypt old AI message:",
              error.message
            );
          }
        }
      );

      const risk = detectRisk(message);

      if (
        risk.riskLevel === "crisis" ||
        risk.riskLevel === "high"
      ) {
        try {
          await escalateCrisis({
            userId,
            message,
            riskLevel:
              risk.riskLevel,
            reason: risk.reason,
          });
        } catch (error) {
          console.error(
            "Crisis escalation failed:",
            error.message
          );
        }
      }

      let response = getFallback();
      let fallback = false;

      try {
        const aiPromise =
          generateAIResponse(
            message,
            history,
            risk.riskLevel
          );

        response = await Promise.race([
          aiPromise,

          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "AI_TIMEOUT"
                  )
                ),
              7000
            )
          ),
        ]);
      } catch (error) {
        fallback = true;

        console.error(
          "AI response fallback:",
          error.message
        );

        /*
         * If Gemini fails, the system still gives
         * a supportive response instead of leaving
         * the user with a broken chat.
         */
        if (
          risk.riskLevel ===
          "crisis"
        ) {
          response =
            "I'm really glad you told me. Please stay with someone you trust and contact immediate professional or emergency support if you may act on these thoughts.";
        } else if (
          risk.riskLevel === "high"
        ) {
          response =
            "That sounds serious, and you deserve support with it. Please consider staying near someone you trust and connecting with a qualified InnerVoice expert.";
        } else {
          response = getFallback();
        }
      }

      const encryptedUser =
        encrypt(message);

      const encryptedAssistant =
        encrypt(response);

      const now = new Date();

      await Promise.all([
        conversationRef
          .collection("messages")
          .add({
            role: "user",
            encryptedData:
              encryptedUser.encryptedData,
            iv: encryptedUser.iv,
            authTag:
              encryptedUser.authTag,
            createdAt: now,
          }),

        conversationRef
          .collection("messages")
          .add({
            role: "assistant",
            encryptedData:
              encryptedAssistant.encryptedData,
            iv: encryptedAssistant.iv,
            authTag:
              encryptedAssistant.authTag,
            createdAt: now,
          }),

        conversationRef.set(
          {
            userId,
            updatedAt: now,

            ...(conversationId
              ? {}
              : {
                  createdAt: now,
                }),
          },
          {
            merge: true,
          }
        ),
      ]);

      /*
       * This notification allows the user to leave
       * InnerVoice and later see that an AI response
       * is ready.
       */
      if (notifyWhenReady) {
        try {
          await createNotification({
            userId,
            title:
              "Your AI response is ready",
            message:
              "Your InnerVoice AI response is ready. Return to AI Chat whenever you're ready to continue.",
            type: "ai_response_ready",
            data: {
              conversationId:
                conversationRef.id,
            },
          });
        } catch (error) {
          console.error(
            "AI notification error:",
            error.message
          );
        }
      }

      return res.json({
        success: true,

        conversationId:
          conversationRef.id,

        response,

        risk: {
          level:
            risk.riskLevel,
          detected:
            risk.riskLevel !== "low",
        },

        crisisEscalated:
          risk.riskLevel === "crisis" ||
          risk.riskLevel === "high",

        fallback,
      });
    } catch (error) {
      console.error(
        "AI chat error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to process AI message.",
      });
    }
  }
);

module.exports = router;