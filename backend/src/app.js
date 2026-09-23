"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config();

const app = express();

/* =========================================================
   ORIGIN / CORS CONFIGURATION
========================================================= */

function normalizeOrigin(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

const allowedOrigins = new Set(
  [
    "http://localhost:5173",
    "https://inner-voice-three.vercel.app",
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL
  ]
    .map(normalizeOrigin)
    .filter(Boolean)
);

function checkOrigin(origin, callback) {
  /*
   * Requests such as server-to-server calls,
   * curl and health checks can arrive without
   * a browser Origin header.
   */
  if (!origin) {
    return callback(null, true);
  }

  const normalized = normalizeOrigin(origin);

  if (allowedOrigins.has(normalized)) {
    return callback(null, true);
  }

  console.warn(
    "Blocked CORS origin:",
    normalized
  );

  return callback(
    new Error("Origin is not allowed by CORS.")
  );
}

app.use(helmet());

app.use(
  cors({
    origin: checkOrigin,
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);

/* =========================================================
   REQUEST BODY
========================================================= */

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

/* =========================================================
   FIRESTORE / DATE SERIALIZATION
========================================================= */

function serialize(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value
      .toDate()
      .toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(
      value.getTime()
    )
      ? null
      : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(
      serialize
    );
  }

  if (
    typeof value ===
    "object"
  ) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, item]) => [
          key,
          serialize(item)
        ]
      )
    );
  }

  return value;
}

app.use(
  (_req, res, next) => {
    const original =
      res.json.bind(res);

    res.json = body =>
      original(
        serialize(body)
      );

    next();
  }
);

/* =========================================================
   HEALTH ROUTES
========================================================= */

app.get(
  "/api/health",
  (_req, res) => {
    return res.json({
      success: true,
      message:
        "InnerVoice backend is healthy"
    });
  }
);

app.get(
  "/api/health/firebase",
  async (_req, res) => {
    try {
      const {
        db
      } = require(
        "./config/firebase"
      );

      await db
        .collection("system")
        .doc("health")
        .set({
          status:
            "connected",

          checkedAt:
            new Date()
        });

      return res.json({
        success: true,
        message:
          "Firebase Firestore connected successfully"
      });
    } catch (
      error
    ) {
      console.error(
        "Firebase health check:",
        error?.code ||
          error?.name
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Firebase connection failed"
        });
    }
  }
);

/* =========================================================
   AUTH
========================================================= */

app.use(
  "/api/auth",
  require(
    "./routes/auth"
  )
);

/* =========================================================
   USERS
========================================================= */

app.use(
  "/api/users",
  require(
    "./routes/users"
  )
);

/* =========================================================
   EXPERTS
========================================================= */

app.use(
  "/api/experts",
  require(
    "./routes/experts"
  )
);

app.use(
  "/api/experts/register-account",
  require(
    "./routes/expertRegistration"
  )
);

app.use(
  "/api/expert-requests",
  require(
    "./routes/expertRequests"
  )
);

/* =========================================================
   SESSIONS
========================================================= */

app.use(
  "/api/sessions",
  require(
    "./routes/sessions"
  )
);

/* =========================================================
   NOTIFICATIONS
========================================================= */

app.use(
  "/api/notifications",
  require(
    "./routes/notifications"
  )
);

/* =========================================================
   PRIVATE USER-EXPERT MESSAGES
========================================================= */

app.use(
  "/api/messages",
  require(
    "./routes/messages"
  )
);

/* =========================================================
   MOOD
========================================================= */

app.use(
  "/api/moods",
  require(
    "./routes/moods"
  )
);

/* =========================================================
   GUIDELINES
========================================================= */

app.use(
  "/api/guidelines",
  require(
    "./routes/guidelines"
  )
);

/* =========================================================
   PRIVATE VAULT
========================================================= */

app.use(
  "/api/private-vault",
  require(
    "./routes/privateVault"
  )
);

/* =========================================================
   JOURNAL
========================================================= */

app.use(
  "/api/journal",
  require(
    "./routes/journal"
  )
);

/* =========================================================
   REPORTS
========================================================= */

app.use(
  "/api/reports/admin",
  require(
    "./routes/reportWorkflow"
  )
);

app.use(
  "/api/reports",
  require(
    "./routes/reports"
  )
);

/* =========================================================
   ADMIN — EXPERT VERIFICATION
========================================================= */

app.use(
  "/api/admin/experts",
  require(
    "./routes/expertDocuments"
  )
);

app.use(
  "/api/admin/experts",
  require(
    "./routes/expertDecision"
  )
);

/* =========================================================
   ADMIN — USERS
========================================================= */

app.use(
  "/api/admin/users",
  require(
    "./routes/adminUsers"
  )
);

app.use(
  "/api/admin",
  require(
    "./routes/admin"
  )
);

/* =========================================================
   AI
========================================================= */

app.use(
  "/api/ai",
  require(
    "./routes/ai"
  )
);

/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {
    return res
      .status(404)
      .json({
        success: false,

        message:
          `Route not found: ${req.method} ${req.originalUrl}`
      });
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    _req,
    res,
    _next
  ) => {
    console.error(
      "SERVER ERROR:",
      error?.name ||
        "error",
      error?.message ||
        ""
    );

    /*
     * CORS errors should not leak
     * internal configuration details.
     */
    if (
      error?.message ===
      "Origin is not allowed by CORS."
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Request origin is not allowed."
        });
    }

    return res
      .status(
        error.status ||
          500
      )
      .json({
        success: false,

        message:
          error.status &&
          error.status < 500
            ? error.message
            : "Internal server error"
      });
  }
);

module.exports = app;