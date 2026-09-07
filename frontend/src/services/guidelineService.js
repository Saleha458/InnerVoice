import api from "./api";

export const getGuidelines = async () => {
  const response = await api.get("/guidelines");
  return response.data;
};

export default {
  getGuidelines,
};