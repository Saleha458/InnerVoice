import axios from "axios";
import { auth } from "../config/firebase";

const baseURL =
  import.meta.env.VITE_API_URL ||
  (
    import.meta.env.DEV
      ? "http://localhost:5000/api"
      : ""
  );

if (!baseURL) {
  throw new Error(
    "Missing VITE_API_URL. Configure the deployed backend HTTPS URL before building."
  );
}

const api = axios.create({
  baseURL,
  withCredentials: true
});

api.interceptors.request.use(
  async config => {
    const user = auth.currentUser;

    if (user) {
      config.headers.Authorization =
        `Bearer ${await user.getIdToken()}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] =
        "application/json";
    }

    return config;
  }
);

api.interceptors.response.use(
  response => response,

  error => {
    // Do not log decrypted messages or full response bodies.
    if (import.meta.env.DEV) {
      console.warn(
        "API request failed:",
        error.response?.status ||
          error.code ||
          error.name
      );
    }

    return Promise.reject(error);
  }
);

export default api;