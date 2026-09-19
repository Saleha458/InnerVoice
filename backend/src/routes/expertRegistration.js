const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");

const {
  auth,
  db,
} = require("../config/firebase");

const cloudinary = require("../config/cloudinary");

const {
  isValidAnonymousId,
  isValidPassword,
  isValidAgeForRole,
  isValidEmail,
} = require("../utils/validators");

const router = express.Router();

/* =========================================================
   MULTER
========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (
      file.mimetype &&
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only image files are allowed."
        )
      );
    }
  },
});

/* =========================================================
   CLOUDINARY
========================================================= */

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream =
      cloudinary.uploader.upload_stream(
        {
          folder:
            "innervoice/expert-verifications",

          resource_type: "image",
        },

        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

    stream.end(buffer);
  });

/* =========================================================
   DELETE CLOUDINARY IMAGE
========================================================= */

const deleteCloudinaryImage = async (
  publicId
) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: "image",
      }
    );
  } catch (error) {
    console.error(
      "Cloudinary cleanup error:",
      error.message
    );
  }
};

/* =========================================================
   REGISTER EXPERT ACCOUNT + PROFILE
========================================================= */

router.post(
  "/",
  upload.single("licenseImage"),

  async (req, res) => {
    let createdFirebaseUid = null;
    let createdNewFirebaseUser = false;
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
        bio,
      } = req.body;

      /* ---------------------------------------------------
         CLEAN VALUES
      --------------------------------------------------- */

      const cleanAnonymousId =
        String(
          anonymousId || ""
        ).trim();

      const cleanName =
        String(
          professionalName || ""
        ).trim();

      const cleanEmail =
        String(
          professionalEmail || ""
        )
          .trim()
          .toLowerCase();

      const cleanGender =
        String(
          gender || ""
        ).trim();

      const cleanLicense =
        String(
          licenseNumber || ""
        ).trim();

      const cleanQualification =
        String(
          qualification || ""
        ).trim();

      const cleanSpecialization =
        String(
          specialization || ""
        ).trim();

      const cleanBio =
        String(
          bio || ""
        ).trim();

      const numericAge =
        Number(age);

      const numericExperience =
        experienceYears === "" ||
        experienceYears === undefined
          ? 0
          : Number(experienceYears);

      /* ---------------------------------------------------
         BASIC VALIDATION
      --------------------------------------------------- */

      if (
        !isValidAnonymousId(
          cleanAnonymousId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Anonymous ID must be 3-30 characters and may contain only letters, numbers and underscores.",
        });
      }

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

      if (
        !isValidAgeForRole(
          numericAge,
          "expert"
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid age.",
        });
      }

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message:
            "Professional name is required.",
        });
      }

      if (
        !isValidEmail(
          cleanEmail
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid professional email.",
        });
      }

      if (!cleanGender) {
        return res.status(400).json({
          success: false,
          message:
            "Gender is required.",
        });
      }

      if (!cleanLicense) {
        return res.status(400).json({
          success: false,
          message:
            "License number is required.",
        });
      }

      if (!cleanQualification) {
        return res.status(400).json({
          success: false,
          message:
            "Qualification is required.",
        });
      }

      if (!cleanSpecialization) {
        return res.status(400).json({
          success: false,
          message:
            "Specialization is required.",
        });
      }

      if (
        !Number.isFinite(
          numericExperience
        ) ||
        numericExperience < 0 ||
        numericExperience > 80
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Years of experience must be between 0 and 80.",
        });
      }

      /* ---------------------------------------------------
         LICENSE IMAGE
      --------------------------------------------------- */

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Please upload your license / verification image.",
        });
      }

      if (
        !req.file.mimetype ||
        !req.file.mimetype.startsWith(
          "image/"
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "License file must be an image.",
        });
      }

      if (
        req.file.size >
        5 * 1024 * 1024
      ) {
        return res.status(400).json({
          success: false,
          message:
            "License image must be 5 MB or smaller.",
        });
      }

      /* ---------------------------------------------------
         CHECK ANONYMOUS ID
         
         This also handles an incomplete expert account
         left behind by the old registration flow.
      --------------------------------------------------- */

      const existingUserSnapshot =
        await db
          .collection("users")
          .where(
            "anonymousId",
            "==",
            cleanAnonymousId
          )
          .limit(1)
          .get();

      let firebaseUser = null;
      let existingUser = null;

      if (
        !existingUserSnapshot.empty
      ) {
        const existingDoc =
          existingUserSnapshot.docs[0];

        existingUser = {
          id: existingDoc.id,
          ...existingDoc.data(),
        };

        if (
          existingUser.role !==
          "expert"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "This Anonymous ID is already taken. Please choose another one.",
          });
        }

        /*
         * If the old flow already created the
         * expert account, verify its password
         * from our bcrypt hash and continue.
         */

        const passwordMatches =
          await bcrypt.compare(
            String(password),
            existingUser.password ||
              ""
          );

        if (!passwordMatches) {
          return res.status(409).json({
            success: false,
            message:
              "An expert account with this Anonymous ID already exists. Please use its original password or choose another Anonymous ID.",
          });
        }

        const existingExpert =
          await db
            .collection("experts")
            .where(
              "uid",
              "==",
              existingUser.uid ||
                existingUser.id
            )
            .limit(1)
            .get();

        if (
          !existingExpert.empty
        ) {
          return res.status(409).json({
            success: false,
            message:
              "An expert application already exists for this Anonymous ID.",
          });
        }

        firebaseUser = {
          uid:
            existingUser.uid ||
            existingUser.id,
        };
      } else {
        /* -------------------------------------------------
           CREATE NEW FIREBASE USER
        ------------------------------------------------- */

        firebaseUser =
          await auth.createUser({
            password:
              String(password),

            displayName:
              cleanAnonymousId,
          });

        createdFirebaseUid =
          firebaseUser.uid;

        createdNewFirebaseUser =
          true;

        /* -------------------------------------------------
           CREATE USER DOCUMENT
        ------------------------------------------------- */

        const hashedPassword =
          await bcrypt.hash(
            String(password),
            12
          );

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

            role:
              "expert",

            age:
              numericAge,

            ageVerified:
              true,

            status:
              "active",

            verificationStatus:
              "pending",

            createdAt:
              now,

            updatedAt:
              now,
          });
      }

      /* ---------------------------------------------------
         DUPLICATE LICENSE
      --------------------------------------------------- */

      const existingLicense =
        await db
          .collection("experts")
          .where(
            "licenseNumber",
            "==",
            cleanLicense
          )
          .limit(1)
          .get();

      if (
        !existingLicense.empty
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This license number is already registered.",
        });
      }

      /* ---------------------------------------------------
         CLOUDINARY
      --------------------------------------------------- */

      let uploadedImage;

      try {
        uploadedImage =
          await uploadToCloudinary(
            req.file.buffer
          );

        uploadedPublicId =
          uploadedImage.public_id;
      } catch (uploadError) {
        console.error(
          "Cloudinary upload error:",
          uploadError
        );

        throw new Error(
          "License image upload failed. Check your Cloudinary configuration."
        );
      }

      /* ---------------------------------------------------
         EXPERT PROFILE
      --------------------------------------------------- */

      const now =
        new Date();

      const expertData = {
        uid:
          firebaseUser.uid,

        anonymousId:
          cleanAnonymousId,

        name:
          cleanName,

        email:
          cleanEmail,

        gender:
          cleanGender,

        age:
          numericAge,

        licenseNumber:
          cleanLicense,

        licenseImageUrl:
          uploadedImage.secure_url,

        licenseImagePublicId:
          uploadedImage.public_id,

        qualification:
          cleanQualification,

        specialization:
          cleanSpecialization,

        experienceYears:
          numericExperience,

        bio:
          cleanBio,

        verificationStatus:
          "pending",

        verified:
          false,

        available:
          false,

        rejectionReason:
          "",

        createdAt:
          now,

        updatedAt:
          now,
      };

      const expertRef =
        await db
          .collection("experts")
          .add(expertData);

      createdExpertId =
        expertRef.id;

      /* ---------------------------------------------------
         UPDATE USER
      --------------------------------------------------- */

      await db
        .collection("users")
        .doc(firebaseUser.uid)
        .update({
          expertId:
            expertRef.id,

          verificationStatus:
            "pending",

          updatedAt:
            new Date(),
        });

      /* ---------------------------------------------------
         CREATE CUSTOM TOKEN
      --------------------------------------------------- */

      const token =
        await auth.createCustomToken(
          firebaseUser.uid,
          {
            role: "expert",

            anonymousId:
              cleanAnonymousId,

            age:
              numericAge,

            verificationStatus:
              "pending",
          }
        );

      /* ---------------------------------------------------
         SUCCESS
      --------------------------------------------------- */

      return res.status(201).json({
        success: true,

        message:
          "Expert account and application created successfully. Your application is pending admin verification.",

        token,

        user: {
          uid:
            firebaseUser.uid,

          anonymousId:
            cleanAnonymousId,

          role:
            "expert",

          age:
            numericAge,

          verificationStatus:
            "pending",
        },

        expert: {
          id:
            expertRef.id,

          name:
            cleanName,

          verificationStatus:
            "pending",

          verified:
            false,

          available:
            false,
        },
      });
    } catch (error) {
      console.error(
        "Complete expert registration error:",
        error
      );

      /* ---------------------------------------------------
         CLEANUP EXPERT DOCUMENT
      --------------------------------------------------- */

      if (createdExpertId) {
        try {
          await db
            .collection("experts")
            .doc(createdExpertId)
            .delete();
        } catch (cleanupError) {
          console.error(
            "Expert document cleanup error:",
            cleanupError.message
          );
        }
      }

      /* ---------------------------------------------------
         CLEANUP CLOUDINARY
      --------------------------------------------------- */

      if (uploadedPublicId) {
        await deleteCloudinaryImage(
          uploadedPublicId
        );
      }

      /* ---------------------------------------------------
         CLEANUP NEW FIREBASE USER
      --------------------------------------------------- */

      if (
        createdNewFirebaseUser &&
        createdFirebaseUid
      ) {
        try {
          await db
            .collection("users")
            .doc(createdFirebaseUid)
            .delete();
        } catch (cleanupError) {
          console.error(
            "Firestore user cleanup error:",
            cleanupError.message
          );
        }

        try {
          await auth.deleteUser(
            createdFirebaseUid
          );
        } catch (cleanupError) {
          console.error(
            "Firebase user cleanup error:",
            cleanupError.message
          );
        }
      }

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Expert registration failed.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

module.exports = router;