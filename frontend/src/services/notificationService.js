import api from "./api";

/* =========================================================
   GET MY NOTIFICATIONS
========================================================= */

export const getNotifications =
  async () => {
    const response =
      await api.get(
        "/notifications/me"
      );

    return response.data;
  };

/* =========================================================
   MARK ONE READ
========================================================= */

export const markNotificationRead =
  async (
    notificationId
  ) => {
    const response =
      await api.patch(
        `/notifications/${notificationId}/read`
      );

    return response.data;
  };

/* =========================================================
   MARK ALL READ
========================================================= */

export const markAllNotificationsRead =
  async () => {
    const response =
      await api.patch(
        "/notifications/read-all"
      );

    return response.data;
  };

/* =========================================================
   UNREAD COUNT
========================================================= */

export const getUnreadNotificationCount =
  async () => {
    const response =
      await api.get(
        "/notifications/status/unread-count"
      );

    return response.data;
  };

export default {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
};