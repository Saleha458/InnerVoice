const express = require("express");
const bcrypt = require("bcryptjs");

const {
  auth,
  db,
} = require("../config/firebase");

const {
  isRequired,
  isValidAnonymousId,
  isValidPassword,
  isValidAgeForRole,
  isValidRole,
} = require("../utils/validators");

const router = express.Router();

/*
=========================================================
REGISTER
=========================================================

Anonymous registration.

Required:
- Anonymous ID
- Password
- Confirm password
- Role
- Age

Age rules:
- User   -> 15+
- Parent -> no minimum restriction
- Expert -> no minimum restriction
=========================================================
*/

router.post(
  "/register",
  async (req, res) => {
    let createdFirebaseUid = null;

    try {
      const {
        anonymousId,
        password,
        confirmPassword,
        role,
        age,
      } = req.body;

      // ===================================================
      // REQUIRED FIELDS
      // ===================================================

      const requiredFields = {
        anonymousId,
        password,
        confirmPassword,
        role,
        age,
      };

      const missingFields =
        Object.entries(
          requiredFields
        )
          .filter(
            ([_, value]) =>
              !isRequired(value)
          )
          .map(
            ([key]) => key
          );

      if (
        missingFields.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please complete all required fields.",
          missingFields,
        });
      }

      // ===================================================
      // ROLE
      // ===================================================

      if (!isValidRole(role)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid role selected.",
        });
      }

      // ===================================================
      // ANONYMOUS ID
      // ===================================================

      const cleanAnonymousId =
        String(
          anonymousId
        ).trim();

      if (
        !isValidAnonymousId(
          cleanAnonymousId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Anonymous ID must be 3-30 characters and may contain only letters, numbers, and underscores.",
        });
      }

      // ===================================================
      // PASSWORD
      // ===================================================

      if (
        !isValidPassword(
          password
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.",
        });
      }

      // ===================================================
      // CONFIRM PASSWORD
      // ===================================================

      if (
        password !==
        confirmPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Passwords do not match.",
        });
      }

      // ===================================================
      // AGE
      // ===================================================

      const numericAge =
        Number(age);

      if (
        !Number.isInteger(
          numericAge
        ) ||
        numericAge <= 0 ||
        numericAge > 120
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid age.",
        });
      }

      // ===================================================
      // AGE RULE
      // ONLY USER HAS 15+ REQUIREMENT
      // ===================================================

      if (
        !isValidAgeForRole(
          numericAge,
          role
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Users must be at least 15 years old.",
        });
      }

      // ===================================================
      // CHECK ANONYMOUS ID
      // ===================================================

      const existingUsers =
        await db
          .collection("users")
          .where(
            "anonymousId",
            "==",
            cleanAnonymousId
          )
          .limit(1)
          .get();

      if (
        !existingUsers.empty
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This Anonymous ID is already taken. Please choose another one.",
        });
      }

      // ===================================================
      // HASH PASSWORD
      // ===================================================

      const hashedPassword =
        await bcrypt.hash(
          String(password),
          12
        );

      // ===================================================
      // CREATE FIREBASE AUTH USER
      // ===================================================

      const firebaseUser =
        await auth.createUser({
          password:
            String(password),
          displayName:
            cleanAnonymousId,
        });

      createdFirebaseUid =
        firebaseUser.uid;

      // ===================================================
      // CREATE FIRESTORE USER
      // ===================================================

      const now =
        new Date();

      await db
        .collection("users")
        .doc(firebaseUser.uid)
        .set({
          uid:
            firebaseUser.uid,

          anonymousId:
            cleanAnonymousId,

          password:
            hashedPassword,

          role,

          age:
            numericAge,

          ageVerified:
            true,

          status:
            "active",

          verificationStatus:
            role === "expert"
              ? "pending"
              : null,

          createdAt:
            now,

          updatedAt:
            now,
        });

      // ===================================================
      // CUSTOM TOKEN
      // ===================================================

      const token =
        await auth.createCustomToken(
          firebaseUser.uid,
          {
            role,
            anonymousId:
              cleanAnonymousId,

            age:
              numericAge,

            ...(role === "expert"
              ? {
                  verificationStatus:
                    "pending",
                }
              : {}),
          }
        );

      // ===================================================
      // RESPONSE
      // ===================================================

      return res.status(201).json({
        success: true,

        message:
          "Anonymous account created successfully.",

        user: {
          uid:
            firebaseUser.uid,

          anonymousId:
            cleanAnonymousId,

          role,

          age:
            numericAge,

          verificationStatus:
            role === "expert"
              ? "pending"
              : null,
        },

        token,
      });
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      // ===================================================
      // CLEANUP FIREBASE USER IF FIRESTORE FAILED
      // ===================================================

      if (
        createdFirebaseUid
      ) {
        try {
          await auth.deleteUser(
            createdFirebaseUid
          );
        } catch (
          cleanupError
        ) {
          console.error(
            "Registration cleanup error:",
            cleanupError
          );
        }
      }

      if (
        error?.code ===
        "auth/email-already-exists"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This account already exists.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Registration failed. Please try again.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

/*
=========================================================
LOGIN
=========================================================
*/

router.post(
  "/login",
  async (req, res) => {
    try {
      const anonymousId =
        String(
          req.body.anonymousId ||
            ""
        ).trim();

      const password =
        String(
          req.body.password ||
            ""
        );

      if (
        !anonymousId ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Anonymous ID and password are required.",
        });
      }

      const userSnapshot =
        await db
          .collection("users")
          .where(
            "anonymousId",
            "==",
            anonymousId
          )
          .limit(1)
          .get();

      if (
        userSnapshot.empty
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid Anonymous ID or password.",
        });
      }

      const userDoc =
        userSnapshot.docs[0];

      const data =
        userDoc.data();

      if (
        data.status ===
          "suspended" ||
        data.status === "deleted"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This account is currently unavailable.",
        });
      }

      const validPassword =
        await bcrypt.compare(
          password,
          data.password ||
            ""
        );

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid Anonymous ID or password.",
        });
      }

      const claims = {
        role:
          data.role ||
          "user",

        anonymousId:
          data.anonymousId,

        age:
          data.age,
      };

      if (
        data.verificationStatus
      ) {
        claims.verificationStatus =
          data.verificationStatus;
      }

      const token =
        await auth.createCustomToken(
          data.uid ||
            userDoc.id,
          claims
        );

      return res.json({
        success: true,

        message:
          "Login successful",

        token,

        user: {
          uid:
            data.uid ||
            userDoc.id,

          anonymousId:
            data.anonymousId,

          role:
            data.role ||
            "user",

          age:
            data.age,

          verificationStatus:
            data.verificationStatus ||
            null,
        },
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Login failed.",
      });
    }
  }
);

module.exports = router;