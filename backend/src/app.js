"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config();

const app = express();

app.use(helmet());

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:5173",
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

function serialize(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        serialize(item)
      ])
    );
  }

  return value;
}

app.use((_req, res, next) => {
  const original = res.json.bind(res);

  res.json = body => original(serialize(body));

  next();
});

app.get("/api/health", (_req, res) => {
  return res.json({
    success: true,
    message: "InnerVoice backend is healthy"
  });
});

app.get("/api/health/firebase", async (_req, res) => {
  try {
    const { db } = require("./config/firebase");

    await db
      .collection("system")
      .doc("health")
      .set({
        status: "connected",
        checkedAt: new Date()
      });

    return res.json({
      success: true,
      message: "Firebase Firestore connected successfully"
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Firebase connection failed"
    });
  }
});

app.use("/api/auth", require("./routes/auth"));

app.use("/api/users", require("./routes/users"));

app.use("/api/experts", require("./routes/experts"));

app.use(
  "/api/experts/register-account",
  require("./routes/expertRegistration")
);

app.use(
  "/api/expert-requests",
  require("./routes/expertRequests")
);

app.use("/api/sessions", require("./routes/sessions"));

app.use(
  "/api/notifications",
  require("./routes/notifications")
);

app.use("/api/messages", require("./routes/messages"));

app.use("/api/moods", require("./routes/moods"));

app.use(
  "/api/guidelines",
  require("./routes/guidelines")
);

app.use(
  "/api/private-vault",
  require("./routes/privateVault")
);

app.use("/api/journal", require("./routes/journal"));

/*
 * Exact report-status route comes BEFORE
 * the existing general reports router.
 */
app.use(
  "/api/reports/admin",
  require("./routes/reportWorkflow")
);

app.use("/api/reports", require("./routes/reports"));

/*
 * Protected expert-document routes run FIRST.
 * The approval guard verifies authenticated
 * Cloudinary delivery and then calls next().
 */
app.use(
  "/api/admin/experts",
  require("./routes/expertDocuments")
);

/*
 * This router handles the actual decision.
 * It must be mounted AFTER expertDocuments.
 */
app.use(
  "/api/admin/experts",
  require("./routes/expertDecision")
);

/*
 * Exact Admin Users route comes BEFORE
 * the existing general Admin router.
 */
app.use(
  "/api/admin/users",
  require("./routes/adminUsers")
);

app.use("/api/admin", require("./routes/admin"));

app.use("/api/ai", require("./routes/ai"));

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message:
      `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((error, _req, res, _next) => {
  console.error(
    "SERVER ERROR:",
    error?.name || "error"
  );

  return res.status(error.status || 500).json({
    success: false,
    message:
      error.status && error.status < 500
        ? error.message
        : "Internal server error"
  });
});

module.exports = app;