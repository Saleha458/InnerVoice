import api from "./api";

/* =========================================================
   PARENT EDUCATION HUB API

   Backend reads current content from Firestore and returns
   source metadata with the guidance.
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

/* =========================================================
   TRUSTED SOURCE DIRECTORY
========================================================= */

export const getGuidelineResources =
  async () => {
    const response =
      await api.get(
        "/guidelines/resources"
      );

    return response.data;
  };

export default {
  getGuidelines,
  getGuidelineByAge,
  getGuidelineResources,
};