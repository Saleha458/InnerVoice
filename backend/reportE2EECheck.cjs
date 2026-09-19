"use strict";

require("dotenv").config({
  quiet: true
});

const {
  db
} = require("./src/config/firebase");

const {
  unseal
} = require("./src/services/privateFields");

const has = (obj, key) =>
  Object.prototype.hasOwnProperty.call(
    obj,
    key
  );

const b64 = text =>
  typeof text === "string" &&
  text.length > 0 &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(text);

const box = item =>
  item?.v === 1 &&
  b64(item.iv) &&
  Buffer.from(
    item.iv,
    "base64"
  ).length === 12 &&
  b64(item.ct) &&
  Buffer.from(
    item.ct,
    "base64"
  ).length > 16;

const envelope = item =>
  item?.v === 1 &&
  b64(item.epk) &&
  b64(item.salt) &&
  box(item.sender) &&
  box(item.receiver);

async function main() {
  let cursor;

  const counts = {
    scanned: 0,
    device_encrypted: 0,
    server_decryptable: 0,
    invalid: 0
  };

  for (;;) {
    let page = db
      .collection("reports")
      .orderBy("__name__")
      .limit(100);

    if (cursor) {
      page = page.startAfter(cursor);
    }

    const snap = await page.get();

    if (snap.empty) {
      break;
    }

    for (const doc of snap.docs) {
      counts.scanned++;

      const data = doc.data();

      try {
        if (data.privacyVersion === 2) {
          if (
            !data.reporterId ||
            !data.adminUid ||
            !envelope(data.e2ee) ||
            [
              "privateData",
              "category",
              "description",
              "severity",
              "encryptedData",
              "iv",
              "authTag"
            ].some(name => has(data, name))
          ) {
            throw new Error(
              "Invalid device-encrypted report"
            );
          }

          counts.device_encrypted++;
        } else if (
          data.privacyVersion === 1 &&
          data.reporterId &&
          data.privateData
        ) {
          if (
            [
              "category",
              "description",
              "severity"
            ].some(name => has(data, name))
          ) {
            throw new Error(
              "Plaintext legacy field"
            );
          }

          unseal(
            data,
            "reports",
            data.reporterId,
            [
              "category",
              "description",
              "severity"
            ]
          );

          counts.server_decryptable++;
        } else {
          throw new Error(
            "Unknown format"
          );
        }
      } catch {
        counts.invalid++;
      }
    }

    cursor = snap.docs[
      snap.docs.length - 1
    ];
  }

  console.log(
    "reports:",
    counts
  );

  console.log(
    "Structural check only: does not verify decryption on devices, Admin key authenticity, access policy, old backups or real E2EE."
  );

  if (counts.invalid) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(
    "Audit failed:",
    error.code || error.name
  );

  process.exitCode = 1;
});