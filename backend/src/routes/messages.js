const express = require("express");

const router =
  express.Router();

const authenticate =
  require("../middleware/auth");

const {
  db,
} = require("../config/firebase");

const {
  encrypt,
  decrypt,
} =
  require("../services/encryptionService");

const canAccessSession =
  async (
    sessionId,
    uid
  ) => {
    const sessionDoc =
      await db
        .collection(
          "sessions"
        )
        .doc(sessionId)
        .get();

    if (
      !sessionDoc.exists
    ) {
      return false;
    }

    const session =
      sessionDoc.data();

    if (
      session.userId ===
      uid
    ) {
      return true;
    }

    const expert =
      await db
        .collection(
          "experts"
        )
        .where(
          "uid",
          "==",
          uid
        )
        .limit(1)
        .get();

    return (
      !expert.empty &&
      expert.docs[0].id ===
        session.expertId
    );
  };

/* =========================================================
   SEND TEXT MESSAGE
========================================================= */

router.post(
  "/",
  authenticate,
  async (req, res) => {
    try {
      const {
        sessionId,
        receiverId,
        message,
      } = req.body;

      const clean =
        String(
          message || ""
        )
          .trim()
          .slice(0, 4000);

      if (
        !sessionId ||
        !clean
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Session and message are required.",
        });
      }

      if (
        !(await canAccessSession(
          sessionId,
          req.user.uid
        ))
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied.",
        });
      }

      const encrypted =
        encrypt(clean);

      const ref =
        await db
          .collection(
            "messages"
          )
          .add({
            sessionId,

            senderId:
              req.user.uid,

            receiverId:
              receiverId ||
              null,

            type:
              "text",

            encryptedData:
              encrypted.encryptedData,

            iv:
              encrypted.iv,

            authTag:
              encrypted.authTag,

            createdAt:
              new Date(),
          });

      return res.status(201).json({
        success: true,
        messageId:
          ref.id,
      });
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to send message.",
      });
    }
  }
);

/* =========================================================
   LOAD SESSION CHAT
========================================================= */

router.get(
  "/:sessionId",
  authenticate,
  async (req, res) => {
    try {
      const {
        sessionId,
      } = req.params;

      if (
        !(await canAccessSession(
          sessionId,
          req.user.uid
        ))
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied.",
        });
      }

      const snapshot =
        await db
          .collection(
            "messages"
          )
          .where(
            "sessionId",
            "==",
            sessionId
          )
          .get();

      const messages =
        [];

      snapshot.forEach(
        (doc) => {
          const data =
            doc.data();

          try {
            /*
             * VOICE
             */
            if (
              data.type ===
                "voice" &&
              data.encryptedData
            ) {
              messages.push({
                id:
                  doc.id,

                sessionId,

                senderId:
                  data.senderId,

                type:
                  "voice",

                audio:
                  decrypt(
                    data.encryptedData,
                    data.iv,
                    data.authTag
                  ),

                mimeType:
                  data.mimeType ||
                  "audio/webm",

                createdAt:
                  data.createdAt,
              });

              return;
            }

            /*
             * TEXT
             */
            if (
              data.encryptedData
            ) {
              messages.push({
                id:
                  doc.id,

                sessionId,

                senderId:
                  data.senderId,

                receiverId:
                  data.receiverId ||
                  null,

                type:
                  "text",

                message:
                  decrypt(
                    data.encryptedData,
                    data.iv,
                    data.authTag
                  ),

                createdAt:
                  data.createdAt,
              });
            }
          } catch (error) {
            console.warn(
              "Could not decrypt message:",
              doc.id
            );
          }
        }
      );

      messages.sort(
        (a, b) => {
          const aDate =
            a.createdAt?.toDate?.() ||
            new Date(
              a.createdAt ||
                0
            );

          const bDate =
            b.createdAt?.toDate?.() ||
            new Date(
              b.createdAt ||
                0
            );

          return (
            aDate -
            bDate
          );
        }
      );

      return res.json({
        success: true,
        messages,
      });
    } catch (error) {
      console.error(
        "Get messages error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to retrieve messages.",
      });
    }
  }
);

module.exports = router;