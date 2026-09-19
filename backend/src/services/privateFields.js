"use strict";

const {
  encrypt,
  decrypt,
} = require("./encryptionService");

// Versioned authenticated encryption.
// The backend still owns the encryption key.

function aad(collection, ownerId) {
  if (
    !/^[A-Za-z]+$/.test(collection) ||
    typeof ownerId !== "string" ||
    !ownerId
  ) {
    throw new Error(
      "Invalid private record owner or collection"
    );
  }

  return `innervoice:v1:${collection}:${ownerId}`;
}

function seal(fields, collection, ownerId) {
  return {
    privacyVersion: 1,

    privateData: encrypt(
      JSON.stringify(fields),
      aad(collection, ownerId)
    ),
  };
}

function unseal(
  record,
  collection,
  ownerId,
  fields
) {
  if (!record.privateData) {
    // Read old records until migration runs.
    // New records must never use plaintext storage.

    return Object.fromEntries(
      fields.map((field) => [
        field,
        record[field],
      ])
    );
  }

  if (record.privacyVersion !== 1) {
    throw new Error(
      "Unsupported privacy version"
    );
  }

  const {
    encryptedData,
    iv,
    authTag,
  } = record.privateData;

  const value = JSON.parse(
    decrypt(
      encryptedData,
      iv,
      authTag,
      aad(collection, ownerId)
    )
  );

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid private data"
    );
  }

  return Object.fromEntries(
    fields.map((field) => [
      field,
      value[field],
    ])
  );
}

module.exports = {
  seal,
  unseal,
};