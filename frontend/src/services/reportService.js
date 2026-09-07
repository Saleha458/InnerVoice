import api from "./api";
import { auth } from "./firebase";

const config = async () => {
  const token =
    await auth.currentUser?.getIdToken();

  return {
    headers: {
      Authorization:
        `Bearer ${token}`,
    },
  };
};

export const createReport =
  async (data) => {
    const response =
      await api.post(
        "/reports",
        data,
        await config()
      );

    return response.data;
  };

export const getMyReports =
  async () => {
    const response =
      await api.get(
        "/reports",
        await config()
      );

    return response.data;
  };

export const getAllReports =
  async () => {
    const response =
      await api.get(
        "/reports/admin/all",
        await config()
      );

    return response.data;
  };