const express = require("express");
const bcrypt = require("bcryptjs");

const {
  auth,
  db,
} = require("../config/firebase");

const {
  rateLimit,
} = require("express-rate-limit");

const {
  restoreAccount,
} = require("../services/accountLifecycle");

const {
  isRequired,
  isValidAnonymousId,
  isValidPassword,
  isValidAgeForRole,
  isValidRole,
} = require("../utils/validators");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many attempts. Try again later.",
  },
});

/* =========================================================
   REGISTER
========================================================= */

router.post("/register", async (req, res) => {
  let createdUid = null;

  try {
    const {
      anonymousId,
      password,
      confirmPassword,
      role,
      age,
    } = req.body;

    const required = {
      anonymousId,
      password,
      confirmPassword,
      role,
      age,
    };

    const missingFields = Object.entries(required)
      .filter(([, value]) => !isRequired(value))
      .map(([key]) => key);

    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields.",
        missingFields,
      });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected.",
      });
    }

    const id = String(anonymousId).trim();

    if (!isValidAnonymousId(id)) {
      return res.status(400).json({
        success: false,

        message:
          "Anonymous ID must be 3–30 letters, numbers or underscores.",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,

        message:
          "Password needs 8+ characters, uppercase, lowercase, number and special character.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    const numericAge = Number(age);

    if (
      !Number.isInteger(numericAge) ||
      numericAge <= 0 ||
      numericAge > 120 ||
      !isValidAgeForRole(numericAge, role)
    ) {
      return res.status(400).json({
        success: false,

        message:
          role === "user"
            ? "Users must be at least 15 years old."
            : "Enter a valid age.",
      });
    }

    const existing = await db
      .collection("users")
      .where("anonymousId", "==", id)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({
        success: false,
        message: "Anonymous ID is already taken.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      String(password),
      12
    );

    const firebaseUser = await auth.createUser({
      password: String(password),
      displayName: id,
    });

    createdUid = firebaseUser.uid;

    const verificationStatus =
      role === "expert" ? "pending" : null;

    await db
      .collection("users")
      .doc(createdUid)
      .set({
        uid: createdUid,
        anonymousId: id,
        password: hashedPassword,
        role,
        age: numericAge,
        ageVerified: true,

        status: "active",
        verificationStatus,

        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const claims = {
      role,
      anonymousId: id,
      age: numericAge,

      ...(verificationStatus
        ? {
            verificationStatus,
          }
        : {}),
    };

    const token = await auth.createCustomToken(
      createdUid,
      claims
    );

    return res.status(201).json({
      success: true,

      message:
        "Anonymous account created successfully.",

      user: {
        uid: createdUid,
        anonymousId: id,
        role,
        age: numericAge,
        verificationStatus,
      },

      token,
    });
  } catch (err) {
    console.error("Registration:", err);

    if (createdUid) {
      try {
        await db
          .collection("users")
          .doc(createdUid)
          .delete();

        await auth.deleteUser(createdUid);
      } catch (cleanupErr) {
        console.error(
          "Registration rollback:",
          cleanupErr
        );
      }
    }

    return res.status(500).json({
      success: false,

      message:
        "Registration failed. Please try again.",
    });
  }
});

/* =========================================================
   LOGIN
========================================================= */

router.post(
  "/login",
  loginLimiter,
  async (req, res) => {
    try {
      const id = String(
        req.body.anonymousId || ""
      ).trim();

      const password = String(
        req.body.password || ""
      );

      if (!id || !password) {
        return res.status(400).json({
          success: false,

          message:
            "Anonymous ID and password are required.",
        });
      }

      const snapshot = await db
        .collection("users")
        .where("anonymousId", "==", id)
        .limit(1)
        .get();

      const user = snapshot.empty
        ? null
        : snapshot.docs[0].data();

      if (
        !user?.password ||
        !(await bcrypt.compare(password, user.password))
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Invalid Anonymous ID or password.",
        });
      }

      if (user.status === "deactivated") {
        return res.status(403).json({
          success: false,

          code: "ACCOUNT_DEACTIVATED",

          message:
            "Account is deactivated. Restore it to sign in.",

          deleteAfter: user.deleteAfter,
        });
      }

      if (user.status !== "active") {
        return res.status(403).json({
          success: false,

          message:
            "This account is unavailable.",
        });
      }

      const uid =
        user.uid || snapshot.docs[0].id;

      const record = await auth.getUser(uid);

      if (record.disabled) {
        return res.status(403).json({
          success: false,

          message:
            "Account access is disabled. Contact support.",
        });
      }

      const claims = {
        role: user.role || "user",

        anonymousId: user.anonymousId,

        age: user.age,

        ...(user.verificationStatus
          ? {
              verificationStatus:
                user.verificationStatus,
            }
          : {}),
      };

      const token = await auth.createCustomToken(
        uid,
        claims
      );

      return res.json({
        success: true,
        message: "Login successful.",

        token,

        user: {
          uid,
          anonymousId: user.anonymousId,
          role: claims.role,
          age: user.age,

          verificationStatus:
            user.verificationStatus || null,
        },
      });
    } catch (err) {
      console.error("Login:", err);

      return res.status(500).json({
        success: false,
        message: "Login failed.",
      });
    }
  }
);

/* =========================================================
   RESTORE ACCOUNT
========================================================= */

router.post(
  "/restore",
  loginLimiter,
  async (req, res) => {
    try {
      await restoreAccount(
        req.body?.anonymousId,
        req.body?.password
      );

      return res.json({
        success: true,

        message:
          "Account restored. Please sign in. Cancelled bookings cannot be restored.",
      });
    } catch (err) {
      console.error(
        "Restore:",
        err.status || err.message
      );

      return res.status(err.status || 500).json({
        success: false,

        message: err.status
          ? err.message
          : "Restoration failed. Please contact support.",
      });
    }
  }
);

module.exports = router;