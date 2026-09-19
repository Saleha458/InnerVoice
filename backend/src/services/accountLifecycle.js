"use strict";

// Complete replacement for backend/src/services/accountLifecycle.js.
// Preserve the original 30-day restoration policy and fail-closed purge gate.
const bcrypt = require("bcryptjs");
const cron = require("node-cron");
const { db, auth } = require("../config/firebase");
const cloudinary = require("../config/cloudinary");
const users = db.collection("users");
const jobs = db.collection("accountDeletionJobs");
const GRACE_DAYS = 30;
const LICENSE_FOLDER = "innervoice/expert-verifications/";
let io = null;
let workerRunning = false;

const fail = (status, message) => Object.assign(new Error(message), { status });

const asDate = value => {
  if (!value) return null;

  const date =
    typeof value.toDate === "function"
      ? value.toDate()
      : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

// Dangerous operations remain disabled until explicitly enabled.
function canPurge(uid) {
  if (process.env.ENABLE_ACCOUNT_PURGE !== "true") return false;

  const testUid = (process.env.ACCOUNT_PURGE_TEST_UID || "").trim();

  return testUid
    ? uid === testUid
    : process.env.ACCOUNT_PURGE_SCOPE === "all";
}

function setAccountSocketIO(instance) {
  io = instance;
}

async function verifyPassword(account, password) {
  if (
    typeof password !== "string" ||
    !password ||
    !account?.password ||
    !(await bcrypt.compare(password, account.password))
  ) {
    throw fail(401, "Incorrect password.");
  }
}

async function disableAccess(uid) {
  try {
    await auth.updateUser(uid, { disabled: true });
    await auth.revokeRefreshTokens(uid);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }
  }

  io?.in(`user:${uid}`).disconnectSockets(true);
}

async function expertDocsFor(uid, account) {
  const found = new Map();

  const snap = await db
    .collection("experts")
    .where("uid", "==", uid)
    .get();

  for (const doc of snap.docs) {
    found.set(doc.id, doc);
  }

  if (account?.expertId && !found.has(account.expertId)) {
    const doc = await db
      .collection("experts")
      .doc(account.expertId)
      .get();

    if (doc.exists && doc.data().uid === uid) {
      found.set(doc.id, doc);
    }
  }

  return [...found.values()];
}

async function queryDocs(collection, field, value) {
  if (!value) return [];

  const snap = await db
    .collection(collection)
    .where(field, "==", value)
    .get();

  return snap.docs;
}

async function deleteMatching(collection, field, value) {
  if (!value) return;

  const col = db.collection(collection);

  while (true) {
    const snap = await col
      .where(field, "==", value)
      .limit(100)
      .get();

    if (snap.empty) break;

    for (const doc of snap.docs) {
      await db.recursiveDelete(doc.ref);
    }
  }
}

async function cancelOutstandingWork(uid, expertIds = []) {
  const queries = [
    queryDocs("sessions", "userId", uid),
    queryDocs("expertRequests", "userId", uid)
  ];

  for (const expertId of expertIds) {
    queries.push(queryDocs("sessions", "expertId", expertId));
    queries.push(queryDocs("expertRequests", "expertId", expertId));
  }

  const docs = new Map();

  for (const group of await Promise.all(queries)) {
    for (const doc of group) {
      docs.set(doc.ref.path, doc);
    }
  }

  for (const doc of docs.values()) {
    if (["scheduled", "pending"].includes(doc.data().status)) {
      await doc.ref.update({
        status: "cancelled",
        cancellationReason: "A participant closed their account.",
        updatedAt: new Date()
      });
    }
  }
}

async function deactivateAccount(uid, password) {
  const ref = users.doc(uid);
  const current = await ref.get();

  if (!current.exists) {
    throw fail(404, "Account not found.");
  }

  const account = current.data();

  if (account.role === "admin") {
    throw fail(403, "Admin accounts cannot self-delete.");
  }

  if (account.status !== "active") {
    throw fail(409, "Account is not active.");
  }

  await verifyPassword(account, password);

  const deleteAfter = new Date(
    Date.now() + GRACE_DAYS * 86400000
  );

  await db.runTransaction(async tx => {
    const fresh = await tx.get(ref);

    if (!fresh.exists || fresh.data().status !== "active") {
      throw fail(409, "Account status changed. Please retry.");
    }

    tx.update(ref, {
      status: "deactivated",
      deactivatedAt: new Date(),
      deleteAfter,
      updatedAt: new Date()
    });
  });

  // Account-status middleware must also deny deactivated users.
  try {
    await disableAccess(uid);
  } catch {
    console.error("Account deactivation: Auth disable needs retry.");
  }

  try {
    const experts = await expertDocsFor(uid, account);

    for (const doc of experts) {
      await doc.ref.update({
        availableBeforeDeactivation: !!doc.data().available,
        available: false,
        updatedAt: new Date()
      });
    }

    await cancelOutstandingWork(
      uid,
      experts.map(doc => doc.id)
    );
  } catch {
    console.error("Account deactivation: booking cleanup needs retry.");
  }

  return deleteAfter;
}

async function restoreAccount(anonymousId, password) {
  const id = String(anonymousId || "").trim();

  if (!id || !password) {
    throw fail(400, "Anonymous ID and password are required.");
  }

  const found = await users
    .where("anonymousId", "==", id)
    .limit(1)
    .get();

  if (found.empty) {
    throw fail(401, "Invalid Anonymous ID or password.");
  }

  const ref = found.docs[0].ref;
  const account = found.docs[0].data();

  await verifyPassword(account, password);

  if (account.status !== "deactivated") {
    throw fail(409, "This account cannot be restored.");
  }

  const deadline = asDate(account.deleteAfter);

  if (!deadline || deadline <= new Date()) {
    throw fail(410, "The 30-day restoration period has ended.");
  }

  await auth.updateUser(ref.id, { disabled: false });

  try {
    await db.runTransaction(async tx => {
      const fresh = await tx.get(ref);

      const remaining = fresh.exists
        ? asDate(fresh.data().deleteAfter)
        : null;

      if (
        !fresh.exists ||
        fresh.data().status !== "deactivated" ||
        !remaining ||
        remaining <= new Date()
      ) {
        throw fail(409, "Account can no longer be restored.");
      }

      const { FieldValue } = require("firebase-admin/firestore");

      tx.update(ref, {
        status: "active",
        deactivatedAt: FieldValue.delete(),
        deleteAfter: FieldValue.delete(),
        updatedAt: new Date()
      });
    });
  } catch (error) {
    await disableAccess(ref.id).catch(() => {});
    throw error;
  }

  await auth.revokeRefreshTokens(ref.id);

  const experts = await expertDocsFor(ref.id, account);

  const { FieldValue } = require("firebase-admin/firestore");

  for (const doc of experts) {
    const expert = doc.data();

    await doc.ref.update({
      available:
        !!expert.availableBeforeDeactivation &&
        expert.verificationStatus === "verified",

      availableBeforeDeactivation: FieldValue.delete(),
      updatedAt: new Date()
    });
  }

  return { uid: ref.id };
}

async function queueDeletion(uid, password) {
  if (!canPurge(uid)) {
    throw fail(
      503,
      "Permanent deletion is locked. Configure a verified test UID first."
    );
  }

  const ref = users.doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    throw fail(404, "Account not found.");
  }

  const account = snap.data();

  if (account.role === "admin") {
    throw fail(403, "Admin accounts cannot self-delete.");
  }

  if (account.status !== "active") {
    throw fail(
      409,
      "Only an active account can request immediate deletion."
    );
  }

  await verifyPassword(account, password);

  await db.runTransaction(async tx => {
    const fresh = await tx.get(ref);

    if (!fresh.exists || fresh.data().status !== "active") {
      throw fail(409, "Account status changed. Please retry.");
    }

    tx.update(ref, {
      status: "deleting",
      deletionRequestedAt: new Date(),
      updatedAt: new Date()
    });

    tx.set(jobs.doc(uid), {
      uid,
      status: "pending",
      attempts: 0,
      requestedAt: new Date()
    });
  });

  try {
    await disableAccess(uid);
  } catch {
    console.error("Account deletion: Auth disable needs retry.");
  }

  return { queued: true };
}

// Only the authenticated Admin route may call this.
// Queue full cleanup; NEVER delete a users/ document directly.
async function queueAdminDeletion(uid) {
  if (!canPurge(uid)) {
    throw fail(
      503,
      "Permanent deletion is locked. Configure a verified test UID first."
    );
  }

  const ref = users.doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    throw fail(404, "Account not found.");
  }

  if (snap.data().role === "admin") {
    throw fail(403, "Admin account deletion is blocked.");
  }

  if (
    !["active", "suspended", "deactivated"].includes(
      snap.data().status
    )
  ) {
    throw fail(
      409,
      "Account already being deleted or in an unsupported state."
    );
  }

  await db.runTransaction(async tx => {
    const fresh = await tx.get(ref);

    if (
      !fresh.exists ||
      fresh.data().role === "admin" ||
      !["active", "suspended", "deactivated"].includes(
        fresh.data().status
      )
    ) {
      throw fail(409, "Account status changed. Please retry.");
    }

    tx.update(ref, {
      status: "deleting",
      deletionRequestedAt: new Date(),
      updatedAt: new Date()
    });

    tx.set(jobs.doc(uid), {
      uid,
      status: "pending",
      attempts: 0,
      requestedAt: new Date()
    });
  });

  try {
    await disableAccess(uid);
  } catch {
    console.error("Admin deletion: Auth disable needs retry.");
  }

  return { queued: true };
}

const validLicenseId = id =>
  typeof id === "string" &&
  id.startsWith(LICENSE_FOLDER) &&
  /^[A-Za-z0-9_./-]{1,255}$/.test(id) &&
  !id.split("/").includes("..");

function licensePublicId(expert) {
  const direct = expert.licenseImagePublicId;

  if (direct !== undefined && direct !== null && direct !== "") {
    if (!validLicenseId(direct)) {
      throw Error("Unrecognized license image ID; manual review required.");
    }

    return direct;
  }

  if (!expert.licenseImageUrl) {
    return null;
  }

  let url;

  try {
    url = new URL(expert.licenseImageUrl);
  } catch {
    throw Error("Malformed license image URL; manual review required.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    url.pathname.split("/")[1] !== process.env.CLOUDINARY_CLOUD_NAME
  ) {
    throw Error("Unrecognized license image host; manual review required.");
  }

  // Accept old public and new authenticated Cloudinary URL forms.
  const match = url.pathname.match(
    /^\/[^/]+\/image\/(?:upload|authenticated)\/(?:v\d+\/)?(.+)\.([A-Za-z0-9]+)$/
  );

  if (!match) {
    throw Error("Unknown license image URL format; manual review required.");
  }

  let id;

  try {
    id = decodeURIComponent(match[1]);
  } catch {
    throw Error("Invalid license image URL encoding.");
  }

  if (!validLicenseId(id)) {
    throw Error("License image outside approved folder; manual review required.");
  }

  return id;
}

function cloudinaryNotFound(error) {
  return (
    error?.http_code === 404 ||
    error?.statusCode === 404 ||
    error?.status === 404
  );
}

async function deleteLicenseImage(publicId) {
  if (!validLicenseId(publicId)) {
    throw Error("Unsafe license image ID; deletion stopped.");
  }

  // Avoid patched uploader.destroy: it may always choose authenticated.
  for (const type of ["authenticated", "upload"]) {
    let asset;

    try {
      asset = await cloudinary.api.resource(publicId, {
        resource_type: "image",
        type
      });
    } catch (error) {
      if (cloudinaryNotFound(error)) {
        continue;
      }

      // Permission/network errors must not be treated as deletion.
      throw error;
    }

    if (!asset) {
      continue;
    }

    const result = await cloudinary.api.delete_resources(
      [publicId],
      {
        resource_type: "image",
        type,
        invalidate: true
      }
    );

    const status = result?.deleted?.[publicId];

    if (!["deleted", "not_found"].includes(status)) {
      throw Error("Cloudinary license deletion was not confirmed.");
    }
  }
}

async function runDeletion(uid) {
  if (!canPurge(uid)) {
    return;
  }

  const ref = users.doc(uid);
  const current = await ref.get();

  if (!current.exists) {
    // User document is deleted last; this is a leftover job.
    await jobs.doc(uid).delete();
    return;
  }

  const account = current.data();

  if (account.status !== "deleting") {
    return;
  }

  if (account.role === "admin") {
    throw Error("Admin deletion blocked.");
  }

  const experts = await expertDocsFor(uid, account);
  const expertIds = experts.map(doc => doc.id);

  // Validate all license IDs before deleting records.
  const assets = experts.map(doc =>
    licensePublicId(doc.data())
  );

  await disableAccess(uid);
  await cancelOutstandingWork(uid, expertIds);

  const sessionDocs = new Map();
  const requestDocs = new Map();

  const collect = (map, docs) => {
    docs.forEach(doc => map.set(doc.ref.path, doc));
  };

  collect(
    sessionDocs,
    await queryDocs("sessions", "userId", uid)
  );

  collect(
    requestDocs,
    await queryDocs("expertRequests", "userId", uid)
  );

  for (const expertId of expertIds) {
    collect(
      sessionDocs,
      await queryDocs("sessions", "expertId", expertId)
    );

    collect(
      requestDocs,
      await queryDocs("expertRequests", "expertId", expertId)
    );
  }

  const sessionIds = new Set(
    [...sessionDocs.values()].map(doc => doc.id)
  );

  const requestIds = new Set(
    [...requestDocs.values()].map(doc => doc.id)
  );

  for (const doc of requestDocs.values()) {
    if (doc.data().sessionId) {
      sessionIds.add(doc.data().sessionId);
    }
  }

  // Shared messages are removed for BOTH participants.
  for (const sessionId of sessionIds) {
    await deleteMatching("messages", "sessionId", sessionId);

    await deleteMatching(
      "notifications",
      "data.sessionId",
      sessionId
    );
  }

  for (const requestId of requestIds) {
    await deleteMatching(
      "notifications",
      "data.requestId",
      requestId
    );
  }

  for (const doc of sessionDocs.values()) {
    await db.recursiveDelete(doc.ref);
  }

  for (const doc of requestDocs.values()) {
    await db.recursiveDelete(doc.ref);
  }

  // recursiveDelete removes AI conversation subcollections too.
  const personal = [
    ["journals", "userId"],
    ["moods", "userId"],
    ["aiConversations", "userId"],
    ["notifications", "userId"],
    ["crisisAlerts", "userId"],
    ["reports", "reporterId"],
    ["messages", "senderId"],
    ["messages", "receiverId"]
  ];

  for (const [collection, field] of personal) {
    await deleteMatching(collection, field, uid);
  }

  for (let i = 0; i < experts.length; i++) {
    if (assets[i]) {
      await deleteLicenseImage(assets[i]);
    }

    await db.recursiveDelete(experts[i].ref);
  }

  // Delete vault BEFORE Auth and User so a failed purge can retry.
  // recursiveDelete handles possible future vault subcollections.
  await db.recursiveDelete(
    db.collection("privateVaults").doc(uid)
  );

  try {
    await auth.deleteUser(uid);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }
  }

  await db.recursiveDelete(ref);
  await jobs.doc(uid).delete();

  console.log("Account deletion completed.");
}

async function processDeletionJobs() {
  if (workerRunning) {
    return;
  }

  workerRunning = true;

  try {
    const deactivated = await users
      .where("status", "==", "deactivated")
      .get();

    for (const doc of deactivated.docs) {
      try {
        const fresh = await doc.ref.get();

        if (
          !fresh.exists ||
          fresh.data().status !== "deactivated"
        ) {
          continue;
        }

        const account = fresh.data();

        await disableAccess(doc.id);

        const afterDisable = await doc.ref.get();

        if (
          !afterDisable.exists ||
          afterDisable.data().status !== "deactivated"
        ) {
          if (
            afterDisable.exists &&
            afterDisable.data().status === "active"
          ) {
            await auth.updateUser(doc.id, {
              disabled: false
            });
          }

          continue;
        }

        const experts = await expertDocsFor(
          doc.id,
          account
        );

        for (const expert of experts) {
          if (expert.data().available) {
            await expert.ref.update({
              available: false,
              updatedAt: new Date()
            });
          }
        }

        await cancelOutstandingWork(
          doc.id,
          experts.map(expert => expert.id)
        );

        const deadline = asDate(account.deleteAfter);

        if (
          !canPurge(doc.id) ||
          !deadline ||
          deadline > new Date()
        ) {
          continue;
        }

        await db.runTransaction(async tx => {
          const latest = await tx.get(doc.ref);

          const freshDeadline = latest.exists
            ? asDate(latest.data().deleteAfter)
            : null;

          if (
            !latest.exists ||
            latest.data().status !== "deactivated" ||
            !freshDeadline ||
            freshDeadline > new Date()
          ) {
            return;
          }

          tx.update(doc.ref, {
            status: "deleting",
            deletionRequestedAt: new Date()
          });

          tx.set(jobs.doc(doc.id), {
            uid: doc.id,
            status: "pending",
            attempts: 0,
            requestedAt: new Date()
          });
        });
      } catch (error) {
        console.error(
          "Account expiry check failed:",
          error?.name || "error"
        );
      }
    }

    if (process.env.ENABLE_ACCOUNT_PURGE !== "true") {
      return;
    }

    // Recover jobs for accounts left in deleting state.
    const deleting = await users
      .where("status", "==", "deleting")
      .get();

    for (const doc of deleting.docs) {
      if (!canPurge(doc.id)) {
        continue;
      }

      const job = await jobs
        .doc(doc.id)
        .get();

      if (!job.exists) {
        await jobs.doc(doc.id).set({
          uid: doc.id,
          status: "pending",
          attempts: 0,
          requestedAt: new Date()
        });
      }
    }

    const pending = await jobs
      .where("status", "==", "pending")
      .get();

    for (const job of pending.docs) {
      if (!canPurge(job.id)) {
        continue;
      }

      try {
        await runDeletion(job.id);
      } catch (error) {
        console.error(
          "Account deletion failed; retry scheduled:",
          error?.name || "error"
        );

        await job.ref.update({
          attempts: (job.data().attempts || 0) + 1,
          lastError: String(error.message).slice(0, 240),
          lastAttemptAt: new Date()
        });
      }
    }
  } finally {
    workerRunning = false;
  }
}

function startAccountDeletionWorker() {
  cron.schedule("0 * * * *", () => {
    processDeletionJobs().catch(() => {
      console.error("Account deletion worker failed.");
    });
  });

  processDeletionJobs().catch(() => {
    console.error("Initial account deletion run failed.");
  });
}

module.exports = {
  deactivateAccount,
  restoreAccount,
  queueDeletion,
  queueAdminDeletion,
  setAccountSocketIO,
  startAccountDeletionWorker,
  processDeletionJobs
};