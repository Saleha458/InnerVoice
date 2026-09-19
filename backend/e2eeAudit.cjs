"use strict";

const path = require("node:path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
  quiet: true
});

const { db } = require("./src/config/firebase");

const {
  decrypt
} = require("./src/services/encryptionService");

const {
  unseal
} = require("./src/services/privateFields");

const has = (object, name) =>
  Object.prototype.hasOwnProperty.call(object, name);

const isBase64 = value =>
  typeof value === "string" &&
  value.length > 0 &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(value);

function isEnvelope(value) {
  return (
    value?.v === 1 &&
    isBase64(value.iv) &&
    Buffer.from(value.iv, "base64").length === 12 &&
    isBase64(value.ct) &&
    Buffer.from(value.ct, "base64").length > 16
  );
}

function isChatEnvelope(value) {
  return (
    value?.v === 1 &&
    isBase64(value.epk) &&
    isBase64(value.salt) &&
    isEnvelope(value.sender) &&
    isEnvelope(value.receiver)
  );
}

function rejectFields(data, fields) {
  for (const field of fields) {
    if (has(data, field)) {
      throw new Error(
        "Unexpected readable or server-encrypted field"
      );
    }
  }
}

function checkLegacyCipher(data) {
  if (
    typeof data.encryptedData !== "string" ||
    typeof data.iv !== "string" ||
    typeof data.authTag !== "string"
  ) {
    throw new Error(
      "Missing old encryption fields"
    );
  }

  decrypt(
    data.encryptedData,
    data.iv,
    data.authTag
  );
}

async function scan(query, examine) {
  const counts = {
    total: 0,
    deviceEncrypted: 0,
    serverEncrypted: 0,
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

    if (snapshot.empty) {
      break;
    }

    for (const doc of snapshot.docs) {
      counts.total++;

      try {
        const result = await examine(
          doc.data(),
          doc
        );

        if (result === "device") {
          counts.deviceEncrypted++;
        } else if (result === "server") {
          counts.serverEncrypted++;
        } else {
          throw new Error(
            "Unexpected audit result"
          );
        }
      } catch {
        counts.invalid++;
      }
    }

    cursor = snapshot.docs[
      snapshot.docs.length - 1
    ];
  }

  return counts;
}

function checkDeviceRecord(data, forbidden) {
  if (
    data.privacyVersion !== 2 ||
    !isEnvelope(data.e2ee)
  ) {
    throw new Error(
      "Invalid device-encrypted record"
    );
  }

  rejectFields(data, forbidden);

  return "device";
}

function checkServerRecord(
  data,
  collection,
  ownerField,
  privateFields
) {
  if (
    data.privacyVersion !== 1 ||
    !data[ownerField] ||
    !data.privateData
  ) {
    throw new Error(
      "Invalid old encrypted record"
    );
  }

  unseal(
    data,
    collection,
    data[ownerField],
    privateFields
  );

  rejectFields(data, privateFields);

  return "server";
}

function checkMood(data) {
  if (data.privacyVersion === 2) {
    if (!data.userId) {
      throw new Error(
        "Mood owner missing"
      );
    }

    return checkDeviceRecord(data, [
      "mood",
      "note",
      "intensity",
      "privateData",
      "encryptedData",
      "iv",
      "authTag"
    ]);
  }

  return checkServerRecord(
    data,
    "moods",
    "userId",
    ["mood", "note", "intensity"]
  );
}

function checkJournal(data) {
  if (data.privacyVersion === 2) {
    if (!data.userId) {
      throw new Error(
        "Journal owner missing"
      );
    }

    return checkDeviceRecord(data, [
      "title",
      "mood",
      "content",
      "privateData",
      "encryptedData",
      "iv",
      "authTag"
    ]);
  }

  checkServerRecord(
    data,
    "journals",
    "userId",
    ["title", "mood"]
  );

  checkLegacyCipher(data);

  rejectFields(data, ["content"]);

  return "server";
}

function checkExpertMessage(data) {
  if (data.privacyVersion === 2) {
    if (
      !data.sessionId ||
      !data.senderId ||
      !data.receiverId ||
      !["text", "voice"].includes(data.type) ||
      !isChatEnvelope(data.e2ee)
    ) {
      throw new Error(
        "Invalid encrypted expert message"
      );
    }

    rejectFields(data, [
      "message",
      "audio",
      "content",
      "transcript",
      "encryptedData",
      "iv",
      "authTag"
    ]);

    return "device";
  }

  checkLegacyCipher(data);

  rejectFields(data, [
    "message",
    "audio",
    "content",
    "transcript"
  ]);

  return "server";
}

function checkAiMessage(data) {
  if (data.privacyVersion === 2) {
    if (
      !["user", "assistant"].includes(data.role)
    ) {
      throw new Error(
        "Invalid AI message role"
      );
    }

    return checkDeviceRecord(data, [
      "content",
      "text",
      "message",
      "prompt",
      "response",
      "encryptedData",
      "iv",
      "authTag"
    ]);
  }

  checkLegacyCipher(data);

  rejectFields(data, [
    "content",
    "text",
    "message",
    "prompt",
    "response"
  ]);

  return "server";
}

async function main() {
  let invalidTotal = 0;
  let serverDecryptableTotal = 0;

  function show(name, counts) {
    console.log(
      `${name}: scanned=${counts.total} ` +
      `device_encrypted=${counts.deviceEncrypted} ` +
      `server_encrypted=${counts.serverEncrypted} ` +
      `invalid=${counts.invalid}`
    );

    invalidTotal += counts.invalid;

    serverDecryptableTotal +=
      counts.serverEncrypted;
  }

  const moods = await scan(
    db.collection("moods"),
    checkMood
  );

  show("moods", moods);

  const journals = await scan(
    db.collection("journals"),
    checkJournal
  );

  show("journals", journals);

  const expertMessages = await scan(
    db.collection("messages"),
    checkExpertMessage
  );

  show("expert_messages", expertMessages);

  const aiCounts = {
    total: 0,
    deviceEncrypted: 0,
    serverEncrypted: 0,
    invalid: 0
  };

  const conversations = await scan(
    db.collection("aiConversations"),

    async (data, doc) => {
      if (!data.userId) {
        throw new Error(
          "AI conversation owner missing"
        );
      }

      const part = await scan(
        doc.ref.collection("messages"),
        checkAiMessage
      );

      for (const key of Object.keys(aiCounts)) {
        aiCounts[key] += part[key];
      }

      return data.privacyVersion === 2
        ? "device"
        : "server";
    }
  );

  show("ai_messages", aiCounts);

  console.log(
    `ai_conversations: scanned=${conversations.total} ` +
    `invalid=${conversations.invalid}`
  );

  invalidTotal += conversations.invalid;

  const serverCollections = [
    [
      "reports",
      "reporterId",
      ["category", "description", "severity"]
    ],
    [
      "crisisAlerts",
      "userId",
      ["message", "reason"]
    ]
  ];

  for (
    const [name, ownerField, fields]
    of serverCollections
  ) {
    const counts = await scan(
      db.collection(name),

      data => checkServerRecord(
        data,
        name,
        ownerField,
        fields
      )
    );

    show(name, counts);
  }

  console.log(
    `TOTAL: invalid=${invalidTotal} ` +
    `server_decryptable=${serverDecryptableTotal}`
  );

  console.log(
    "LIMIT: Structural audit only. It cannot prove key authenticity, true E2EE, backup deletion, access control, or AI-provider privacy."
  );

  if (invalidTotal > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(
    "E2EE audit could not finish:",
    error?.code ||
    error?.name ||
    "unknown"
  );

  process.exitCode = 1;
});