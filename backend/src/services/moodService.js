"use strict";

const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");
const { unseal } = require("./privateFields");

const moods = db.collection("moods");

const validId = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]{16,128}$/.test(value);

const validBase64 = value =>
  typeof value === "string" &&
  value.length > 0 &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(value);

function validEnvelope(value) {
  return (
    value?.v === 1 &&
    validBase64(value.iv) &&
    validBase64(value.ct) &&
    value.iv.length <= 24 &&
    value.ct.length <= 30000
  );
}

function inputError(message) {
  return Object.assign(
    new Error(message),
    { status: 400 }
  );
}

async function requireVault(userId) {
  const vault = await db
    .collection("privateVaults")
    .doc(userId)
    .get();

  if (!vault.exists) {
    throw Object.assign(
      new Error("Unlock or create your private vault first."),
      { status: 409 }
    );
  }
}

function serialize(doc) {
  const data = doc.data();

  const common = {
    id: doc.id,
    createdAt: data.createdAt
  };

  if (data.privacyVersion === 2) {
    if (!validEnvelope(data.e2ee)) {
      throw new Error("Invalid encrypted mood record.");
    }

    return {
      ...common,
      privacyVersion: 2,
      e2ee: data.e2ee
    };
  }

  if (data.privacyVersion !== 1) {
    throw new Error("Unsupported mood privacy version.");
  }

  // Old data is returned only through the authenticated
  // owner's endpoint, for explicit migration.
  const legacy = unseal(
    data,
    "moods",
    data.userId,
    ["mood", "note", "intensity"]
  );

  return {
    ...common,
    ...legacy,
    legacy: true,
    privacyVersion: 1
  };
}

async function createMood({ userId, id, e2ee }) {
  if (!userId || !validId(id) || !validEnvelope(e2ee)) {
    throw inputError(
      "Only valid device-encrypted mood entries are accepted."
    );
  }

  await requireVault(userId);

  const createdAt = new Date();

  await moods.doc(id).create({
    userId,
    privacyVersion: 2,
    e2ee,
    createdAt
  });

  return {
    id,
    privacyVersion: 2,
    e2ee,
    createdAt
  };
}

async function getUserMoods(userId) {
  const snapshot = await moods
    .where("userId", "==", userId)
    .get();

  return snapshot.docs
    .map(serialize)
    .sort((a, b) => {
      const first = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const second = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);

      return second - first;
    });
}

async function updateMood(moodId, userId, e2ee) {
  if (!validId(moodId) || !validEnvelope(e2ee)) {
    throw inputError("Invalid encrypted mood update.");
  }

  const ref = moods.doc(moodId);

  await db.runTransaction(async transaction => {
    const doc = await transaction.get(ref);

    if (!doc.exists || doc.data().userId !== userId) {
      throw Object.assign(
        new Error("Mood entry not found."),
        { status: 404 }
      );
    }

    if (doc.data().privacyVersion !== 2) {
      throw Object.assign(
        new Error("Migrate the old mood entry before editing it."),
        { status: 409 }
      );
    }

    transaction.update(ref, {
      e2ee,
      updatedAt: new Date()
    });
  });

  return serialize(await ref.get());
}

async function migrateMood(moodId, userId, e2ee) {
  if (!validId(moodId) || !validEnvelope(e2ee)) {
    throw inputError("Invalid encrypted migration.");
  }

  await requireVault(userId);

  const ref = moods.doc(moodId);

  await db.runTransaction(async transaction => {
    const doc = await transaction.get(ref);

    if (!doc.exists || doc.data().userId !== userId) {
      throw Object.assign(
        new Error("Mood entry not found."),
        { status: 404 }
      );
    }

    const old = doc.data();

    if (
      old.privacyVersion !== 1 ||
      !old.privateData
    ) {
      throw Object.assign(
        new Error("Entry is not an unmigrated legacy mood."),
        { status: 409 }
      );
    }

    transaction.update(ref, {
      privacyVersion: 2,
      e2ee,
      updatedAt: new Date(),
      legacyMigratedAt: new Date(),

      privateData: FieldValue.delete(),
      mood: FieldValue.delete(),
      note: FieldValue.delete(),
      intensity: FieldValue.delete()
    });
  });

  return true;
}

async function deleteMood(moodId, userId) {
  if (!validId(moodId)) {
    throw inputError("Invalid mood ID.");
  }

  const ref = moods.doc(moodId);
  const doc = await ref.get();

  if (!doc.exists || doc.data().userId !== userId) {
    throw Object.assign(
      new Error("Mood entry not found."),
      { status: 404 }
    );
  }

  await ref.delete();

  return true;
}

module.exports = {
  createMood,
  getUserMoods,
  updateMood,
  migrateMood,
  deleteMood
};