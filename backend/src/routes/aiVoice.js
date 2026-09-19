"use strict";

const express = require("express");
const multer = require("multer");
const { GoogleGenAI } = require("@google/genai");
const authenticate = require("../middleware/auth");

const router = express.Router();
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

const allowed = new Set([
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg"
]);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_AUDIO_BYTES,
    files: 1
  },

  fileFilter: (_req, file, cb) => {
    const mime = String(
      file.mimetype || ""
    )
      .split(";")[0]
      .toLowerCase();

    if (!allowed.has(mime)) {
      return cb(
        new Error("Unsupported audio format.")
      );
    }

    cb(null, true);
  }
});

router.post(
  "/transcribe",
  authenticate,

  (req, res, next) => {
    upload.single("audio")(
      req,
      res,
      (error) => {
        if (!error) return next();

        return res.status(400).json({
          success: false,

          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "Recording is too large. Try a shorter recording."
              : error.message ||
                "Could not upload audio."
        });
      }
    );
  },

  async (req, res) => {
    res.set("Cache-Control", "no-store");

    if (
      req.body?.aiProcessingConsent !== "true"
    ) {
      return res.status(403).json({
        success: false,
        code: "AI_CONSENT_REQUIRED",

        message:
          "Please consent before sending audio to Gemini."
      });
    }

    if (!req.file?.buffer?.length) {
      return res.status(400).json({
        success: false,

        message:
          "Please record a voice message first."
      });
    }

    if (
      !process.env.GEMINI_API_KEY?.trim()
    ) {
      return res.status(503).json({
        success: false,
        code: "VOICE_NOT_CONFIGURED",

        message:
          "Voice input is not configured. Please type your message."
      });
    }

    const rawMime = String(
      req.file.mimetype
    )
      .split(";")[0]
      .toLowerCase();

    const mimeType =
      ["audio/wave", "audio/x-wav"].includes(
        rawMime
      )
        ? "audio/wav"
        : rawMime === "audio/x-m4a"
          ? "audio/m4a"
          : rawMime;

    const model =
      process.env.GEMINI_TRANSCRIPTION_MODEL ||
      process.env.GEMINI_MODEL ||
      "gemini-3.5-flash-lite";

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
      });

      const config = {
        maxOutputTokens: 2048,
        temperature: 0
      };

      if (
        /^gemini-3\.(?:1|5)-flash(?:-lite)?$/.test(
          model
        )
      ) {
        config.thinkingConfig = {
          thinkingLevel: "minimal"
        };
      }

      const response =
        await ai.models.generateContent({
          model,

          contents: [
            {
              role: "user",

              parts: [
                {
                  text:
                    "Transcribe ONLY the spoken words, preserving Urdu, Roman Urdu, or English. Do not translate, reply to the speaker, or add commentary. If there is no clear speech, return an empty answer."
                },

                {
                  inlineData: {
                    mimeType,

                    data:
                      req.file.buffer.toString(
                        "base64"
                      )
                  }
                }
              ]
            }
          ],

          config
        });

      const transcript = String(
        response?.text || ""
      )
        .trim()
        .slice(0, 4000);

      if (
        !transcript ||
        /^(?:no (?:intelligible )?speech|\[silence\]|silence\.?|inaudible\.?)$/i
          .test(transcript)
      ) {
        return res.status(422).json({
          success: false,
          code: "NO_SPEECH",

          message:
            "No clear speech detected. Record 3–10 seconds and try again."
        });
      }

      return res.json({
        success: true,
        transcript
      });
    } catch (error) {
      const status = Number(
        error?.status ||
        error?.code ||
        0
      );

      console.error("Gemini voice failed:", {
        model,

        status:
          status || "unknown",

        type:
          error?.name || "Error"
      });

      return res.status(503).json({
        success: false,
        code: "VOICE_PROVIDER_UNAVAILABLE",

        message:
          status === 429
            ? "Voice input has reached its current free-tier limit. Please type your message."
            : "Voice transcription is unavailable. Please type your message."
      });
    }
  }
);

module.exports = router;