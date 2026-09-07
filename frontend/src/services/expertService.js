import api from "./api";
import { auth } from "./firebase";

// =========================================================
// AUTH CONFIG
// =========================================================

const getAuthConfig = async () => {
  const user = auth.currentUser;

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

// =========================================================
// REGISTER EXPERT
// =========================================================

export const registerExpert =
  async (formData) => {
    const config =
      await getAuthConfig();

    const response =
      await api.post(
        "/experts/register",
        formData,
        config
      );

    return response.data;
  };

// =========================================================
// VERIFIED EXPERTS
// =========================================================

export const getVerifiedExperts =
  async () => {
    const response =
      await api.get(
        "/experts/verified",
        await getAuthConfig()
      );

    return response.data;
  };

// =========================================================
// SINGLE EXPERT
// =========================================================

export const getExpert =
  async (id) => {
    const response =
      await api.get(
        `/experts/${id}`,
        await getAuthConfig()
      );

    return response.data;
  };

// =========================================================
// MY EXPERT PROFILE
// =========================================================

export const getMyExpert =
  async () => {
    const response =
      await api.get(
        "/experts/me",
        await getAuthConfig()
      );

    return response.data;
  };

// =========================================================
// SEND BOOKING / SUPPORT REQUEST
// =========================================================

export const sendExpertRequest =
  async ({
    expertId,
    message = "",
    startTime,
    duration,
  }) => {
    const response =
      await api.post(
        "/expert-requests",
        {
          expertId,
          message,
          startTime,
          duration,
        },
        await getAuthConfig()
      );

    return response.data;
  };

// =========================================================
// USER REQUESTS
// =========================================================

export const getMyExpertRequests =
  async () => {
    const response =
      await api.get(
        "/expert-requests/user",
        await getAuthConfig()
      );

    return response.data;
  };

// =========================================================
// EXPERT REQUESTS
// =========================================================

export const getExpertRequests =
  async () => {
    const response =
      await api.get(
        "/expert-requests/expert",
        await getAuthConfig()
      );

    return response.data;
  };

// =========================================================
// ACCEPT / REJECT
// =========================================================

export const updateExpertRequest =
  async (
    requestId,
    status,
    reason = ""
  ) => {
    const response =
      await api.patch(
        `/expert-requests/${requestId}`,
        {
          status,
          reason,
        },
        await getAuthConfig()
      );

    return response.data;
  };

export default {
  registerExpert,
  getVerifiedExperts,
  getExpert,
  getMyExpert,
  sendExpertRequest,
  getMyExpertRequests,
  getExpertRequests,
  updateExpertRequest,
};