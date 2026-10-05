import axios from "axios";

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const api = axios.create({
  baseURL: configuredBaseUrl || "http://localhost:5000/api",
  timeout: 30000,
  headers: { Accept: "application/json" },
});

export default api;
