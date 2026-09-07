const { db } = require("../config/firebase");

const collection = db.collection("expertRequests");

const createRequest = async (userId, expertId, message = "") => {
  const ref = collection.doc();

  const request = {
    userId,
    expertId,
    message,
    status: "pending",
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await ref.set(request);

  return {
    id: ref.id,
    ...request,
  };
};

const getExpertRequests = async (expertId) => {
  const snapshot = await collection
    .where("expertId", "==", expertId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

const updateRequest = async (requestId, status, reason = null) => {
  await collection.doc(requestId).update({
    status,
    rejectionReason: reason,
    updatedAt: new Date().toISOString(),
  });

  const doc = await collection.doc(requestId).get();

  return {
    id: doc.id,
    ...doc.data(),
  };
};

module.exports = {
  createRequest,
  getExpertRequests,
  updateRequest,
};