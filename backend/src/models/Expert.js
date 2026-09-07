const { db } = require("../config/firebase");

const createExpert = async (expertData) => {
  const docRef = await db.collection("experts").add({
    ...expertData,
    verificationStatus: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: docRef.id,
    ...expertData,
    verificationStatus: "pending",
  };
};

const getExpertById = async (expertId) => {
  const doc = await db
    .collection("experts")
    .doc(expertId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
};

const getVerifiedExperts = async () => {
  const snapshot = await db
    .collection("experts")
    .where("verificationStatus", "==", "verified")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

module.exports = {
  createExpert,
  getExpertById,
  getVerifiedExperts,
};