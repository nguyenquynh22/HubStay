import api from "../api/axiosClient";

export const setAuthToken = (token: string | null) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

export const registerAccount = async (payload: {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  role: "STUDENT" | "WORKER" | "LANDLORD";
}) => (await api.post("/auth/register", payload)).data;

export const loginAccount = async (payload: {
  email: string;
  password: string;
}) => (await api.post("/auth/login", payload)).data;

export interface AdministrativeUnit {
  code: number;
  name: string;
}

export interface AdministrativeAreaSelection {
  province: AdministrativeUnit | null;
  district: AdministrativeUnit | null;
  ward: AdministrativeUnit | null;
}

export const getPostsByUserId = async (
  userId: number,
  sort: "newest" | "oldest" = "newest",
) => (await api.get(`/posts/user/${userId}`, { params: { sort } })).data;
export const getUserById = async (userId: number) =>
  (await api.get(`/users/${userId}`)).data;
export const updateUser = async (
  userId: number,
  payload: Record<string, unknown>,
) => (await api.put(`/users/${userId}`, payload)).data;
export const getLandmarks = async () => (await api.get("/landmarks")).data;
export const getAdministrativeProvinces = async (): Promise<
  AdministrativeUnit[]
> => (await api.get("/administrative-areas/provinces")).data.data;
export const getAdministrativeDistricts = async (
  provinceCode: number,
): Promise<AdministrativeUnit[]> =>
  (await api.get(`/administrative-areas/provinces/${provinceCode}/districts`))
    .data.data.districts || [];
export const getAdministrativeWards = async (
  districtCode: number,
): Promise<AdministrativeUnit[]> =>
  (await api.get(`/administrative-areas/districts/${districtCode}/wards`)).data
    .data.wards || [];
export const createLandmark = async (payload: {
  name: string;
  category: string;
  address: string;
  province_code?: number | null;
  district_code?: number | null;
  ward_code?: number | null;
  latitude: number;
  longitude: number;
}) => (await api.post("/landmarks", payload)).data;
export const getNearbyPosts = async (landmarkId: number, radiusKm = 10) =>
  (
    await api.get("/posts/nearby", {
      params: { landmark_id: landmarkId, radius_km: radiusKm },
    })
  ).data;
export const searchPosts = async (filters: {
  province_code?: number;
  district_code?: number;
  ward_code?: number;
  landmark_id?: number;
  radius_km?: number;
}) => (await api.get("/posts/search", { params: filters })).data;
export const getSavedPosts = async (userId: number) =>
  (await api.get(`/saved_posts/user/${userId}`)).data;
export const toggleSavedPost = async (userId: number, postId: number) =>
  (await api.post("/saved_posts", { user_id: userId, post_id: postId })).data;
export const createPost = async (payload: Record<string, unknown>) =>
  (await api.post("/posts", payload, { timeout: 120000 })).data;
export const createConversation = async (postId: number, tenantId: number) =>
  (
    await api.post("/chat/conversations", {
      post_id: postId,
      tenant_id: tenantId,
    })
  ).data;
export const getConversations = async (userId: number) =>
  (await api.get(`/chat/conversations/user/${userId}`)).data;
export const getMessages = async (conversationId: string, userId: number) =>
  (
    await api.get(`/chat/conversations/${conversationId}/messages`, {
      params: { user_id: userId },
    })
  ).data;
export const resolveImageUrl = (url?: string) => {
  if (!url || /^(https?:|data:)/i.test(url)) return url;
  const origin = String(api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
};
export const submitVerification = async (payload: Record<string, unknown>) =>
  (await api.post("/verification_requests", payload)).data;
export const devVerifyUser = async (userId: number, code: string) =>
  (await api.post(`/verification_requests/dev-verify/${userId}`, { code }))
    .data;
export const getVerificationsByUser = async (userId: number) =>
  (await api.get(`/verification_requests/user/${userId}`)).data;
export const activateDevVip = async (payload: {
  user_id: number;
  package_name: string;
  price: number;
  months: number;
}) => (await api.post("/subscriptions/dev-activate", payload)).data;
export const getTransactionsByUser = async (userId: number) =>
  (await api.get(`/transactions/user/${userId}`)).data;
export const createTopUp = async (userId: number, amount: number) =>
  (await api.post("/transactions", { user_id: userId, amount })).data;
export const simulateTopUpSuccess = async (transactionId: number) =>
  (await api.post(`/transactions/dev/${transactionId}/simulate-success`)).data;
export const getVipPackages = async () =>
  (await api.get("/subscriptions/packages")).data;
export const purchaseVip = async (userId: number, package_name: string) =>
  (await api.post("/subscriptions/purchase", { user_id: userId, package_name }))
    .data;
export const getLandlordAppointments = async (
  userId: number,
  sort: "newest" | "oldest" = "newest",
) =>
  (
    await api.get(`/appointments/landlord/${userId}`, {
      params: { sort },
    })
  ).data;
export const getNotifications = async (userId: number) =>
  (await api.get(`/notifications/user/${userId}`)).data;
export const markNotificationRead = async (
  userId: number,
  notificationId: number,
) =>
  (
    await api.patch(`/notifications/${notificationId}/read`, {
      user_id: userId,
    })
  ).data;
export const markNotificationsRead = async (userId: number) =>
  (await api.patch(`/notifications/user/${userId}/read-all`)).data;
export const getRentalRequests = async (userId: number) =>
  (await api.get(`/rental-requests/user/${userId}`)).data;
export const createRentalRequest = async (payload: {
  post_id: number;
  tenant_id: number;
  note?: string;
}) => (await api.post("/rental-requests", payload)).data;
export const updateRentalRequest = async (
  requestId: number,
  actor_id: number,
  status: "ACCEPTED" | "REJECTED" | "CANCELLED",
) =>
  (
    await api.patch(`/rental-requests/${requestId}/status`, {
      actor_id,
      status,
    })
  ).data;
export const markPostRented = async (postId: number, actor_id: number) =>
  (await api.post(`/rental-requests/post/${postId}/rent-out`, { actor_id }))
    .data;
export const getTenantAppointments = async (
  userId: number,
  sort: "newest" | "oldest" = "newest",
) =>
  (
    await api.get(`/appointments/tenant/${userId}`, {
      params: { sort },
    })
  ).data;
export const createAppointment = async (payload: {
  post_id: number;
  tenant_id?: number;
  owner_id?: number;
  source?: "IN_APP" | "EXTERNAL";
  guest_name?: string;
  guest_phone?: string;
  appointment_date: string;
  appointment_time: string;
  note?: string;
}) => (await api.post("/appointments", payload)).data;
export const updateAppointment = async (
  appointmentId: number,
  payload: {
    actor_id: number;
    status?: "CONFIRMED" | "CANCELLED";
    appointment_date?: string;
    appointment_time?: string;
    note?: string;
  },
) => (await api.put(`/appointments/${appointmentId}`, payload)).data;
