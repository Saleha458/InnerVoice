import api from "./api";

import {
  auth,
} from "./firebase";

const authConfig =
  async () => {
    const user =
      auth.currentUser;

    if (!user) {
      throw new Error(
        "You must be logged in."
      );
    }

    const token =
      await user.getIdToken();

    return {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    };
  };

export const getAvailableSlots =
  async ({
    expertId,
    date,
    duration,
  }) => {
    /*
     * Important:
     * Calculate timezone for the selected
     * date, not simply today's timezone.
     */
    const timezoneOffset =
      new Date(
        `${date}T12:00:00`
      ).getTimezoneOffset();

    const response =
      await api.get(
        `/sessions/availability/${expertId}`,
        {
          ...(await authConfig()),

          params: {
            date,

            duration,

            timezoneOffset,
          },
        }
      );

    return response.data;
  };

export const bookSession =
  async (data) => {
    const response =
      await api.post(
        "/expert-requests",
        data,
        await authConfig()
      );

    return response.data;
  };

export const getMyBookings =
  async () => {
    const response =
      await api.get(
        "/sessions/user",
        await authConfig()
      );

    return response.data;
  };

export const getMyBookingRequests =
  async () => {
    const response =
      await api.get(
        "/expert-requests/user",
        await authConfig()
      );

    return response.data;
  };

export default {
  getAvailableSlots,
  bookSession,
  getMyBookings,
  getMyBookingRequests,
};