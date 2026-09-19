"use strict";

const {
  db,
} = require("../config/firebase");

const {
  FieldValue,
} = require("firebase-admin/firestore");

const {
  seal,
  unseal,
} = require("../services/privateFields");

const FIELDS = [
  "category",
  "description",
  "severity",
];

const coll = db.collection("reports");

function serialize(doc) {
  const data = doc.data();

  return {
    id: doc.id,

    reporterId: data.reporterId,

    ...unseal(
      data,
      "reports",
      data.reporterId,
      FIELDS
    ),

    anonymous: true,

    status: data.status,

    createdAt: data.createdAt,

    updatedAt: data.updatedAt,
  };
}

// CREATE REPORT

async function createReport(input) {
  if (!input.reporterId) {
    throw new Error(
      "Reporter ID required"
    );
  }

  const plain = {
    category:
      input.category || "general",

    description:
      input.description,

    severity:
      input.severity || "medium",
  };

  const now = new Date();

  const ref = await coll.add({
    reporterId:
      input.reporterId,

    ...seal(
      plain,
      "reports",
      input.reporterId
    ),

    anonymous: true,

    status: "pending",

    createdAt: now,

    updatedAt: now,
  });

  return {
    id: ref.id,

    reporterId:
      input.reporterId,

    ...plain,

    anonymous: true,

    status: "pending",

    createdAt: now,

    updatedAt: now,
  };
}

// GET REPORTS

async function getReports(
  reporterId = null
) {
  const query = reporterId
    ? coll.where(
        "reporterId",
        "==",
        reporterId
      )
    : coll;

  const snap = await query.get();

  return snap.docs.map(serialize);
}

// UPDATE REPORT

async function updateReport(
  reportId,
  updates
) {
  const ref = coll.doc(reportId);

  const doc = await ref.get();

  if (!doc.exists) {
    throw new Error(
      "Report not found"
    );
  }

  const data = doc.data();

  const patch = {
    updatedAt: new Date(),
  };

  if (
    updates.status !== undefined
  ) {
    patch.status = updates.status;
  }

  if (
    FIELDS.some(
      (field) =>
        updates[field] !== undefined
    )
  ) {
    const old = unseal(
      data,
      "reports",
      data.reporterId,
      FIELDS
    );

    const plain = {
      ...old,

      ...Object.fromEntries(
        FIELDS.filter(
          (field) =>
            updates[field] !== undefined
        ).map(
          (field) => [
            field,
            updates[field],
          ]
        )
      ),
    };

    Object.assign(
      patch,
      seal(
        plain,
        "reports",
        data.reporterId
      )
    );

    FIELDS.forEach((field) => {
      patch[field] =
        FieldValue.delete();
    });
  }

  await ref.update(patch);

  return serialize(
    await ref.get()
  );
}

module.exports = {
  createReport,
  getReports,
  updateReport,
};