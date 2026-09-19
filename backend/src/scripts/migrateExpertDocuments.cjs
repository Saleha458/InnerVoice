"use strict";

const path = require("node:path");

require("dotenv").config({
  path: path.join(
    __dirname,
    "../.env"
  ),
  quiet: true
});

const {
  FieldValue
} = require("firebase-admin/firestore");

const {
  db
} = require("../src/config/firebase");

const cloudinary =
  require("../src/config/cloudinary");

const apply =
  process.argv.includes("--apply");

const FOLDER =
  "innervoice/expert-verifications/";

function validPublicId(value) {
  return (
    typeof value === "string" &&
    value.startsWith(FOLDER) &&
    /^[A-Za-z0-9_./-]+$/.test(value) &&
    !value.split("/").includes("..")
  );
}

function findPublicId(expert) {
  if (
    validPublicId(
      expert.licenseImagePublicId
    )
  ) {
    return expert.licenseImagePublicId;
  }

  try {
    const url = new URL(
      expert.licenseImageUrl || ""
    );

    if (
      url.protocol !== "https:" ||
      url.hostname !==
        "res.cloudinary.com" ||
      url.pathname.split("/")[1] !==
        process.env.CLOUDINARY_CLOUD_NAME
    ) {
      return null;
    }

    const match = url.pathname.match(
      /\/image\/(?:upload|authenticated)\/(?:v\d+\/)?(.+)\.[A-Za-z0-9]+$/
    );

    if (!match) {
      return null;
    }

    const id =
      decodeURIComponent(
        match[1]
      );

    return validPublicId(id)
      ? id
      : null;
  } catch {
    return null;
  }
}

async function getAuthenticated(
  publicId
) {
  try {
    return await cloudinary.api.resource(
      publicId,
      {
        resource_type: "image",
        type: "authenticated"
      }
    );
  } catch {
    return null;
  }
}

async function main() {
  const snapshot = await db
    .collection("experts")
    .get();

  const counts = {
    scanned: 0,
    eligible: 0,
    converted: 0,
    failed: 0,
    manualReview: 0
  };

  for (const doc of snapshot.docs) {
    counts.scanned++;

    const expert = doc.data();

    const publicId =
      findPublicId(expert);

    if (!publicId) {
      if (
        expert.licenseImageUrl ||
        expert.licenseImagePublicId
      ) {
        counts.manualReview++;
      }

      continue;
    }

    counts.eligible++;

    if (!apply) {
      continue;
    }

    try {
      let asset =
        await getAuthenticated(
          publicId
        );

      if (!asset) {
        await cloudinary.uploader.rename(
          publicId,
          publicId,
          {
            resource_type: "image",

            type: "upload",

            to_type: "authenticated",

            overwrite: false,

            invalidate: true
          }
        );

        asset =
          await getAuthenticated(
            publicId
          );
      }

      if (
        !asset ||
        asset.type !==
          "authenticated"
      ) {
        throw new Error(
          "Protected asset not confirmed."
        );
      }

      await doc.ref.update({
        licenseImagePublicId:
          asset.public_id,

        licenseImageType:
          "authenticated",

        licenseImageUrl:
          FieldValue.delete(),

        documentProtectedAt:
          new Date()
      });

      counts.converted++;
    } catch {
      // A Cloudinary conversion may have
      // succeeded while the Firestore update
      // failed. Re-run after investigating.
      // Never delete the original blindly.

      counts.failed++;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply
          ? "APPLY"
          : "DRY_RUN",

        ...counts
      },
      null,
      2
    )
  );

  if (
    counts.failed > 0 ||
    counts.manualReview > 0
  ) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(
    "Document migration failed:",
    error?.name || "error"
  );

  process.exitCode = 1;
});