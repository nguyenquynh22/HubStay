import axios from "axios";

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const normalizedBaseUrl = configuredBaseUrl
  ? `${configuredBaseUrl.replace(/\/+$/, "")}${/\/api$/i.test(configuredBaseUrl.replace(/\/+$/, "")) ? "" : "/api"}`
  : "http://localhost:5000/api";

const api = axios.create({
  baseURL: normalizedBaseUrl,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

export default api;
