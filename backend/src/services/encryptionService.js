"use strict";

const crypto = require("node:crypto");

const ALGORITHM = "aes-256-gcm";

// Preserve the original SHA-256 key derivation
// and 16-byte IV for existing messages.

function getKey() {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("ENCRYPTION_KEY is missing");
  }

  return crypto
    .createHash("sha256")
    .update(secret, "utf8")
    .digest();
}

function encrypt(text, context = "") {
  if (typeof text !== "string") {
    throw new TypeError("Expected text string");
  }

  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    getKey(),
    iv
  );

  if (context) {
    cipher.setAAD(Buffer.from(context, "utf8"));
  }

  const encryptedData =
    cipher.update(text, "utf8", "hex") +
    cipher.final("hex");

  return {
    encryptedData,
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

function decrypt(
  encryptedData,
  iv,
  authTag,
  context = ""
) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, "hex")
  );

  if (context) {
    decipher.setAAD(Buffer.from(context, "utf8"));
  }

  decipher.setAuthTag(
    Buffer.from(authTag, "hex")
  );

  return (
    decipher.update(
      encryptedData,
      "hex",
      "utf8"
    ) + decipher.final("utf8")
  );
}

module.exports = {
  encrypt,
  decrypt,
};