import axios from "axios";

const api = axios.create({
  // backend-api/.env sets PORT=5000; override for a phone/device with the host LAN IP.
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

export const getPostsByUserId = async (userId: number) => (await api.get(`/posts/user/${userId}`)).data;
export const getUserById = async (userId: number) => (await api.get(`/users/${userId}`)).data;
export const updateUser = async (userId: number, payload: Record<string, unknown>) => (await api.put(`/users/${userId}`, payload)).data;
export const getLandmarks = async () => (await api.get("/landmarks")).data;
export const createLandmark = async (payload: { name: string; category: string; address: string; latitude: number; longitude: number }) => (await api.post("/landmarks", payload)).data;
export const getNearbyPosts = async (landmarkId: number, radiusKm = 10) => (await api.get("/posts/nearby", { params: { landmark_id: landmarkId, radius_km: radiusKm } })).data;
export const getSavedPosts = async (userId: number) => (await api.get(`/saved_posts/user/${userId}`)).data;
export const toggleSavedPost = async (userId: number, postId: number) => (await api.post("/saved_posts", { user_id: userId, post_id: postId })).data;
export const createPost = async (payload: Record<string, unknown>) => (await api.post("/posts", payload, { timeout: 120000 })).data;
export const resolveImageUrl = (url?: string) => {
  if (!url || /^(https?:|data:)/i.test(url)) return url;
  const origin = String(api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
};
export const submitVerification = async (payload: Record<string, unknown>) => (await api.post("/verification_requests", payload)).data;
export const devVerifyUser = async (userId: number, code: string) => (await api.post(`/verification_requests/dev-verify/${userId}`, { code })).data;
export const getVerificationsByUser = async (userId: number) => (await api.get(`/verification_requests/user/${userId}`)).data;
export const activateDevVip = async (payload: { user_id: number; package_name: string; price: number; months: number }) => (await api.post("/subscriptions/dev-activate", payload)).data;
export const getTransactionsByUser = async (userId: number) => (await api.get(`/transactions/user/${userId}`)).data;

export default api;
