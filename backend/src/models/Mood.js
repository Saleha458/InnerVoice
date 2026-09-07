const { db } = require("../config/firebase");

const moodsCollection = db.collection("moods");

const createMood = async (userId, data) => {
  const mood = {
    userId,
    mood: data.mood,
    note: data.note || "",
    date: data.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const ref = await moodsCollection.add(mood);

  return {
    id: ref.id,
    ...mood,
  };
};

const getUserMoods = async (userId) => {
  const snapshot = await moodsCollection
    .where("userId", "==", userId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

const deleteMood = async (moodId) => {
  await moodsCollection.doc(moodId).delete();
};

module.exports = {
  createMood,
  getUserMoods,
  deleteMood,
};