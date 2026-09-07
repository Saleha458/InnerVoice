import api from "./api";
import { auth } from "./firebase";

const authConfig = async () => {
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error("Please login again.");
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getMoods = async () => {
  const response = await api.get(
    "/moods",
    await authConfig()
  );

  return response.data;
};

export const getMoodHistory = async () => {
  const response = await api.get(
    "/moods",
    await authConfig()
  );

  return response.data;
};

export const addMood = async (moodData) => {
  const response = await api.post(
    "/moods",
    moodData,
    await authConfig()
  );

  return response.data;
};

/*
 * Compatibility alias.
 * MoodTracker.jsx expects saveMood().
 */
export const saveMood = async (moodData) => {
  return addMood(moodData);
};

export const createMood = async (moodData) => {
  return addMood(moodData);
};

export const updateMood = async (id, moodData) => {
  const response = await api.patch(
    `/moods/${id}`,
    moodData,
    await authConfig()
  );

  return response.data;
};

export const deleteMood = async (id) => {
  const response = await api.delete(
    `/moods/${id}`,
    await authConfig()
  );

  return response.data;
};

/*
 * Compatibility alias.
 * MoodTracker.jsx expects removeMood().
 */
export const removeMood = async (id) => {
  return deleteMood(id);
};