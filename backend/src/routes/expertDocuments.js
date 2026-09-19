"use strict";

const express = require("express");

const authenticate =
  require("../middleware/auth");

const allowRoles =
  require("../middleware/roleAuth");

const {
  db
} = require("../config/firebase");

const cloudinary =
  require("../config/cloudinary");

const router = express.Router();

router.use(
  authenticate,
  allowRoles("admin")
);

router.use(
  (_req, res, next) => {
    res.set(
      "Cache-Control",
      "no-store"
    );

    res.set(
      "Referrer-Policy",
      "no-referrer"
    );

    next();
  }
);

const validId = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]{1,128}$/.test(value);

const FOLDER =
  "innervoice/expert-verifications/";

function getPublicId(expert) {
  const value =
    expert?.licenseImagePublicId;

  if (
    typeof value !== "string" ||
    !value.startsWith(FOLDER) ||
    !/^[A-Za-z0-9_./-]+$/.test(value) ||
    value.split("/").includes("..")
  ) {
    return null;
  }

  return value;
}

async function protectedAsset(expert) {
  const publicId =
    getPublicId(expert);

  if (!publicId) {
    return null;
  }

  try {
    const asset =
      await cloudinary.api.resource(
        publicId,
        {
          resource_type: "image",
          type: "authenticated"
        }
      );

    if (
      asset?.type !==
        "authenticated"
    ) {
      return null;
    }

    return asset;
  } catch {
    return null;
  }
}

/* ------------------------------------------
   SANITIZED PENDING APPLICATIONS
------------------------------------------ */

router.get(
  "/pending",
  async (_req, res) => {
    try {
      const snapshot = await db
        .collection("experts")
        .where(
          "verificationStatus",
          "==",
          "pending"
        )
        .get();

      const experts =
        snapshot.docs.map(doc => {
          const expert = doc.data();

          return {
            id: doc.id,

            name:
              expert.name || "",

            anonymousId:
              expert.anonymousId || "",

            email:
              expert.email || "",

            age:
              expert.age ?? null,

            gender:
              expert.gender || "",

            licenseNumber:
              expert.licenseNumber || "",

            qualification:
              expert.qualification || "",

            specialization:
              expert.specialization || "",

            experienceYears:
              expert.experienceYears || 0,

            bio:
              expert.bio || "",

            verificationStatus:
              "pending",

            hasDocument:
              Boolean(
                getPublicId(expert)
              ),

            documentNeedsMigration:
              expert.licenseImageType !==
              "authenticated"
          };
        });

      return res.json({
        success: true,
        experts
      });
    } catch {
      return res.status(500).json({
        success: false,

        message:
          "Could not load pending applications."
      });
    }
  }
);

/* ------------------------------------------
   SHORT-LIVED ADMIN DOCUMENT URL
------------------------------------------ */

router.get(
  "/:expertId/license-url",
  async (req, res) => {
    try {
      const expertId =
        req.params.expertId;

      if (!validId(expertId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid expert ID."
        });
      }

      const doc = await db
        .collection("experts")
        .doc(expertId)
        .get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Expert application not found."
        });
      }

      const expert = doc.data();

      const asset =
        await protectedAsset(expert);

      if (
        !asset ||
        !asset.public_id ||
        !asset.format
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Document is not protected or is unavailable. Migrate old documents first."
        });
      }

      const expiresAt =
        Math.floor(
          Date.now() / 1000
        ) + 60;

      const url =
        cloudinary.utils.private_download_url(
          asset.public_id,
          asset.format,
          {
            resource_type: "image",

            type: "authenticated",

            expires_at: expiresAt
          }
        );

      return res.json({
        success: true,
        url,
        expiresAt
      });
    } catch {
      return res.status(503).json({
        success: false,

        message:
          "Protected document is temporarily unavailable."
      });
    }
  }
);

/* ------------------------------------------
   BLOCK APPROVAL OF PUBLIC DOCUMENTS
------------------------------------------ */

router.patch(
  "/:expertId/verify",
  async (req, res, next) => {
    if (
      req.body?.status !== "verified"
    ) {
      return next();
    }

    try {
      const expertId =
        req.params.expertId;

      if (!validId(expertId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid expert ID."
        });
      }

      const doc = await db
        .collection("experts")
        .doc(expertId)
        .get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: "Expert not found."
        });
      }

      const asset =
        await protectedAsset(
          doc.data()
        );

      if (!asset) {
        return res.status(409).json({
          success: false,

          message:
            "This expert's license must use authenticated delivery before approval."
        });
      }

      // Continue to the existing Admin
      // verification handler.
      return next();
    } catch {
      return res.status(503).json({
        success: false,

        message:
          "Could not verify document protection."
      });
    }
  }
);

module.exports = router;