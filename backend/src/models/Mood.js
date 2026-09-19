"use strict";

const {
  createMood: save,
  getUserMoods: list,
  deleteMood: remove,
} = require("../services/moodService");

const createMood = (
  userId,
  data
) =>
  save({
    userId,
    mood: data.mood,
    note: data.note || "",
    intensity: data.intensity,
  });

const getUserMoods = (userId) =>
  list(userId);

// Do not allow unscoped deletion.
// The owner ID is mandatory.

const deleteMood = (
  moodId,
  userId
) =>
  remove(
    moodId,
    userId
  );

module.exports = {
  createMood,
  getUserMoods,
  deleteMood,
};