"use strict";

// Read-only check:
// No migration, deletion, database writes, or private-text output.

const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
  quiet: true
});

const root = path.resolve(__dirname, "..");

const expectedFiles = [
  "backend/src/routes/privateVault.js",
  "backend/src/routes/journal.js",
  "backend/src/services/journalService.js",
  "backend/src/routes/messages.js",
  "backend/src/services/socketService.js",
  "backend/src/routes/ai.js",
  "frontend/src/services/privateVault.js",
  "frontend/src/services/journalService.js",
  "frontend/src/pages/journal/Journal.jsx",
  "frontend/src/pages/journal/JournalEntry.jsx",
  "frontend/src/pages/chat/ExpertChat.jsx",
  "frontend/src/pages/chat/AIChat.jsx"
];

const missing = expectedFiles.filter(name =>
  !fs.existsSync(path.join(root, name))
);

if (missing.length) {
  console.log("E2EE files missing:");

  for (const name of missing) {
    console.log(`  ${name}`);
  }

  process.exit(1);
}

const app = fs.readFileSync(
  path.join(root, "backend/src/app.js"),
  "utf8"
);

if (
  !app.includes('"/api/private-vault"') &&
  !app.includes("'/api/private-vault'")
) {
  console.error(
    "FAIL: /api/private-vault is not mounted in backend/src/app.js"
  );

  process.exit(1);
}

console.log(
  "E2EE file/route presence: PASS (not a security audit)"
);

const { db } = require("./src/config/firebase");

const own = (item, key) =>
  Object.prototype.hasOwnProperty.call(item, key);

const b64 = value =>
  typeof value === "string" &&
  value.length > 0 &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const sealed = value =>
  value?.v === 1 &&
  b64(value.iv) &&
  b64(value.ct);

async function scan(query, type) {
  const counts = {
    total: 0,
    new: 0,
    old: 0,
    invalid: 0
  };

  let cursor = null;

  for (;;) {
    let page = query
      .orderBy("__name__")
      .limit(100);

    if (cursor) {
      page = page.startAfter(cursor);
    }

    const snapshot = await page.get();

    if (snapshot.empty) break;

    for (const document of snapshot.docs) {
      counts.total++;

      const data = document.data();

      if (data.privacyVersion !== 2) {
        counts.old++;
        continue;
      }

      const forbidden =
        type === "journal"
          ? [
              "title",
              "content",
              "mood",
              "privateData",
              "encryptedData",
              "iv",
              "authTag"
            ]
          : type === "expert"
            ? [
                "message",
                "audio",
                "content",
                "transcript",
                "encryptedData",
                "iv",
                "authTag"
              ]
            : [
                "content",
                "text",
                "message",
                "prompt",
                "response",
                "encryptedData",
                "iv",
                "authTag"
              ];

      const noPlaintext = forbidden.every(
        field => !own(data, field)
      );

      const validEnvelope =
        type === "expert"
          ? (
              data.e2ee?.v === 1 &&
              b64(data.e2ee.epk) &&
              b64(data.e2ee.salt) &&
              sealed(data.e2ee.sender) &&
              sealed(data.e2ee.receiver)
            )
          : sealed(data.e2ee);

      if (noPlaintext && validEnvelope) {
        counts.new++;
      } else {
        counts.invalid++;
      }
    }

    cursor = snapshot.docs[
      snapshot.docs.length - 1
    ];
  }

  return counts;
}

async function main() {
  const journal = await scan(
    db.collection("journals"),
    "journal"
  );

  const expert = await scan(
    db.collection("messages"),
    "expert"
  );

  const ai = {
    total: 0,
    new: 0,
    old: 0,
    invalid: 0
  };

  let cursor = null;

  for (;;) {
    let page = db
      .collection("aiConversations")
      .orderBy("__name__")
      .limit(100);

    if (cursor) {
      page = page.startAfter(cursor);
    }

    const snapshot = await page.get();

    if (snapshot.empty) break;

    for (const conversation of snapshot.docs) {
      const part = await scan(
        conversation.ref.collection("messages"),
        "ai"
      );

      for (const key of Object.keys(ai)) {
        ai[key] += part[key];
      }
    }

    cursor = snapshot.docs[
      snapshot.docs.length - 1
    ];
  }

  const items = [
    ["journal", journal],
    ["expert_chat", expert],
    ["saved_ai_history", ai]
  ];

  let ready = true;

  for (const [name, result] of items) {
    console.log(
      `${name}: total=${result.total} ` +
      `device_encrypted=${result.new} ` +
      `server_decryptable=${result.old} ` +
      `invalid=${result.invalid}`
    );

    if (
      !result.new ||
      result.old ||
      result.invalid
    ) {
      ready = false;
    }
  }

  console.log(
    ready
      ? "TARGETED STORAGE CHECK: PASS (structure only; not an E2EE certification)"
      : "TARGETED STORAGE CHECK: NOT READY. Create one NEW record in each feature; migrate old data only after a verified backup and device-recovery test."
  );

  console.log(
    "NOTE: Moods, reports, crisis alerts, attachments, recovery, key authenticity and backups remain outside this check."
  );

  if (!ready) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(
    "Readiness check could not complete:",
    error?.code ||
      error?.name ||
      "error"
  );

  process.exitCode = 1;
});