"use strict";

const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const {
  decrypt
} = require("./encryptionService");

const {
  unseal
} = require("./privateFields");

const journals = db.collection("journals");

const validId = id =>
  typeof id === "string" &&
  /^[A-Za-z0-9_-]{16,128}$/.test(id);

const b64 = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9+/=]+$/.test(value);

function validEnvelope(value) {
  return (
    value &&
    value.v === 1 &&
    b64(value.iv) &&
    value.iv.length <= 24 &&
    b64(value.ct) &&
    value.ct.length > 20 &&
    value.ct.length <= 180000
  );
}

function publicRecord(doc) {
  const data = doc.data();

  if (
    data.privacyVersion === 2 &&
    data.e2ee
  ) {
    return {
      id: doc.id,
      e2ee: data.e2ee,
      privacyVersion: 2,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  // Only the authenticated owner can request
  // the old format for explicit migration.

  const meta = unseal(
    data,
    "journals",
    data.userId,
    ["title", "mood"]
  );

  return {
    id: doc.id,
    legacy: true,
    title: meta.title || "Untitled",
    mood: meta.mood || "",
    content: decrypt(
      data.encryptedData,
      data.iv,
      data.authTag
    ),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

async function createEntry(
  uid,
  {
    id,
    e2ee,
    ...rest
  } = {}
) {
  if (
    !validId(id) ||
    !validEnvelope(e2ee) ||
    Object.keys(rest).length
  ) {
    const error = new Error(
      "Only client-encrypted journal entries are accepted."
    );

    error.status = 400;
    throw error;
  }

  const vault = await db
    .collection("privateVaults")
    .doc(uid)
    .get();

  if (!vault.exists) {
    const error = new Error(
      "Set up your private vault first."
    );

    error.status = 409;
    throw error;
  }

  const now = new Date();

  await journals.doc(id).create({
    userId: uid,
    privacyVersion: 2,
    e2ee,
    createdAt: now,
    updatedAt: now
  });

  return {
    id,
    privacyVersion: 2,
    e2ee,
    createdAt: now,
    updatedAt: now
  };
}

async function listEntries(uid) {
  const snapshot = await journals
    .where("userId", "==", uid)
    .get();

  return snapshot.docs
    .map(publicRecord)
    .sort(
      (a, b) =>
        new Date(
          b.createdAt?.toDate?.() ||
          b.createdAt ||
          0
        ) -
        new Date(
          a.createdAt?.toDate?.() ||
          a.createdAt ||
          0
        )
    );
}

async function migrateEntry(uid, id, e2ee) {
  if (
    !validId(id) ||
    !validEnvelope(e2ee)
  ) {
    const error = new Error(
      "Invalid encrypted journal migration."
    );

    error.status = 400;
    throw error;
  }

  const ref = journals.doc(id);

  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);

    if (
      !snapshot.exists ||
      snapshot.data().userId !== uid
    ) {
      const error = new Error(
        "Journal entry not found."
      );

      error.status = 404;
      throw error;
    }

    const old = snapshot.data();

    if (
      old.privacyVersion === 2 ||
      old.e2ee
    ) {
      const error = new Error(
        "Journal entry was already migrated."
      );

      error.status = 409;
      throw error;
    }

    transaction.update(ref, {
      privacyVersion: 2,
      e2ee,
      updatedAt: new Date(),

      encryptedData: FieldValue.delete(),
      iv: FieldValue.delete(),
      authTag: FieldValue.delete(),
      privateData: FieldValue.delete(),

      title: FieldValue.delete(),
      content: FieldValue.delete(),
      mood: FieldValue.delete(),

      legacyMigratedAt: new Date()
    });
  });

  return true;
}

async function deleteEntry(uid, id) {
  if (!validId(id)) {
    const error = new Error(
      "Invalid journal ID."
    );

    error.status = 400;
    throw error;
  }

  const ref = journals.doc(id);
  const doc = await ref.get();

  if (
    !doc.exists ||
    doc.data().userId !== uid
  ) {
    const error = new Error(
      "Journal entry not found."
    );

    error.status = 404;
    throw error;
  }

  await ref.delete();

  return true;
}

module.exports = {
  createEntry,
  listEntries,
  migrateEntry,
  deleteEntry
};