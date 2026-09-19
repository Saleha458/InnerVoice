"use strict";

require("dotenv").config({
  path: require("node:path").join(__dirname, "../../.env"),
});

const { db } = require("../config/firebase");
const { encrypt, decrypt } = require("../services/encryptionService");
const { unseal } = require("../services/privateFields");

const jobs = [
  ["moods", "userId", ["mood", "note", "intensity"]],
  ["reports", "reporterId", ["category", "description", "severity"]],
  ["crisisAlerts", "userId", ["message", "reason"]],
  ["journals", "userId", ["title", "mood"]],
];

const has = (data, field) =>
  Object.prototype.hasOwnProperty.call(data, field);

function checkEnvelope(data) {
  for (const name of ["encryptedData", "iv", "authTag"]) {
    if (typeof data?.[name] !== "string") {
      throw new Error("Missing ciphertext field");
    }
  }

  if (
    typeof decrypt(
      data.encryptedData,
      data.iv,
      data.authTag
    ) !== "string"
  ) {
    throw new Error("Invalid decrypted content");
  }
}

async function scan(query, examine) {
  let cursor = null;
  let total = 0;
  let failed = 0;

  while (true) {
    let page = query.orderBy("__name__").limit(150);

    if (cursor) {
      page = page.startAfter(cursor);
    }

    const snapshot = await page.get();

    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      total++;

      try {
        await examine(doc);
      } catch {
        failed++;
      }
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
  }

  return { total, failed };
}

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
      "ENCRYPTION_KEY not loaded. Do not generate a replacement."
    );
  }

  const probe = encrypt(
    "privacy-check",
    "innervoice:audit"
  );

  if (
    decrypt(
      probe.encryptedData,
      probe.iv,
      probe.authTag,
      "innervoice:audit"
    ) !== "privacy-check"
  ) {
    throw new Error("AES-GCM round-trip failed");
  }

  let rejected = false;

  try {
    decrypt(
      probe.encryptedData,
      probe.iv,
      "00".repeat(16),
      "innervoice:audit"
    );
  } catch {
    rejected = true;
  }

  if (!rejected) {
    throw new Error("AES-GCM tamper check failed");
  }

  console.log("AES-GCM round-trip / tamper check: PASS");

  let failures = 0;

  for (const [collection, owner, fields] of jobs) {
    const result = await scan(
      db.collection(collection),
      (doc) => {
        const data = doc.data();

        if (
          !data[owner] ||
          !data.privateData ||
          data.privacyVersion !== 1
        ) {
          throw new Error("Missing private envelope");
        }

        if (fields.some((field) => has(data, field))) {
          throw new Error("Plaintext private field");
        }

        unseal(
          data,
          collection,
          data[owner],
          fields
        );

        if (collection === "journals") {
          checkEnvelope(data);
        }
      }
    );

    failures += result.failed;

    console.log(
      `${collection}: scanned=${result.total} failures=${result.failed}`
    );
  }

  const chat = await scan(
    db.collection("messages"),
    (doc) => {
      const data = doc.data();

      if (
        [
          "text",
          "message",
          "audio",
          "content",
          "transcript"
        ].some((field) => has(data, field))
      ) {
        throw new Error("Plaintext chat field");
      }

      if (!data.sessionId || !data.senderId) {
        throw new Error("Missing chat metadata");
      }

      checkEnvelope(data);
    }
  );

  failures += chat.failed;

  console.log(
    `expert_messages: scanned=${chat.total} failures=${chat.failed}`
  );

  let aiMessages = 0;
  let aiFailures = 0;

  const conversations = await scan(
    db.collection("aiConversations"),
    async (conversation) => {
      const parent = conversation.data();

      if (!parent.userId) {
        throw new Error("Conversation has no owner");
      }

      const result = await scan(
        conversation.ref.collection("messages"),
        (doc) => {
          const data = doc.data();

          if (
            [
              "text",
              "message",
              "content",
              "prompt",
              "response"
            ].some((field) => has(data, field))
          ) {
            throw new Error("Plaintext AI chat field");
          }

          if (
            !["user", "assistant"].includes(data.role)
          ) {
            throw new Error("Unexpected AI role");
          }

          checkEnvelope(data);
        }
      );

      aiMessages += result.total;
      aiFailures += result.failed;
    }
  );

  failures += conversations.failed + aiFailures;

  console.log(
    `ai_conversations: scanned=${conversations.total} owner_failures=${conversations.failed}`
  );

  console.log(
    `ai_messages: scanned=${aiMessages} failures=${aiFailures}`
  );

  if (failures) {
    throw new Error(
      `${failures} issues found. Inspect privately before deploying.`
    );
  }

  console.log(
    "PASS: scanned ciphertext fields are decryptable and have no named plaintext duplicates."
  );

  console.log(
    "LIMIT: This is NOT an E2EE, access-control, Cloudinary, notification, logs, or backup audit."
  );
}

main().catch((error) => {
  console.error(
    "Privacy audit FAILED:",
    error.message
  );

  process.exitCode = 1;
});