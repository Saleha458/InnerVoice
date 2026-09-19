"use strict";

const {
  db
} = require("../config/firebase");

const cloudinary =
  require("../config/cloudinary");

const validUid = uid =>
  typeof uid === "string" &&
  /^[A-Za-z0-9_-]{1,128}$/.test(uid);

const validPublicId = id =>
  typeof id === "string" &&
  id.startsWith(
    "innervoice/expert-verifications/"
  ) &&
  /^[A-Za-z0-9_./-]{1,255}$/.test(id) &&
  !id.split("/").includes("..");

function isNotFound(error) {
  return (
    error?.http_code === 404 ||
    error?.statusCode === 404
  );
}

async function deleteVerificationAsset(publicId) {
  if (!validPublicId(publicId)) {
    throw new Error(
      "Unknown license image: manual review required."
    );
  }

  // Older assets may be public 'upload'.
  // Newer assets use 'authenticated'.
  // Check both delivery types.

  for (
    const type of ["authenticated", "upload"]
  ) {
    let asset;

    try {
      asset =
        await cloudinary.api.resource(
          publicId,
          {
            resource_type: "image",
            type
          }
        );
    } catch (error) {
      if (isNotFound(error)) {
        continue;
      }

      throw error;
    }

    if (!asset) {
      continue;
    }

    // Use the Admin API directly rather than
    // the application's patched uploader.destroy.
    const result =
      await cloudinary.api.delete_resources(
        [publicId],
        {
          resource_type: "image",
          type,
          invalidate: true
        }
      );

    const status =
      result?.deleted?.[publicId];

    if (
      status !== "deleted" &&
      status !== "not_found"
    ) {
      throw new Error(
        "Cloudinary asset deletion was not confirmed."
      );
    }
  }
}

async function deletePrivateVault(uid) {
  if (!validUid(uid)) {
    throw new Error(
      "Invalid account UID."
    );
  }

  const ref = db
    .collection("privateVaults")
    .doc(uid);

  await db.recursiveDelete(ref);
}

module.exports = {
  deleteVerificationAsset,
  deletePrivateVault
};