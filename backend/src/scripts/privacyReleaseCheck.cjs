"use strict";

const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, "../.env"),
  quiet: true
});

const {
  db
} = require("../src/config/firebase");

const root =
  path.resolve(__dirname, "../..");

const required = [
  "backend/src/services/notificationPolicy.js",
  "backend/src/services/notificationService.js",
  "backend/src/routes/notifications.js",
  "backend/src/services/accountPrivacyCleanup.js",
  "backend/src/routes/privateVault.js",
  "frontend/src/services/privateVault.js",
  "frontend/public/vault-recovery.html"
];

let errors = 0;

for (const name of required) {
  if (
    !fs.existsSync(
      path.join(root, name)
    )
  ) {
    console.log("MISSING_FILE:", name);
    errors++;
  }
}

const config = [
  "ENCRYPTION_KEY",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];

for (const key of config) {
  if (!process.env[key]) {
    console.log("MISSING_ENV:", key);
    errors++;
  }
}

if (
  process.env.AI_PROVIDER !== "gemini"
) {
  console.log(
    "REVIEW: AI_PROVIDER is not explicitly gemini."
  );
}

if (
  !process.env.CLIENT_URL?.startsWith("https://")
) {
  console.log(
    "REVIEW: CLIENT_URL is not an HTTPS production origin."
  );
}

const has = (object, key) =>
  Object.prototype.hasOwnProperty.call(
    object,
    key
  );

async function scan(name, check) {
  let cursor = null;

  const count = {
    total: 0,
    device: 0,
    legacy: 0,
    invalid: 0
  };

  for (;;) {
    let query = db
      .collection(name)
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
      count.total++;

      try {
        const state = check(
          doc.data()
        );

        count[state]++;
      } catch {
        count.invalid++;
      }
    }

    cursor = page.docs.at(-1);
  }

  console.log(
    `${name}: total=${count.total} ` +
    `device=${count.device} ` +
    `legacy=${count.legacy} ` +
    `invalid=${count.invalid}`
  );

  errors +=
    count.invalid + count.legacy;

  return count;
}

const box = envelope =>
  envelope?.v === 1 &&
  typeof envelope.iv === "string" &&
  typeof envelope.ct === "string";

function standard(
  data,
  forbidden,
  chat = false
) {
  if (data.privacyVersion !== 2) {
    return "legacy";
  }

  const ciphertext = chat
    ? (
        data.e2ee?.v === 1 &&
        box(data.e2ee.sender) &&
        box(data.e2ee.receiver)
      )
    : box(data.e2ee);

  if (
    !ciphertext ||
    forbidden.some(
      key => has(data, key)
    )
  ) {
    throw Error("Invalid encrypted record");
  }

  return "device";
}

async function main() {
  for (
    const name of [
      "moods",
      "journals",
      "reports",
      "messages"
    ]
  ) {
    const forbidden =
      name === "moods"
        ? [
            "mood",
            "note",
            "intensity",
            "privateData",
            "encryptedData",
            "iv",
            "authTag"
          ]
        : name === "journals"
          ? [
              "title",
              "mood",
              "content",
              "privateData",
              "encryptedData",
              "iv",
              "authTag"
            ]
          : name === "reports"
            ? [
                "category",
                "severity",
                "description",
                "privateData",
                "encryptedData",
                "iv",
                "authTag"
              ]
            : [
                "message",
                "audio",
                "content",
                "encryptedData",
                "iv",
                "authTag"
              ];

    await scan(
      name,
      data => standard(
        data,
        forbidden,
        name === "messages" ||
        name === "reports"
      )
    );
  }

  const {
    sanitizeNotification
  } = require(
    "../src/services/notificationPolicy"
  );

  await scan(
    "notifications",
    data => {
      if (
        data.privacyVersion !== 2
      ) {
        return "legacy";
      }

      const safe =
        sanitizeNotification(data);

      if (
        data.title !== safe.title ||
        data.message !== safe.message ||
        JSON.stringify(data.data || {}) !==
          JSON.stringify(safe.data)
      ) {
        throw Error(
          "Sensitive notification"
        );
      }

      // This means sanitized, NOT E2EE.
      return "device";
    }
  );

  const alerts = await db
    .collection("crisisAlerts")
    .get();

  console.log(
    `crisisAlerts: retained=${alerts.size}`
  );

  // Existing server-readable alerts require
  // a documented retention/deletion decision.
  errors += alerts.size;

  const conversations = await db
    .collection("aiConversations")
    .get();

  const ai = {
    total: 0,
    legacy: 0,
    device: 0,
    invalid: 0
  };

  for (
    const conversation
    of conversations.docs
  ) {
    let cursor = null;

    for (;;) {
      let query = conversation.ref
        .collection("messages")
        .orderBy("__name__")
        .limit(100);

      if (cursor) {
        query = query.startAfter(cursor);
      }

      const page = await query.get();

      if (page.empty) break;

      for (const message of page.docs) {
        ai.total++;

        try {
          const state = standard(
            message.data(),
            [
              "content",
              "text",
              "encryptedData",
              "iv",
              "authTag"
            ]
          );

          ai[state]++;
        } catch {
          ai.invalid++;
        }
      }

      cursor = page.docs.at(-1);
    }
  }

  console.log(
    "ai_messages:",
    JSON.stringify(ai)
  );

  errors +=
    ai.legacy + ai.invalid;

  const experts = await db
    .collection("experts")
    .get();

  let publicDocs = 0;
  let unknownDocs = 0;

  for (const doc of experts.docs) {
    const data = doc.data();

    if (
      data.licenseImageType ===
        "authenticated" &&
      data.licenseImagePublicId
    ) {
      continue;
    }

    if (
      data.licenseImagePublicId ||
      data.licenseImageUrl
    ) {
      if (
        String(
          data.licenseImageUrl || ""
        ).includes("/image/upload/")
      ) {
        publicDocs++;
      } else {
        unknownDocs++;
      }
    }
  }

  console.log(
    `expert_documents: public=${publicDocs} review=${unknownDocs}`
  );

  errors +=
    publicDocs + unknownDocs;

  console.log(
    errors
      ? `NOT READY: ${errors} unresolved findings. Do not launch publicly.`
      : "STRUCTURAL CHECK CLEAN. Live role, decryption, safety, recovery, backups and phone tests are STILL required."
  );

  if (errors) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(
    "Release check failed:",
    error.code || error.name
  );

  process.exitCode = 1;
});