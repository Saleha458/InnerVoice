const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

/* =========================
   MIDDLEWARE
========================= */

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   HEALTH
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "InnerVoice backend is healthy",
  });
});

app.get("/api/health/firebase", async (req, res) => {
  try {
    const { db } = require("./config/firebase");

    await db.collection("system").doc("health").set({
      status: "connected",
      checkedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Firebase Firestore connected successfully",
    });
  } catch (error) {
    console.error("Firebase health error:", error);

    res.status(500).json({
      success: false,
      message: "Firebase connection failed",
    });
  }
});

/* =========================
   ROUTES
========================= */

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/experts", require("./routes/experts"));
app.use("/api/expert-requests", require("./routes/expertRequests"));
app.use("/api/sessions", require("./routes/sessions"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/moods", require("./routes/moods"));
app.use("/api/guidelines", require("./routes/guidelines"));
app.use("/api/journal", require("./routes/journal"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/ai", require("./routes/ai"));

/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;