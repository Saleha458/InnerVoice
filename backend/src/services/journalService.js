const {
  db,
} = require("../config/firebase");

const {
  encrypt,
  decrypt,
} = require("./encryptionService");

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


const createEntry = async (
  userId,
  {
    title,
    content,
    mood = "",
  }
) => {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const cleanContent =
    String(content || "").trim();

  if (
    cleanContent.length < 3
  ) {
    throw new Error(
      "Journal content is required."
    );
  }

  const encrypted =
    encrypt(cleanContent);

  const now =
    new Date();

  const data = {
    userId,

    title:
      String(
        title || "Untitled"
      ).trim(),

    mood:
      String(
        mood || ""
      ).trim(),

    encryptedData:
      encrypted.encryptedData,

    iv:
      encrypted.iv,

    authTag:
      encrypted.authTag,

    createdAt:
      now,

    updatedAt:
      now,
  };

  const ref =
    await db
      .collection("journals")
      .add(data);

  return {
    id: ref.id,

    title:
      data.title,

    mood:
      data.mood,

    content:
      cleanContent,

    createdAt:
      data.createdAt,

    updatedAt:
      data.updatedAt,
  };
};


const listEntries =
  async (userId) => {
    const snapshot =
      await db
        .collection("journals")
        .where(
          "userId",
          "==",
          userId
        )
        .get();

    const entries =
      await Promise.all(
        snapshot.docs.map(
          async (doc) => {
            const data =
              doc.data();

            let content = "";

            try {
              content =
                decrypt(
                  data.encryptedData,
                  data.iv,
                  data.authTag
                );
            } catch {
              content =
                "This entry could not be decrypted.";
            }

            return {
              id:
                doc.id,

              title:
                data.title,

              mood:
                data.mood,

              content,

              createdAt:
                data.createdAt,

              updatedAt:
                data.updatedAt,
            };
          }
        )
      );

    entries.sort(
      (a, b) =>
        toDate(
          b.createdAt
        ).getTime() -
        toDate(
          a.createdAt
        ).getTime()
    );

    return entries;
  };


const deleteEntry =
  async (
    userId,
    id
  ) => {
    const ref =
      db
        .collection("journals")
        .doc(id);

    const document =
      await ref.get();

    if (
      !document.exists ||
      document.data()
        .userId !== userId
    ) {
      throw new Error(
        "Journal entry not found."
      );
    }

    await ref.delete();

    return true;
  };


module.exports = {
  createEntry,
  listEntries,
  deleteEntry,
};