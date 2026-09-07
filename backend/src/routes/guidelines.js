const express = require("express");
const router = express.Router();

const { db } = require("../config/firebase");

router.get("/", async (req, res) => {
  try {
    const snapshot = await db
      .collection("guidelines")
      .orderBy("order")
      .get();

    const guidelines = snapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    );

    res.json({
      success: true,
      guidelines,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;