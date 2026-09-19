"use strict";

const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth");

const {
  createEntry,
  listEntries,
  migrateEntry,
  deleteEntry
} = require("../services/journalService");

router.use(authenticate);

const failure = (res, error, message) =>
  res.status(error.status || 500).json({
    success: false,
    message: error.status
      ? error.message
      : message
  });

router.get("/", async (req, res) => {
  try {
    return res.json({
      success: true,
      entries: await listEntries(req.user.uid)
    });
  } catch (error) {
    return failure(
      res,
      error,
      "Could not load journal."
    );
  }
});

router.post("/", async (req, res) => {
  try {
    return res.status(201).json({
      success: true,
      entry: await createEntry(
        req.user.uid,
        req.body
      )
    });
  } catch (error) {
    return failure(
      res,
      error,
      "Could not save encrypted journal entry."
    );
  }
});

router.post("/:id/migrate", async (req, res) => {
  try {
    await migrateEntry(
      req.user.uid,
      req.params.id,
      req.body?.e2ee
    );

    return res.json({
      success: true
    });
  } catch (error) {
    return failure(
      res,
      error,
      "Could not migrate journal entry."
    );
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await deleteEntry(
      req.user.uid,
      req.params.id
    );

    return res.json({
      success: true
    });
  } catch (error) {
    return failure(
      res,
      error,
      "Could not delete journal entry."
    );
  }
});

module.exports = router;