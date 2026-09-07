const { db } = require("../config/firebase");
const reportsCollection = db.collection("reports");

const createReport = async (data) => {
  const now = new Date();
  const report = {
    reporterId: data.reporterId || null,
    category: data.category || "general",
    description: data.description,
    severity: data.severity || "medium",
    anonymous: true,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  const ref = await reportsCollection.add(report);
  return { id: ref.id, ...report };
};

const getReports = async (reporterId = null) => {
  let query = reportsCollection;
  if (reporterId) query = query.where("reporterId", "==", reporterId);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const updateReport = async (reportId, updates) => {
  await reportsCollection.doc(reportId).update({ ...updates, updatedAt: new Date() });
  const doc = await reportsCollection.doc(reportId).get();
  return { id: doc.id, ...doc.data() };
};

module.exports = { createReport, getReports, updateReport };
