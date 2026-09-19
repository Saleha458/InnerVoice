"use strict";

const cloudinary =
  require("cloudinary").v2;

const VERIFICATION_FOLDER =
  "innervoice/expert-verifications";

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET,

  secure: true
});

/*
 * Force authenticated delivery for
 * expert verification uploads.
 *
 * Other Cloudinary uploads are unchanged.
 */

const originalUploadStream =
  cloudinary.uploader.upload_stream.bind(
    cloudinary.uploader
  );

cloudinary.uploader.upload_stream =
  function secureUploadStream(
    options,
    callback
  ) {
    if (
      options?.folder !==
      VERIFICATION_FOLDER
    ) {
      return originalUploadStream(
        options,
        callback
      );
    }

    return originalUploadStream(
      {
        ...options,

        folder:
          VERIFICATION_FOLDER,

        resource_type: "image",

        type: "authenticated",

        overwrite: false,

        unique_filename: true,

        use_filename: false
      },
      callback
    );
  };

/*
 * Existing registration cleanup
 * must delete authenticated assets
 * using their correct delivery type.
 */

const originalDestroy =
  cloudinary.uploader.destroy.bind(
    cloudinary.uploader
  );

cloudinary.uploader.destroy =
  function secureDestroy(
    publicId,
    options,
    callback
  ) {
    if (
      typeof publicId !== "string" ||
      !publicId.startsWith(
        `${VERIFICATION_FOLDER}/`
      )
    ) {
      return originalDestroy(
        publicId,
        options,
        callback
      );
    }

    if (
      typeof options === "function"
    ) {
      return originalDestroy(
        publicId,
        {
          resource_type: "image",
          type: "authenticated",
          invalidate: true
        },
        options
      );
    }

    return originalDestroy(
      publicId,
      {
        ...options,

        resource_type: "image",

        type: "authenticated",

        invalidate: true
      },
      callback
    );
  };

module.exports = cloudinary;