const express = require("express");
const multer = require("multer");

const authenticate = require("../middleware/auth");
const { db } = require("../config/firebase");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

// =========================================================
// MULTER
// =========================================================

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

// =========================================================
// CLOUDINARY UPLOAD
// =========================================================

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
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
            return;
          }

          resolve(result);
        }
      );

    stream.end(buffer);
  });
};

// =========================================================
// REGISTER EXPERT
// =========================================================

router.post(
  "/register",
  authenticate,
  upload.single("licenseImage"),
  async (req, res) => {
    try {
      const uid = req.user.uid;

      const {
        anonymousId,
        name,
        email,
        gender,
        age,
        licenseNumber,
        specialization,
        qualification,
        experienceYears,
        bio,
      } = req.body;

      // -------------------------------------------------------
      // REQUIRED FIELDS
      // -------------------------------------------------------

      if (!anonymousId?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Anonymous ID is required.",
        });
      }

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Professional name is required.",
        });
      }

      if (!email?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Professional email is required.",
        });
      }

      if (!gender) {
        return res.status(400).json({
          success: false,
          message:
            "Gender is required.",
        });
      }

      if (!licenseNumber?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "License number is required.",
        });
      }

      if (!specialization?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Specialization is required.",
        });
      }

      if (!qualification?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Qualification is required.",
        });
      }

      // -------------------------------------------------------
      // LICENSE IMAGE
      // -------------------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Please upload your license / verification image.",
        });
      }

      if (
        !req.file.mimetype ||
        !req.file.mimetype.startsWith("image/")
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The license file must be an image.",
        });
      }

      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message:
            "License image must be 5 MB or smaller.",
        });
      }

      // -------------------------------------------------------
      // USER ACCOUNT
      // -------------------------------------------------------

      const userRef = db
        .collection("users")
        .doc(uid);

      const userSnap =
        await userRef.get();

      if (!userSnap.exists) {
        return res.status(404).json({
          success: false,
          message:
            "User account not found.",
        });
      }

      const user = userSnap.data();

      if (user.role !== "expert") {
        return res.status(403).json({
          success: false,
          message:
            "Only expert accounts can submit expert applications.",
        });
      }

      // -------------------------------------------------------
      // EXISTING APPLICATION
      // -------------------------------------------------------

      const existingByUid =
        await db
          .collection("experts")
          .where("uid", "==", uid)
          .limit(1)
          .get();

      if (!existingByUid.empty) {
        return res.status(409).json({
          success: false,
          message:
            "An expert application already exists for this account.",
        });
      }

      // -------------------------------------------------------
      // DUPLICATE LICENSE
      // -------------------------------------------------------

      const existingLicense =
        await db
          .collection("experts")
          .where(
            "licenseNumber",
            "==",
            licenseNumber.trim()
          )
          .limit(1)
          .get();

      if (!existingLicense.empty) {
        return res.status(409).json({
          success: false,
          message:
            "This license number is already registered.",
        });
      }

      // -------------------------------------------------------
      // CLOUDINARY
      // -------------------------------------------------------

      let uploadedImage;

      try {
        uploadedImage =
          await uploadToCloudinary(
            req.file.buffer
          );
      } catch (uploadError) {
        console.error(
          "Cloudinary upload error:",
          uploadError
        );

        return res.status(500).json({
          success: false,
          message:
            "License image upload failed. Please check Cloudinary configuration.",
        });
      }

      // -------------------------------------------------------
      // EXPERT DATA
      // -------------------------------------------------------

      const expertData = {
        uid,

        anonymousId:
          anonymousId.trim(),

        name:
          name.trim(),

        email:
          email.trim().toLowerCase(),

        gender,

        age:
          Number(age) ||
          Number(user.age) ||
          null,

        licenseNumber:
          licenseNumber.trim(),

        licenseImageUrl:
          uploadedImage.secure_url,

        specialization:
          specialization.trim(),

        qualification:
          qualification.trim(),

        experienceYears:
          Number(experienceYears) || 0,

        bio:
          bio?.trim() || "",

        verificationStatus:
          "pending",

        verified: false,

        available: false,

        rejectionReason: "",

        createdAt: new Date(),

        updatedAt: new Date(),
      };

      // -------------------------------------------------------
      // SAVE EXPERT
      // -------------------------------------------------------

      const expertRef =
        await db
          .collection("experts")
          .add(expertData);

      // -------------------------------------------------------
      // UPDATE USER
      // -------------------------------------------------------

      await userRef.update({
        expertId: expertRef.id,
        verificationStatus:
          "pending",
        updatedAt: new Date(),
      });

      // -------------------------------------------------------
      // RESPONSE
      // -------------------------------------------------------

      return res.status(201).json({
        success: true,

        message:
          "Expert application submitted successfully. Waiting for admin verification.",

        expert: {
          id: expertRef.id,

          anonymousId:
            anonymousId.trim(),

          name:
            name.trim(),

          verificationStatus:
            "pending",
        },
      });
    } catch (error) {
      console.error(
        "Expert registration error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to submit expert application.",
      });
    }
  }
);

// =========================================================
// GET VERIFIED EXPERTS
// =========================================================

router.get(
  "/verified",
  authenticate,
  async (req, res) => {
    try {
      const snapshot =
        await db
          .collection("experts")
          .where(
            "verificationStatus",
            "==",
            "verified"
          )
          .get();

      const experts =
        snapshot.docs.map((doc) => {
          const data =
            doc.data();

          return {
            id: doc.id,

            name:
              data.name ||
              "Support Professional",

            gender:
              data.gender ||
              "",

            specialization:
              data.specialization ||
              "",

            qualification:
              data.qualification ||
              "",

            experienceYears:
              data.experienceYears ||
              0,

            bio:
              data.bio ||
              "",

            verified:
              data.verified !== false,

            available:
              data.available !== false,

            verificationStatus:
              data.verificationStatus,
          };
        });

      return res.json({
        success: true,
        experts,
      });
    } catch (error) {
      console.error(
        "Get verified experts error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load verified experts.",
      });
    }
  }
);

// =========================================================
// GET MY EXPERT PROFILE
// =========================================================

router.get(
  "/me",
  authenticate,
  async (req, res) => {
    try {
      const snapshot =
        await db
          .collection("experts")
          .where(
            "uid",
            "==",
            req.user.uid
          )
          .limit(1)
          .get();

      if (snapshot.empty) {
        return res.status(404).json({
          success: false,
          message:
            "Expert profile not found.",
        });
      }

      const doc =
        snapshot.docs[0];

      return res.json({
        success: true,

        expert: {
          id: doc.id,
          ...doc.data(),
        },
      });
    } catch (error) {
      console.error(
        "Get my expert profile error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load expert profile.",
      });
    }
  }
);

// =========================================================
// GET SINGLE EXPERT
// =========================================================

router.get(
  "/:id",
  authenticate,
  async (req, res) => {
    try {
      const doc =
        await db
          .collection("experts")
          .doc(req.params.id)
          .get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Expert not found.",
        });
      }

      const data =
        doc.data();

      return res.json({
        success: true,

        expert: {
          id: doc.id,

          name:
            data.name ||
            "Support Professional",

          gender:
            data.gender || "",

          specialization:
            data.specialization || "",

          qualification:
            data.qualification || "",

          experienceYears:
            data.experienceYears || 0,

          bio:
            data.bio || "",

          verificationStatus:
            data.verificationStatus,

          verified:
            data.verified || false,

          available:
            data.available !== false,
        },
      });
    } catch (error) {
      console.error(
        "Get expert error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load expert.",
      });
    }
  }
);

module.exports = router;