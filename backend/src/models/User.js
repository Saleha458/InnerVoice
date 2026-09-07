const {
  db,
} = require("../config/firebase");

const usersCollection =
  db.collection("users");


const createUser =
  async (userData) => {
    const now =
      new Date();

    const docRef =
      await usersCollection.add({
        ...userData,

        createdAt:
          now,

        updatedAt:
          now,
      });

    return {
      id:
        docRef.id,

      ...userData,

      createdAt:
        now,

      updatedAt:
        now,
    };
  };


const getUserById =
  async (id) => {
    const doc =
      await usersCollection
        .doc(id)
        .get();

    if (!doc.exists) {
      return null;
    }

    return {
      id:
        doc.id,

      ...doc.data(),
    };
  };


const updateUser =
  async (
    id,
    data
  ) => {
    await usersCollection
      .doc(id)
      .set(
        {
          ...data,

          updatedAt:
            new Date(),
        },
        {
          merge: true,
        }
      );

    return getUserById(id);
  };


module.exports = {
  createUser,
  getUserById,
  updateUser,
};