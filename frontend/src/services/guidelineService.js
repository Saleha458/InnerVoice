import api from "./api";

/* =========================================================
   ALL AGE GROUPS
========================================================= */

export const getGuidelines =
  async () => {
    const response =
      await api.get(
        "/guidelines"
      );

    return response.data;
  };

/* =========================================================
   SINGLE AGE GROUP
========================================================= */

export const getGuidelineByAge =
  async (
    ageGroup
  ) => {
    const response =
      await api.get(
        `/guidelines/${encodeURIComponent(
          ageGroup
        )}`
      );

    return response.data;
  };

export default {
  getGuidelines,
  getGuidelineByAge,
};