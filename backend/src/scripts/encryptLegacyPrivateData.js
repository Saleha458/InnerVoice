
"use strict";

// =====================================================
// INNERVOICE — LEGACY DATA ENCRYPTION MIGRATION
//
// Dry run (no database changes):
// node src/scripts/encryptLegacyPrivateData.js
//
// Apply migration:
// node src/scripts/encryptLegacyPrivateData.js --apply
//
// IMPORTANT:
// 1. Take a verified Firestore backup first.
// 2. Stop the backend before applying.
// 3. Keep your existing ENCRYPTION_KEY unchanged.
// =====================================================

// Load environment variables from backend/.env

require("dotenv").config({
  path: require("node:path").join(
    __dirname,
    "../../.env"
  ),
});

// Correct imports for backend/src/scripts/

const { db } = require("../config/firebase");

const {
  FieldValue,
} = require("firebase-admin/firestore");

const {
  seal,
} = require("../services/privateFields");

// =====================================================
// CONFIGURATION
// =====================================================

const APPLY = process.argv.includes("--apply");

const BATCH_SIZE = 150;

// Collections containing legacy plaintext fields

const JOBS = [
  {
    collection: "moods",
    owner: "userId",
    fields: [
      "mood",
      "note",
      "intensity",
    ],
  },

  {
    collection: "reports",
    owner: "reporterId",
    fields: [
      "category",
      "description",
      "severity",
    ],
  },

  {
    collection: "crisisAlerts",
    owner: "userId",
    fields: [
      "message",
      "reason",
    ],
  },

  {
    collection: "journals",
    owner: "userId",
    fields: [
      "title",
      "mood",
    ],
  },
];

// =====================================================
// MIGRATE ONE COLLECTION
// =====================================================

async function migrate(job) {
  let cursor = null;

  let scanned = 0;
  let migrated = 0;
  let encrypted = 0;

  while (true) {
    let query = db
      .collection(job.collection)
      .orderBy("__name__")
      .limit(BATCH_SIZE);

    // Continue after the previous batch.

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();

    let count = 0;

    for (const doc of snapshot.docs) {
      scanned++;

      const data = doc.data();

      // =============================================
      // SKIP ALREADY ENCRYPTED RECORDS
      // =============================================

      if (data.privateData) {
        // Reject unsupported or mixed formats.

        if (
          data.privacyVersion !== 1 ||
          job.fields.some(
            (field) => data[field] !== undefined
          )
        ) {
          throw new Error(
            `${job.collection}/${doc.id}: ` +
            "Mixed or unsupported privacy format. " +
            "Inspect this record manually."
          );
        }

        encrypted++;

        continue;
      }

      // =============================================
      // VALIDATE RECORD OWNER
      // =============================================

      const ownerId = data[job.owner];

      if (
        typeof ownerId !== "string" ||
        !ownerId
      ) {
        throw new Error(
          `${job.collection}/${doc.id}: ` +
          "Missing owner. Migration aborted."
        );
      }

      // =============================================
      // EXTRACT PRIVATE FIELDS
      // =============================================

      const plain = Object.fromEntries(
        job.fields.map((field) => [
          field,

          data[field] === undefined
            ? null
            : data[field],
        ])
      );

      // =============================================
      // ENCRYPT PRIVATE FIELDS
      // =============================================

      const patch = {
        ...seal(
          plain,
          job.collection,
          ownerId
        ),
      };

      // Remove legacy plaintext fields.

      for (const field of job.fields) {
        patch[field] = FieldValue.delete();
      }

      // =============================================
      // ADD WRITES ONLY IN APPLY MODE
      // =============================================

      if (APPLY) {
        batch.update(doc.ref, patch);

        count++;
      }

      migrated++;
    }

    // ===============================================
    // COMMIT BATCH
    // ===============================================

    if (APPLY && count > 0) {
      await batch.commit();
    }

    // Move pagination cursor forward.

    cursor =
      snapshot.docs[snapshot.docs.length - 1];

    // ===============================================
    // PROGRESS
    // ===============================================

    console.log(
      `${job.collection}: ` +
      `scanned=${scanned} ` +
      `${APPLY ? "migrated" : "would_migrate"}=${migrated} ` +
      `already_encrypted=${encrypted}`
    );
  }

  console.log(
    `Finished collection: ${job.collection}`
  );
}

// =====================================================
// EXECUTE MIGRATION
// =====================================================

(async () => {
  // Check encryption key before processing.

  if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
      "ENCRYPTION_KEY is missing from backend/.env"
    );
  }

  if (APPLY) {
    console.log(
      "APPLY MODE: Firestore records will be modified."
    );

    console.log(
      "Ensure the backend is stopped and a verified backup exists."
    );
  } else {
    console.log(
      "DRY RUN MODE: No Firestore writes will be performed."
    );
  }

  // Process collections one by one.

  for (const job of JOBS) {
    await migrate(job);
  }

  console.log(
    "Migration finished. Verify Firestore records and existing UI functionality."
  );
})().catch((error) => {
  console.error(
    "Migration stopped:",
    error.message
  );

  process.exitCode = 1;
});