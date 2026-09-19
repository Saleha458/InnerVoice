"use strict";

const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
  quiet: true,
});

const { db } = require("./src/config/firebase");

const {
  unseal,
} = require("./src/services/privateFields");

const has = (obj, key) =>
  Object.prototype.hasOwnProperty.call(
    obj,
    key
  );

const base64 = (str) =>
  typeof str === "string" &&
  str.length > 0 &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(str);

const envelope = (data) =>
  data?.v === 1 &&
  base64(data.iv) &&
  Buffer.from(
    data.iv,
    "base64"
  ).length === 12 &&
  base64(data.ct) &&
  Buffer.from(
    data.ct,
    "base64"
  ).length > 16;

async function main() {
  const counts = {
    total: 0,
    deviceEncrypted: 0,
    legacy: 0,
    invalid: 0,
  };

  let cursor = null;

  while (true) {
    let query = db
      .collection("moods")
      .orderBy("__name__")
      .limit(100);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const page = await query.get();

    if (page.empty) {
      break;
    }

    for (const doc of page.docs) {
      counts.total++;

      const data = doc.data();

      try {
        if (!data.userId) {
          throw new Error(
            "Owner missing"
          );
        }

        if (data.privacyVersion === 2) {
          if (
            !envelope(data.e2ee) ||
            [
              "mood",
              "note",
              "intensity",
              "privateData",
              "encryptedData",
              "iv",
              "authTag",
            ].some(
              (field) => has(data, field)
            )
          ) {
            throw new Error(
              "Unexpected v2 fields"
            );
          }

          counts.deviceEncrypted++;
        } else if (
          data.privacyVersion === 1 &&
          data.privateData
        ) {
          unseal(
            data,
            "moods",
            data.userId,
            [
              "mood",
              "note",
              "intensity",
            ]
          );

          if (
            [
              "mood",
              "note",
              "intensity",
            ].some(
              (field) => has(data, field)
            )
          ) {
            throw new Error(
              "Plaintext legacy field"
            );
          }

          counts.legacy++;
        } else {
          throw new Error(
            "Unknown record version"
          );
        }
      } catch {
        counts.invalid++;
      }
    }

    cursor = page.docs.at(-1);
  }

  console.log(
    `moods: scanned=${counts.total} ` +
    `device_encrypted=${counts.deviceEncrypted} ` +
    `server_decryptable=${counts.legacy} ` +
    `invalid=${counts.invalid}`
  );

  console.log(
    "Read-only structural check; not proof of end-to-end encryption."
  );

  if (counts.invalid) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    "Audit failed:",
    error?.code ||
      error?.name ||
      "unknown"
  );

  process.exitCode = 1;
});