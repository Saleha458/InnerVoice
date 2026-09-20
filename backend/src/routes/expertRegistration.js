
"use strict";

const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");

const { auth, db } = require("../config/firebase");
const cloudinary = require("../config/cloudinary");

const {
  isValidAnonymousId,
  isValidPassword,
  isValidAgeForRole,
  isValidEmail
} = require("../utils/validators");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (_req, file, done) => {
    if (file.mimetype?.startsWith("image/")) {
      done(null, true);
    } else {
      done(
        new Error("Only image files are allowed.")
      );
    }
  }
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "innervoice/expert-verifications",
        resource_type: "image",
        type: "authenticated"
      },
      (error, result) =>
        error ? reject(error) : resolve(result)
    );

    stream.end(buffer);
  });
}

async function deleteCloudinaryImage(publicId) {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      type: "authenticated",
      invalidate: true
    });
  } catch (error) {
    console.error(
      "Cloudinary cleanup error:",
      error?.code || error?.name
    );
  }
}

router.post(
  "/",
  upload.single("licenseImage"),
  async (req, res) => {
    let createdFirebaseUid = null;
    let createdExpertId = null;
    let uploadedPublicId = null;

    try {
      const {
        anonymousId,
        password,
        confirmPassword,
        age,
        professionalName,
        professionalEmail,
        gender,
        licenseNumber,
        qualification,
        specialization,
        experienceYears,
        bio
      } = req.body;

      const cleanAnonymousId =
        String(anonymousId || "").trim();

      const cleanName =
        String(professionalName || "").trim();

      const cleanEmail =
        String(professionalEmail || "")
          .trim()
          .toLowerCase();

      const cleanGender =
        String(gender || "").trim();

      const cleanLicense =
        String(licenseNumber || "").trim();

      const cleanQualification =
        String(qualification || "").trim();

      const cleanSpecialization =
        String(specialization || "").trim();

      const cleanBio =
        String(bio || "").trim();

      const numericAge = Number(age);

      const numericExperience =
        experienceYears === "" ||
        experienceYears === undefined
          ? 0
          : Number(experienceYears);

      const invalid = message =>
        res.status(400).json({
          success: false,
          message
        });

      if (!isValidAnonymousId(cleanAnonymousId)) {
        return invalid(
          "Anonymous ID must be 3–30 letters, numbers or underscores."
        );
      }

      if (!isValidPassword(password)) {
        return invalid(
          "Password needs 8+ characters, uppercase, lowercase, number and special character."
        );
      }

      if (password !== confirmPassword) {
        return invalid("Passwords do not match.");
      }

      if (
        !isValidAgeForRole(numericAge, "expert")
      ) {
        return invalid("Please enter a valid age.");
      }

      if (!cleanName) {
        return invalid(
          "Professional name is required."
        );
      }

      if (!isValidEmail(cleanEmail)) {
        return invalid(
          "Please enter a valid professional email."
        );
      }

      if (!cleanGender) {
        return invalid("Gender is required.");
      }

      if (!cleanLicense) {
        return invalid(
          "License number is required."
        );
      }

      if (!cleanQualification) {
        return invalid(
          "Qualification is required."
        );
      }

      if (!cleanSpecialization) {
        return invalid(
          "Specialization is required."
        );
      }

      if (
        !Number.isFinite(numericExperience) ||
        numericExperience < 0 ||
        numericExperience > 80
      ) {
        return invalid(
          "Years of experience must be between 0 and 80."
        );
      }

      if (cleanBio.length > 2000) {
        return invalid(
          "Professional bio must be 2000 characters or fewer."
        );
      }

      if (
        !req.file ||
        !req.file.mimetype?.startsWith("image/") ||
        req.file.size > 5 * 1024 * 1024
      ) {
        return invalid(
          "Upload a license image of 5 MB or smaller."
        );
      }

      const users = await db
        .collection("users")
        .where(
          "anonymousId",
          "==",
          cleanAnonymousId
        )
        .limit(1)
        .get();

      let firebaseUser;
      let existingUser = null;

      if (!users.empty) {
        const existingDoc = users.docs[0];

        existingUser = {
          id: existingDoc.id,
          ...existingDoc.data()
        };

        if (existingUser.role !== "expert") {
          return res.status(409).json({
            success: false,
            message:
              "This Anonymous ID is already taken."
          });
        }

        const passwordMatches =
          await bcrypt.compare(
            String(password),
            existingUser.password || ""
          );

        if (!passwordMatches) {
          return res.status(409).json({
            success: false,
            message:
              "An expert account with this ID already exists. Use its original password or another ID."
          });
        }

        const existingExpert = await db
          .collection("experts")
          .where(
            "uid",
            "==",
            existingUser.uid || existingUser.id
          )
          .limit(1)
          .get();

        if (!existingExpert.empty) {
          return res.status(409).json({
            success: false,
            message:
              "An expert application already exists for this ID."
          });
        }

        firebaseUser = {
          uid:
            existingUser.uid ||
            existingUser.id
        };
      }

      /*
       * Check before creating a new Firebase
       * account to avoid leaving a partial user
       * behind for a duplicate license.
       */

      const existingLicense = await db
        .collection("experts")
        .where(
          "licenseNumber",
          "==",
          cleanLicense
        )
        .limit(1)
        .get();

      if (!existingLicense.empty) {
        return res.status(409).json({
          success: false,
          message:
            "This license number is already registered."
        });
      }

      const uploadedImage =
        await uploadToCloudinary(
          req.file.buffer
        );

      uploadedPublicId =
        uploadedImage?.public_id || null;

      if (
        uploadedImage?.type !== "authenticated" ||
        !uploadedPublicId
      ) {
        throw new Error(
          "License upload must use authenticated delivery."
        );
      }

      const now = new Date();

      if (!firebaseUser) {
        firebaseUser =
          await auth.createUser({
            password: String(password),
            displayName: cleanAnonymousId
          });

        createdFirebaseUid =
          firebaseUser.uid;

        const hashedPassword =
          await bcrypt.hash(
            String(password),
            12
          );

        await db
          .collection("users")
          .doc(firebaseUser.uid)
          .set({
            uid: firebaseUser.uid,
            anonymousId: cleanAnonymousId,
            password: hashedPassword,
            role: "expert",
            age: numericAge,
            ageVerified: true,
            status: "active",
            verificationStatus: "pending",
            createdAt: now,
            updatedAt: now
          });
      }

      const expertData = {
        uid: firebaseUser.uid,
        anonymousId: cleanAnonymousId,
        name: cleanName,
        email: cleanEmail,
        gender: cleanGender,
        age: numericAge,
        licenseNumber: cleanLicense,

        // No reusable document URL in Firestore.
        licenseImageType: "authenticated",
        licenseImagePublicId: uploadedPublicId,

        qualification: cleanQualification,
        specialization: cleanSpecialization,
        experienceYears: numericExperience,
        bio: cleanBio,

        verificationStatus: "pending",
        verified: false,
        available: false,
        rejectionReason: "",

        createdAt: now,
        updatedAt: now
      };

      const expertRef = await db
        .collection("experts")
        .add(expertData);

      createdExpertId = expertRef.id;

      await db
        .collection("users")
        .doc(firebaseUser.uid)
        .update({
          expertId: expertRef.id,
          verificationStatus: "pending",
          updatedAt: new Date()
        });

      const token =
        await auth.createCustomToken(
          firebaseUser.uid,
          {
            role: "expert",
            anonymousId: cleanAnonymousId,
            age: numericAge,
            verificationStatus: "pending"
          }
        );

      return res.status(201).json({
        success: true,

        message:
          "Expert account and application created successfully. Your application is pending admin verification.",

        token,

        user: {
          uid: firebaseUser.uid,
          anonymousId: cleanAnonymousId,
          role: "expert",
          age: numericAge,
          verificationStatus: "pending"
        },

        expert: {
          id: expertRef.id,
          name: cleanName,
          verificationStatus: "pending",
          verified: false,
          available: false
        }
      });
    } catch (error) {
      console.error(
        "Complete expert registration error:",
        error?.code || error?.name
      );

      if (createdExpertId) {
        try {
          await db
            .collection("experts")
            .doc(createdExpertId)
            .delete();
        } catch (cleanupError) {
          console.error(
            "Expert cleanup error:",
            cleanupError?.code ||
              cleanupError?.name
          );
        }
      }

      await deleteCloudinaryImage(
        uploadedPublicId
      );

      if (createdFirebaseUid) {
        try {
          await db
            .collection("users")
            .doc(createdFirebaseUid)
            .delete();
        } catch (cleanupError) {
          console.error(
            "User cleanup error:",
            cleanupError?.code ||
              cleanupError?.name
          );
        }

        try {
          await auth.deleteUser(
            createdFirebaseUid
          );
        } catch (cleanupError) {
          console.error(
            "Firebase cleanup error:",
            cleanupError?.code ||
              cleanupError?.name
          );
        }
      }

      return res.status(500).json({
        success: false,
        message:
          "Expert registration failed. Please retry or contact support."
      });
    }
  }
);

module.exports = router;