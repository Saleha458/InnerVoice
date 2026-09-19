"use strict";

const express = require("express");
const authenticate = require("../middleware/auth");

const {
  createMood,
  getUserMoods,
  updateMood,
  migrateMood,
  deleteMood
} = require("../services/moodService");

const router = express.Router();

router.use(authenticate);

router.use((req, res, next) => {
  if (req.user.role !== "user") {
    return res.status(403).json({
      success: false,
      message: "Only the account owner can access mood history."
    });
  }

  next();
});

function handleError(res, error, fallback) {
  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : fallback
  });
}

router.get("/", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    return res.json({
      success: true,
      moods: await getUserMoods(req.user.uid)
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Could not load private mood history."
    );
  }
});

router.post("/", async (req, res) => {
  try {
    const mood = await createMood({
      userId: req.user.uid,
      id: req.body?.id,
      e2ee: req.body?.e2ee
    });

    return res.status(201).json({
      success: true,
      mood
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Could not save encrypted mood."
    );
  }
});

router.post("/:moodId/migrate", async (req, res) => {
  try {
    await migrateMood(
      req.params.moodId,
      req.user.uid,
      req.body?.e2ee
    );

    return res.json({
      success: true
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Could not migrate mood."
    );
  }
});

router.patch("/:moodId", async (req, res) => {
  try {
    const mood = await updateMood(
      req.params.moodId,
      req.user.uid,
      req.body?.e2ee
    );

    return res.json({
      success: true,
      mood
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Could not update encrypted mood."
    );
  }
});

router.delete("/:moodId", async (req, res) => {
  try {
    await deleteMood(
      req.params.moodId,
      req.user.uid
    );

    return res.json({
      success: true,
      message: "Mood entry deleted."
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Could not delete mood."
    );
  }
});

module.exports = router;