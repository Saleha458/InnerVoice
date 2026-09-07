const { db } = require("../config/firebase");

const createNotification = async ({
  userId,
  recipientId,
  title,
  message,
  type = "general",
  data = {},
}) => {
  const target =
    userId || recipientId;

  if (!target) {
    throw new Error(
      "Notification recipient is required."
    );
  }

  const notification = {
    userId: target,
    title,
    message,
    type,
    data,
    read: false,
    createdAt: new Date(),
  };

  const reference = await db
    .collection("notifications")
    .add(notification);

  return {
    id: reference.id,
    ...notification,
  };
};

const getUserNotifications =
  async (userId) => {
    const snapshot = await db
      .collection("notifications")
      .where(
        "userId",
        "==",
        userId
      )
      .get();

    const notifications =
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

    notifications.sort(
      (a, b) => {
        const dateA =
          a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt);

        const dateB =
          b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt);

        return (
          dateB.getTime() -
          dateA.getTime()
        );
      }
    );

    return notifications;
  };

const markNotificationRead =
  async (id) => {
    return db
      .collection("notifications")
      .doc(id)
      .update({
        read: true,
        updatedAt: new Date(),
      });
  };

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationRead,
};