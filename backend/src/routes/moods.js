const express = require("express");

const router =
  express.Router();

const authenticate =
  require("../middleware/auth");

const {
  createMood,
  getUserMoods,
  deleteMood,
} = require("../services/moodService");


// CREATE

router.post(
  "/",
  authenticate,
  async (req, res) => {
    try {
      const {
        mood,
        note = "",
        intensity,
      } = req.body;

      const numericIntensity =
        Number(intensity);

      if (
        !mood ||
        !Number.isInteger(
          numericIntensity
        ) ||
        numericIntensity < 1 ||
        numericIntensity > 10
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Mood and intensity from 1 to 10 are required.",
        });
      }

      const result =
        await createMood({
          userId:
            req.user.uid,

          mood,

          note,

          intensity:
            numericIntensity,
        });

      res.status(201).json({
        success: true,
        mood: result,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Could not save mood.",
      });
    }
  }
);


// GET CURRENT USER MOODS

router.get(
  "/",
  authenticate,
  async (req, res) => {
    try {
      const moods =
        await getUserMoods(
          req.user.uid
        );

      res.json({
        success: true,
        moods,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch mood history.",
      });
    }
  }
);


// DELETE

router.delete(
  "/:moodId",
  authenticate,
  async (req, res) => {
    try {
      await deleteMood(
        req.params.moodId,
        req.user.uid
      );

      res.json({
        success: true,
        message:
          "Mood entry deleted.",
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message:
          error.message ||
          "Mood entry not found.",
      });
    }
  }
);

module.exports = router;