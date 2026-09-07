import api from "./api";
import { auth } from "./firebase";

const authConfig = async () => {
  const token =
    await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error(
      "Authentication session expired."
    );
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getNotifications = async (
  userId
) => {
  if (
    userId &&
    userId !== auth.currentUser?.uid
  ) {
    throw new Error(
      "You can only access your own notifications."
    );
  }

  const config = await authConfig();

  const response = await api.get(
    `/notifications/${
      auth.currentUser?.uid
    }`,
    config
  );

  return response.data;
};

export const markNotificationRead =
  async (notificationId) => {
    const config = await authConfig();

    const response = await api.patch(
      `/notifications/${notificationId}/read`,
      {},
      config
    );

    return response.data;
  };