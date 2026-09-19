"use strict";

const express = require("express");
const {
  FieldValue
} = require("firebase-admin/firestore");

const { db } = require("../config/firebase");
const authenticate = require("../middleware/auth");
const allowRoles = require("../middleware/roleAuth");
const { unseal } = require("../services/privateFields");

const router = express.Router();

const reports = db.collection("reports");
const vaults = db.collection("privateVaults");

const legacyFields = [
  "category",
  "description",
  "severity"
];

const validId = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]{16,128}$/.test(value);

const b64 = value =>
  typeof value === "string" &&
  value.length > 0 &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const box = value =>
  value?.v === 1 &&
  b64(value.iv) &&
  Buffer.from(value.iv, "base64").length === 12 &&
  b64(value.ct) &&
  Buffer.from(value.ct, "base64").length > 16;

const validEnvelope = value =>
  value?.v === 1 &&
  b64(value.epk) &&
  b64(value.salt) &&
  box(value.sender) &&
  box(value.receiver) &&
  Buffer.byteLength(
    JSON.stringify(value),
    "utf8"
  ) <= 65000;

function fail(status, message) {
  return Object.assign(
    new Error(message),
    { status }
  );
}

function sendError(res, error) {
  return res.status(
    error.status || 500
  ).json({
    success: false,
    message: error.status
      ? error.message
      : "Could not process report."
  });
}

function dateValue(value) {
  return (
    value?.toDate?.()?.toISOString?.() ||
    value ||
    null
  );
}

async function adminIdentity() {
  const snapshot = await db
    .collection("users")
    .where("role", "==", "admin")
    .limit(2)
    .get();

  if (
    snapshot.size !== 1 ||
    snapshot.docs[0].data().status !== "active"
  ) {
    throw fail(
      503,
      "Report recipient is unavailable."
    );
  }

  const uid = snapshot.docs[0].id;

  const vault = await vaults
    .doc(uid)
    .get();

  if (
    !vault.exists ||
    !vault.data().publicKey
  ) {
    throw fail(
      503,
      "Admin must create their private vault first."
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
    createdAt: dateValue(data.createdAt),
    updatedAt: dateValue(data.updatedAt),
    anonymous: false
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

  // Do not expose old report content through
  // the new Admin private-review interface.
  if (viewer === "admin") {
    return {
      ...common,
      legacy: true,
      category: "Old report awaiting migration",
      description:
        "The report owner must migrate this record before private Admin review.",
      severity: "unavailable"
    };
  }

  if (
    data.privacyVersion !== 1 ||
    !data.reporterId
  ) {
    throw fail(
      500,
      "Unsupported old report format."
    );
  }

  return {
    ...common,
    legacy: true,

    ...unseal(
      data,
      "reports",
      data.reporterId,
      legacyFields
    )
  };
}

router.use(authenticate);

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

router.post(
  "/",
  allowRoles("user"),
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      const {
        id,
        e2ee,
        recipientUid,
        recipientPublicKey,
        ownPublicKey
      } = req.body || {};

      if (
        !validId(id) ||
        !validEnvelope(e2ee)
      ) {
        throw fail(
          400,
          "A valid encrypted report is required."
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

      if (
        recipientUid !== admin.uid ||
        recipientPublicKey !== admin.publicKey ||
        ownPublicKey !== self.data().publicKey
      ) {
        throw fail(
          409,
          "Recipient encryption key changed. Reload the page."
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

router.get(
  "/",
  allowRoles("user"),
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      const snapshot = await reports
        .where(
          "reporterId",
          "==",
          req.user.uid
        )
        .get();

      const result = snapshot.docs
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

router.get(
  "/admin/all",
  allowRoles("admin"),
  async (_req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      const snapshot = await reports.get();

      const result = snapshot.docs
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

// Only the intended Admin changes workflow status.
// Report description remains encrypted.
router.patch(
  "/admin/:reportId/status",
  allowRoles("admin"),
  async (req, res) => {
    const { reportId } = req.params;
    const status = req.body?.status;

    if (
      !validId(reportId) ||
      ![
        "in_review",
        "resolved",
        "closed"
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid report status."
      });
    }

    try {
      const ref = reports.doc(reportId);

      await db.runTransaction(async transaction => {
        const doc = await transaction.get(ref);

        if (!doc.exists) {
          throw fail(
            404,
            "Report not found."
          );
        }

        const record = doc.data();

        if (
          record.privacyVersion !== 2 ||
          record.adminUid !== req.user.uid
        ) {
          throw fail(
            403,
            "You cannot review this encrypted report."
          );
        }

        const transitions = {
          pending: ["in_review"],
          in_review: ["resolved", "closed"],
          resolved: ["closed"],
          closed: []
        };

        if (
          !transitions[
            record.status || "pending"
          ]?.includes(status)
        ) {
          throw fail(
            409,
            "Invalid report status transition."
          );
        }

        transaction.update(ref, {
          status,
          reviewedBy: req.user.uid,
          updatedAt: new Date()
        });
      });

      return res.json({
        success: true,
        id: reportId,
        status
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

// Old data migration remains owner-initiated.
router.post(
  "/:id/migrate",
  allowRoles("user"),
  async (req, res) => {
    try {
      if (
        !validId(req.params.id) ||
        !validEnvelope(req.body?.e2ee)
      ) {
        throw fail(
          400,
          "Invalid encrypted migration."
        );
      }

      const admin = await adminIdentity();

      const ref = reports.doc(req.params.id);

      await db.runTransaction(async transaction => {
        const doc = await transaction.get(ref);

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
            "Report is not an unmigrated old record."
          );
        }

        transaction.update(ref, {
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