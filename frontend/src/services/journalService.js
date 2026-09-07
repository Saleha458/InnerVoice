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

export const getJournalEntries =
  async () => {
    const response =
      await api.get(
        "/journal",
        await config()
      );

    return response.data;
  };

export const createJournalEntry =
  async (data) => {
    const response =
      await api.post(
        "/journal",
        data,
        await config()
      );

    return response.data;
  };

export const deleteJournalEntry =
  async (id) => {
    const response =
      await api.delete(
        `/journal/${id}`,
        await config()
      );

    return response.data;
  };