const { db } = require("../config/firebase");

const conversationsCollection = db.collection("aiConversations");

const createConversation = async (data) => {
  const docRef = await conversationsCollection.add({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: docRef.id,
    ...data,
  };
};

const getConversation = async (id) => {
  const doc = await conversationsCollection.doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
};

module.exports = {
  createConversation,
  getConversation,
};