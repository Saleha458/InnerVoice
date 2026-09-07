const { db } = require("../config/firebase");

const messagesCollection = db.collection("messages");

const createMessage = async (messageData) => {
  const docRef = await messagesCollection.add({
    ...messageData,
    createdAt: new Date(),
  });

  return {
    id: docRef.id,
    ...messageData,
  };
};

const getMessagesBySession = async (sessionId) => {
  const snapshot = await messagesCollection
    .where("sessionId", "==", sessionId)
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

module.exports = {
  createMessage,
  getMessagesBySession,
};