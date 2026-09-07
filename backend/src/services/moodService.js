const {
  db,
} = require("../config/firebase");

const toDate = (value) => {
  if (!value) {
    return new Date(0);
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? new Date(0)
    : date;
};


const createMood = async ({
  userId,
  mood,
  note = "",
  intensity,
}) => {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  if (
    !mood ||
    !String(mood).trim()
  ) {
    throw new Error(
      "Mood is required."
    );
  }

  const numericIntensity =
    Number(intensity);

  if (
    !Number.isInteger(
      numericIntensity
    ) ||
    numericIntensity < 1 ||
    numericIntensity > 10
  ) {
    throw new Error(
      "Intensity must be between 1 and 10."
    );
  }

  const createdAt =
    new Date();

  const moodData = {
    userId,

    mood:
      String(mood).trim(),

    note:
      String(note || "").trim(),

    intensity:
      numericIntensity,

    createdAt,
  };

  const ref =
    await db
      .collection("moods")
      .add(moodData);

  return {
    id: ref.id,
    ...moodData,
  };
};


const getUserMoods =
  async (userId) => {
    const snapshot =
      await db
        .collection("moods")
        .where(
          "userId",
          "==",
          userId
        )
        .get();

    const moods =
      snapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      );

    moods.sort(
      (a, b) =>
        toDate(
          b.createdAt
        ).getTime() -
        toDate(
          a.createdAt
        ).getTime()
    );

    return moods;
  };


const deleteMood = async (
  moodId,
  userId
) => {
  const ref =
    db
      .collection("moods")
      .doc(moodId);

  const document =
    await ref.get();

  if (!document.exists) {
    throw new Error(
      "Mood entry not found."
    );
  }

  const mood =
    document.data();

  if (
    mood.userId !== userId
  ) {
    throw new Error(
      "Unauthorized."
    );
  }

  await ref.delete();

  return true;
};


module.exports = {
  createMood,
  getUserMoods,
  deleteMood,
};