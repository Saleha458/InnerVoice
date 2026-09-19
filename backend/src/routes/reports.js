"use strict";

const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");
const authenticate = require("../middleware/auth");
const allowRoles = require("../middleware/roleAuth");
const { unseal } = require("../services/privateFields");

const router = express.Router();
const reports = db.collection("reports");
const vaults = db.collection("privateVaults");

const fields = ["category", "description", "severity"];

const idOK = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]{16,128}$/.test(value);

const base64 = value =>
  typeof value === "string" &&
  value.length > 0 &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const box = value =>
  value?.v === 1 &&
  base64(value.iv) &&
  Buffer.from(value.iv, "base64").length === 12 &&
  base64(value.ct) &&
  Buffer.from(value.ct, "base64").length > 16;

function validEnvelope(value) {
  return (
    value?.v === 1 &&
    base64(value.epk) &&
    base64(value.salt) &&
    box(value.sender) &&
    box(value.receiver) &&
    Buffer.byteLength(
      JSON.stringify(value),
      "utf8"
    ) <= 65000
  );
}

const fail = (status, message) =>
  Object.assign(new Error(message), { status });

const sendError = (res, error) =>
  res.status(error.status || 500).json({
    success: false,
    message: error.status
      ? error.message
      : "Could not process the private report."
  });

const stamp = value =>
  value?.toDate?.()?.toISOString?.() ||
  value ||
  null;

async function adminIdentity() {
  const found = await db
    .collection("users")
    .where("role", "==", "admin")
    .limit(2)
    .get();

  if (
    found.size !== 1 ||
    found.docs[0].data().status !== "active"
  ) {
    throw fail(
      503,
      "Report recipient is unavailable."
    );
  }

  const uid = found.docs[0].id;

  const vault = await vaults
    .doc(uid)
    .get();

  if (
    !vault.exists ||
    !vault.data().publicKey
  ) {
    throw fail(
      503,
      "Admin must create and unlock their private vault before receiving reports."
    );
  }

  return {
    uid,
    publicKey: vault.data().publicKey
  };
}

function publicReport(doc, viewer) {
  const data = doc.data();

  const common = {
    id: doc.id,
    status: data.status || "pending",
    anonymous: false,
    createdAt: stamp(data.createdAt),
    updatedAt: stamp(data.updatedAt)
  };

  if (data.privacyVersion === 2) {
    if (
      !validEnvelope(data.e2ee) ||
      !data.reporterId ||
      !data.adminUid
    ) {
      throw fail(
        500,
        "Encrypted report format invalid."
      );
    }

    return {
      ...common,
      privacyVersion: 2,
      sessionId: `report_${doc.id}`,
      senderId: data.reporterId,
      receiverId: data.adminUid,
      type: "text",
      e2ee: data.e2ee
    };
  }

  // Old report descriptions are NOT returned
  // to the Admin review interface.
  if (viewer === "admin") {
    return {
      ...common,
      legacy: true,
      category: "Old report awaiting private migration",
      description:
        "Content cannot be displayed in the private review interface.",
      severity: "not available"
    };
  }

  if (
    data.privacyVersion !== 1 ||
    !data.reporterId
  ) {
    throw fail(
      500,
      "Unsupported legacy report format."
    );
  }

  // Only the authenticated owner reaches
  // this legacy-data branch.
  return {
    ...common,
    legacy: true,
    ...unseal(
      data,
      "reports",
      data.reporterId,
      fields
    )
  };
}

router.use(authenticate);

// Return the intended Admin recipient's public key.
router.get(
  "/recipient",
  allowRoles("user"),
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      const admin = await adminIdentity();

      const self = await vaults
        .doc(req.user.uid)
        .get();

      if (!self.exists) {
        throw fail(
          409,
          "Create your private vault first."
        );
      }

      return res.json({
        success: true,
        adminUid: admin.uid,
        adminPublicKey: admin.publicKey,
        ownPublicKey: self.data().publicKey
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

// New reports: ciphertext ONLY.
router.post(
  "/",
  allowRoles("user"),
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      const { id, e2ee } = req.body || {};

      if (
        !idOK(id) ||
        !validEnvelope(e2ee)
      ) {
        throw fail(
          400,
          "Only valid device-encrypted reports are accepted."
        );
      }

      const admin = await adminIdentity();

      const self = await vaults
        .doc(req.user.uid)
        .get();

      if (!self.exists) {
        throw fail(
          409,
          "Create your private vault first."
        );
      }

      const now = new Date();

      await reports.doc(id).create({
        reporterId: req.user.uid,
        adminUid: admin.uid,
        privacyVersion: 2,
        e2ee,
        anonymous: false,
        status: "pending",
        createdAt: now,
        updatedAt: now
      });

      return res.status(201).json({
        success: true,
        id
      });
    } catch (error) {
      if (
        error.code === 6 ||
        error.code === "already-exists"
      ) {
        return res.status(409).json({
          success: false,
          message: "Report ID already exists."
        });
      }

      return sendError(res, error);
    }
  }
);

// Owner's reports.
router.get(
  "/",
  allowRoles("user"),
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      const snap = await reports
        .where(
          "reporterId",
          "==",
          req.user.uid
        )
        .get();

      const result = snap.docs
        .map(doc => publicReport(doc, "user"))
        .sort(
          (a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
        );

      return res.json({
        success: true,
        reports: result
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

// Admin sees new ciphertext.
// Old report descriptions are withheld.
router.get(
  "/admin/all",
  allowRoles("admin"),
  async (_req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      const snap = await reports.get();

      const result = snap.docs
        .map(doc => publicReport(doc, "admin"))
        .sort(
          (a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
        );

      return res.json({
        success: true,
        reports: result
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

// Owner-initiated migration only.
router.post(
  "/:id/migrate",
  allowRoles("user"),
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      if (
        !idOK(req.params.id) ||
        !validEnvelope(req.body?.e2ee)
      ) {
        throw fail(
          400,
          "Invalid report migration."
        );
      }

      const admin = await adminIdentity();

      const ref = reports.doc(req.params.id);

      await db.runTransaction(async tx => {
        const doc = await tx.get(ref);

        if (
          !doc.exists ||
          doc.data().reporterId !== req.user.uid
        ) {
          throw fail(
            404,
            "Report not found."
          );
        }

        if (
          doc.data().privacyVersion !== 1 ||
          !doc.data().privateData
        ) {
          throw fail(
            409,
            "This report is not an unmigrated legacy report."
          );
        }

        tx.update(ref, {
          privacyVersion: 2,
          adminUid: admin.uid,
          e2ee: req.body.e2ee,
          updatedAt: new Date(),

          privateData: FieldValue.delete(),
          category: FieldValue.delete(),
          description: FieldValue.delete(),
          severity: FieldValue.delete()
        });
      });

      return res.json({
        success: true
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

module.exports = router;