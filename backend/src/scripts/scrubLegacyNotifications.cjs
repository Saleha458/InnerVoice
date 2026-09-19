"use strict";

const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, "../.env"),
  quiet: true
});

const { db } = require("../src/config/firebase");

const {
  sanitizeNotification
} = require("../src/services/notificationPolicy");

const apply = process.argv.includes("--apply");

async function main() {
  let cursor = null;
  let scanned = 0;
  let need = 0;
  let updated = 0;

  for (;;) {
    let query = db
      .collection("notifications")
      .orderBy("__name__")
      .limit(100);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const page = await query.get();

    if (page.empty) break;

    for (const doc of page.docs) {
      scanned++;

      const raw = doc.data();
      const safe = sanitizeNotification(raw);

      const dirty =
        raw.privacyVersion !== 2 ||
        raw.title !== safe.title ||
        raw.message !== safe.message ||
        JSON.stringify(raw.data || {}) !==
          JSON.stringify(safe.data) ||
        raw.type !== safe.type;

      if (!dirty) continue;

      need++;

      if (apply) {
        // No merge: remove old sensitive fields.
        await doc.ref.set({
          userId: raw.userId,
          ...safe,
          read: Boolean(raw.read),

          createdAt:
            raw.createdAt || new Date(),

          privacyVersion: 2
        });

        updated++;
      }
    }

    cursor = page.docs.at(-1);
  }

  console.log(
    JSON.stringify({
      mode: apply ? "APPLY" : "DRY_RUN",
      scanned,
      needsScrub: need,
      updated
    })
  );
}

main().catch(error => {
  console.error(
    "Notification scrub failed:",
    error.code || error.name
  );

  process.exitCode = 1;
});