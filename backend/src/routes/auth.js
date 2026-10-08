"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");

const {
  auth,
  db,
} = require("../config/firebase");

const {
  rateLimit,
} = require("express-rate-limit");

const authenticate = require("../middleware/auth");

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

/* =========================================================
   PASSWORD RECOVERY QUESTIONS

   Recovery is configured AFTER registration from Profile.
========================================================= */

const RECOVERY_QUESTIONS = Object.freeze({
  favorite_writer:
    "Who is a writer you will always remember?",

  meaningful_book:
    "What is the title of a book that matters to you?",

  childhood_character:
    "What childhood fictional character do you remember most?",

  quiet_place:
    "What place would you choose for a quiet day?",

  memorable_teacher:
    "What was the first name of a teacher you remember well?",

  private_memory_word:
    "What private word reminds you of a happy memory?",
});

/* =========================================================
   RATE LIMITERS
========================================================= */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many attempts. Try again later.",
  },
});

const recoveryQuestionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many recovery attempts. Try again later.",
  },
});

const recoveryResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many password reset attempts. Try again later.",
  },
});

/* =========================================================
   RECOVERY HELPERS
========================================================= */

function normalizeRecoveryAnswer(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

function validRecoveryQuestion(questionId) {
  return Object.hasOwn(
    RECOVERY_QUESTIONS,
    String(questionId || "")
  );
}

function validRecoveryAnswer(answer) {
  const value =
    normalizeRecoveryAnswer(answer);

  return (
    value.length >= 4 &&
    value.length <= 100
  );
}

async function getAccountByAnonymousId(
  anonymousId
) {
  const snapshot = await db
    .collection("users")
    .where(
      "anonymousId",
      "==",
      anonymousId
    )
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return {
    ref: snapshot.docs[0].ref,

    id:
      snapshot.docs[0].id,

    data:
      snapshot.docs[0].data(),
  };
}

/* =========================================================
   REGISTER

   Recovery question is intentionally NOT required here.

   New accounts start with:
   recoveryConfigured: false

   The user can configure recovery later from Profile.
========================================================= */

router.post(
  "/register",
  async (req, res) => {
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

      const missingFields =
        Object.entries(required)
          .filter(
            ([, value]) =>
              !isRequired(value)
          )
          .map(
            ([key]) => key
          );

      if (
        missingFields.length
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Please complete all required fields.",

            missingFields,
          });
      }

      if (
        !isValidRole(role)
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid role selected.",
          });
      }

      const id =
        String(
          anonymousId
        ).trim();

      if (
        !isValidAnonymousId(id)
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Anonymous ID must be 3–30 letters, numbers or underscores.",
          });
      }

      if (
        !isValidPassword(
          password
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Password needs 8+ characters, uppercase, lowercase, number and special character.",
          });
      }

      if (
        password !==
        confirmPassword
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Passwords do not match.",
          });
      }

      const numericAge =
        Number(age);

      if (
        !Number.isInteger(
          numericAge
        ) ||
        numericAge <= 0 ||
        numericAge > 120 ||
        !isValidAgeForRole(
          numericAge,
          role
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              role === "user"
                ? "Users must be at least 15 years old."
                : "Enter a valid age.",
          });
      }

      const existing =
        await db
          .collection("users")
          .where(
            "anonymousId",
            "==",
            id
          )
          .limit(1)
          .get();

      if (
        !existing.empty
      ) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              "Anonymous ID is already taken.",
          });
      }

      const hashedPassword =
        await bcrypt.hash(
          String(password),
          12
        );

      const firebaseUser =
        await auth.createUser({
          password:
            String(password),

          displayName:
            id,
        });

      createdUid =
        firebaseUser.uid;

      const verificationStatus =
        role === "expert"
          ? "pending"
          : null;

      const now =
        new Date();

      await db
        .collection("users")
        .doc(createdUid)
        .set({
          uid:
            createdUid,

          anonymousId:
            id,

          password:
            hashedPassword,

          role,

          age:
            numericAge,

          ageVerified:
            true,

          status:
            "active",

          verificationStatus,

          /*
           * Recovery is optional onboarding after login.
           */
          recoveryConfigured:
            false,

          createdAt:
            now,

          updatedAt:
            now,
        });

      const claims = {
        role,

        anonymousId:
          id,

        age:
          numericAge,

        ...(verificationStatus
          ? {
              verificationStatus,
            }
          : {}),
      };

      const token =
        await auth
          .createCustomToken(
            createdUid,
            claims
          );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Anonymous account created successfully.",

          user: {
            uid:
              createdUid,

            anonymousId:
              id,

            role,

            age:
              numericAge,

            verificationStatus,

            recoveryConfigured:
              false,
          },

          token,
        });
    } catch (err) {
      console.error(
        "Registration:",
        err
      );

      if (createdUid) {
        try {
          await db
            .collection("users")
            .doc(createdUid)
            .delete();

          await auth
            .deleteUser(
              createdUid
            );
        } catch (
          cleanupErr
        ) {
          console.error(
            "Registration rollback:",
            cleanupErr
          );
        }
      }

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Registration failed. Please try again.",
        });
    }
  }
);

/* =========================================================
   LOGIN
========================================================= */

router.post(
  "/login",
  loginLimiter,
  async (req, res) => {
    try {
      const id =
        String(
          req.body
            .anonymousId ||
            ""
        ).trim();

      const password =
        String(
          req.body
            .password ||
            ""
        );

      if (
        !id ||
        !password
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Anonymous ID and password are required.",
          });
      }

      const account =
        await getAccountByAnonymousId(
          id
        );

      const user =
        account?.data ||
        null;

      if (
        !user?.password ||
        !(await bcrypt.compare(
          password,
          user.password
        ))
      ) {
        return res
          .status(401)
          .json({
            success: false,

            message:
              "Invalid Anonymous ID or password.",
          });
      }

      if (
        user.status ===
        "deactivated"
      ) {
        return res
          .status(403)
          .json({
            success: false,

            code:
              "ACCOUNT_DEACTIVATED",

            message:
              "Account is deactivated. Restore it to sign in.",

            deleteAfter:
              user.deleteAfter,
          });
      }

      if (
        user.status !==
        "active"
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "This account is unavailable.",
          });
      }

      const uid =
        user.uid ||
        account.id;

      const record =
        await auth
          .getUser(uid);

      if (
        record.disabled
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Account access is disabled. Contact support.",
          });
      }

      const claims = {
        role:
          user.role ||
          "user",

        anonymousId:
          user.anonymousId,

        age:
          user.age,

        ...(user
          .verificationStatus
          ? {
              verificationStatus:
                user.verificationStatus,
            }
          : {}),
      };

      const token =
        await auth
          .createCustomToken(
            uid,
            claims
          );

      return res.json({
        success: true,

        message:
          "Login successful.",

        token,

        user: {
          uid,

          anonymousId:
            user.anonymousId,

          role:
            claims.role,

          age:
            user.age,

          verificationStatus:
            user
              .verificationStatus ||
            null,

          recoveryConfigured:
            Boolean(
              user
                .recoveryConfigured
            ),

          recoveryQuestionId:
            user
              .recoveryQuestionId ||
            null,
        },
      });
    } catch (err) {
      console.error(
        "Login:",
        err
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Login failed.",
        });
    }
  }
);

/* =========================================================
   RECOVERY QUESTION LOOKUP
========================================================= */

router.post(
  "/recovery/question",
  recoveryQuestionLimiter,
  async (req, res) => {
    try {
      const anonymousId =
        String(
          req.body
            ?.anonymousId ||
            ""
        ).trim();

      if (
        !isValidAnonymousId(
          anonymousId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Enter a valid Anonymous ID.",
          });
      }

      const account =
        await getAccountByAnonymousId(
          anonymousId
        );

      const user =
        account?.data;

      if (
        !user ||
        user.role ===
          "admin" ||
        !user
          .recoveryConfigured ||
        !user
          .recoveryQuestionId ||
        !user
          .recoveryAnswerHash ||
        !RECOVERY_QUESTIONS[
          user
            .recoveryQuestionId
        ]
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Password recovery is not configured for this account.",
          });
      }

      if (
        ![
          "active",
          "deactivated",
        ].includes(
          user.status ||
            "active"
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Password recovery is unavailable for this account.",
          });
      }

      return res.json({
        success: true,

        recoveryQuestionId:
          user
            .recoveryQuestionId,

        recoveryQuestion:
          RECOVERY_QUESTIONS[
            user
              .recoveryQuestionId
          ],
      });
    } catch (err) {
      console.error(
        "Recovery question lookup:",
        err
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Could not start password recovery.",
        });
    }
  }
);

/* =========================================================
   PASSWORD RESET
========================================================= */

router.post(
  "/recovery/reset",
  recoveryResetLimiter,
  async (req, res) => {
    try {
      const anonymousId =
        String(
          req.body
            ?.anonymousId ||
            ""
        ).trim();

      const recoveryAnswer =
        normalizeRecoveryAnswer(
          req.body
            ?.recoveryAnswer
        );

      const newPassword =
        String(
          req.body
            ?.newPassword ||
            ""
        );

      const confirmPassword =
        String(
          req.body
            ?.confirmPassword ||
            ""
        );

      if (
        !isValidAnonymousId(
          anonymousId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Enter a valid Anonymous ID.",
          });
      }

      if (
        !validRecoveryAnswer(
          recoveryAnswer
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Enter your recovery answer.",
          });
      }

      if (
        !isValidPassword(
          newPassword
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Password needs 8+ characters, uppercase, lowercase, number and special character.",
          });
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Passwords do not match.",
          });
      }

      const account =
        await getAccountByAnonymousId(
          anonymousId
        );

      const user =
        account?.data;

      if (
        !account ||
        !user ||
        user.role ===
          "admin" ||
        !user
          .recoveryConfigured ||
        !user
          .recoveryAnswerHash
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Password recovery is not configured for this account.",
          });
      }

      if (
        ![
          "active",
          "deactivated",
        ].includes(
          user.status ||
            "active"
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Password recovery is unavailable for this account.",
          });
      }

      const answerMatches =
        await bcrypt.compare(
          recoveryAnswer,
          user
            .recoveryAnswerHash
        );

      if (
        !answerMatches
      ) {
        return res
          .status(401)
          .json({
            success: false,

            message:
              "Recovery answer did not match.",
          });
      }

      const uid =
        user.uid ||
        account.id;

      const passwordHash =
        await bcrypt.hash(
          newPassword,
          12
        );

      await auth.updateUser(
        uid,
        {
          password:
            newPassword,
        }
      );

      await account.ref
        .update({
          password:
            passwordHash,

          passwordChangedAt:
            new Date(),

          updatedAt:
            new Date(),
        });

      await auth
        .revokeRefreshTokens(
          uid
        );

      return res.json({
        success: true,

        message:
          "Password reset successful. You can now sign in with your new password.",
      });
    } catch (err) {
      console.error(
        "Password recovery reset:",
        err?.code ||
          err?.message
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Password reset failed. Please try again.",
        });
    }
  }
);

/* =========================================================
   SET / UPDATE RECOVERY QUESTION
========================================================= */

router.post(
  "/recovery/setup",
  authenticate,
  async (req, res) => {
    try {
      const currentPassword =
        String(
          req.body
            ?.currentPassword ||
            ""
        );

      const recoveryQuestionId =
        String(
          req.body
            ?.recoveryQuestionId ||
            ""
        );

      const recoveryAnswer =
        normalizeRecoveryAnswer(
          req.body
            ?.recoveryAnswer
        );

      if (
        !currentPassword
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Enter your current password.",
          });
      }

      if (
        !validRecoveryQuestion(
          recoveryQuestionId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Choose a valid recovery question.",
          });
      }

      if (
        !validRecoveryAnswer(
          recoveryAnswer
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Recovery answer must be between 4 and 100 characters.",
          });
      }

      const ref =
        db
          .collection("users")
          .doc(
            req.user.uid
          );

      const snapshot =
        await ref.get();

      if (
        !snapshot.exists
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Account not found.",
          });
      }

      const user =
        snapshot.data();

      if (
        user.role ===
        "admin"
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Admin password recovery cannot be configured here.",
          });
      }

      if (
        !user.password ||
        !(await bcrypt.compare(
          currentPassword,
          user.password
        ))
      ) {
        return res
          .status(401)
          .json({
            success: false,

            message:
              "Current password is incorrect.",
          });
      }

      const recoveryAnswerHash =
        await bcrypt.hash(
          recoveryAnswer,
          12
        );

      await ref.update({
        recoveryConfigured:
          true,

        recoveryQuestionId,

        recoveryAnswerHash,

        recoveryConfiguredAt:
          new Date(),

        updatedAt:
          new Date(),
      });

      return res.json({
        success: true,

        message:
          "Password recovery question saved successfully.",

        recoveryConfigured:
          true,

        recoveryQuestionId,
      });
    } catch (err) {
      console.error(
        "Recovery setup:",
        err
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Could not save your recovery question.",
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
        req.body
          ?.anonymousId,

        req.body
          ?.password
      );

      return res.json({
        success: true,

        message:
          "Account restored. Please sign in. Cancelled bookings cannot be restored.",
      });
    } catch (err) {
      console.error(
        "Restore:",
        err.status ||
          err.message
      );

      return res
        .status(
          err.status ||
            500
        )
        .json({
          success: false,

          message:
            err.status
              ? err.message
              : "Restoration failed. Please contact support.",
        });
    }
  }
);

module.exports = router;