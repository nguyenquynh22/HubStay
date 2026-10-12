import type {
  CreateVipSubscriptionInput,
  ReportPeriod,
  VipPackage,
  VipPackagePayload,
  VipRevenueReport,
} from "@/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"
).replace(/\/$/, "");
const apiOrigin = /^https?:\/\//i.test(apiBaseUrl) ? new URL(apiBaseUrl).origin : "";

export function resolveMediaUrl(url: string): string {
  if (/^(https?:|data:|blob:|\/\/)/i.test(url)) return url;
  const path = `/${url.replace(/^\/+/, "")}`;
  return apiOrigin ? `${apiOrigin}${path}` : path;
}

export type UserRole = "STUDENT" | "WORKER" | "LANDLORD";
export type UserStatus = "ACTIVE" | "WARNING" | "BANNED";

export interface AdminUser {
  user_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_verified: number | boolean;
  is_vip: number | boolean;
  vip_expires_at: string | null;
  status: UserStatus;
  banned_until?: string | null;
  ban_reason?: string | null;
  created_at: string;
  updated_at?: string;
  post_count?: number;
  active_post_count?: number;
  active_subscription_count?: number;
  report_strike_count?: number;
  violation_reports?: Array<{
    report_id: number;
    post_id: number;
    post_title: string;
    reason: string;
    description: string;
    status: "PENDING" | "RESOLVED" | "DISMISSED";
    created_at: string;
    decision_reversed: boolean;
    reversal_note: string | null;
  }>;
  latest_verification?: {
    request_id: number;
    account_type: UserRole;
    status: "PENDING" | "APPROVED" | "REJECTED";
    rejection_reason: string | null;
    created_at: string;
    reviewed_at: string | null;
  } | null;
}

export interface UserListResponse {
  success: boolean;
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  summary: {
    total: number;
    active: number;
    unverified: number;
    restricted: number;
    students: number;
    landlords: number;
  };
}

export interface AdminDashboard {
  period: ReportPeriod;
  summary: {
    usersCount: number;
    postsCount: number;
    verificationPending: number;
    reportsPending: number;
    vipRevenue: number;
  };
  growth: Array<{ date: string; role: UserRole; total: number }>;
  postMix: Array<{ type: string; total: number }>;
}

export interface AdminVerification {
  id: number;
  accountType: UserRole;
  name: string;
  email: string;
  frontCardUrl: string | null;
  backCardUrl: string | null;
  frontImageAvailable: boolean;
  backImageAvailable: boolean;
  selfieAvailable: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  initials: string;
  avatar: string | null;
  createdAt: string;
}

export interface AdminPost {
  id: number;
  title: string;
  postType: string;
  price: number;
  area: number | null;
  description: string;
  address: string | null;
  status: string;
  verified: boolean;
  imageUrl: string | null;
  author: {
    name: string;
    email: string;
    phone: string | null;
    initials: string;
  };
  imageUrls?: string[];
  imageReviewRequired?: boolean;
  imageReviewReason?: string | null;
  imageReviewStatus?: "PENDING" | "REJECTED" | "APPROVED" | null;
  createdAt: string;
}

export interface AdminPostPayload {
  title: string;
  description: string;
  post_type: string;
  price: number;
  area: number | null;
  address_detail: string;
  post_lat: number;
  post_lng: number;
  author_id?: number;
  status?: string;
}

export interface AdminReport {
  id: number;
  reason: string;
  description: string;
  evidenceImageUrl?: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  decisionReversed?: boolean;
  reversalNote?: string | null;
  pendingReportCount?: number;
  interactionEvidence?: {
    chat: {
      conversationId: string;
      messageId: string;
      messageAt: string | null;
    } | null;
    appointmentId: number | null;
    rentalRequestId: number | null;
    chatLookupAvailable: boolean;
  };
  reporter: { name: string; email: string; phone: string | null };
  post: {
    id: number;
    title: string;
    description?: string;
    postType?: string;
    price?: number | null;
    area?: number | null;
    address?: string;
    status?: string;
    verified?: boolean;
    imageUrls?: string[];
    reportCount?: number;
    createdAt?: string;
  };
  target: { name: string; email: string; phone?: string | null; initials: string };
  createdAt: string;
}

export interface AdminLandmark {
  landmark_id: number;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface AdminTransaction {
  transaction_id: number;
  user_id: number;
  amount: number;
  payment_method: "VIETQR" | "BANK_TRANSFER" | "ADMIN_MANUAL";
  transaction_code: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  created_at: string;
  full_name: string;
  email: string;
}

export interface AdminSubscription {
  subscription_id: number;
  user_id: number;
  package_name: string;
  price: number;
  start_date: string;
  end_date: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  created_at: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export type UserPayload = Partial<
  Pick<
    AdminUser,
    | "full_name"
    | "email"
    | "phone"
    | "role"
    | "avatar_url"
    | "is_verified"
    | "is_vip"
    | "vip_expires_at"
    | "status"
    | "banned_until"
    | "ban_reason"
  >
> & { password?: string; password_setup?: "ACTIVATION_LINK" | "SET_PASSWORD" };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token =
    typeof window === "undefined"
      ? null
      : (window.localStorage.getItem("admin_token") ??
        window.sessionStorage.getItem("admin_token"));
  const response = await fetch(apiBaseUrl + path, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.message ?? "Không thể tải dữ liệu từ máy chủ.",
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function uploadAvatar(file: File): Promise<string> {
  const token =
    typeof window === "undefined"
      ? null
      : (window.localStorage.getItem("admin_token") ??
        window.sessionStorage.getItem("admin_token"));
  const response = await fetch(apiBaseUrl + "/uploads/avatar", {
    method: "POST",
    headers: {
      "Content-Type": file.type,
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: file,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      body?.message ?? "Không thể tải ảnh lên máy chủ.",
      response.status,
    );
  }
  if (typeof body?.url !== "string") {
    throw new ApiError(
      "Máy chủ không trả về đường dẫn ảnh hợp lệ.",
      response.status,
    );
  }
  return body.url;
}

async function verificationImage(
  id: number,
  kind: "front" | "back" | "selfie",
): Promise<Blob> {
  const token =
    typeof window === "undefined"
      ? null
      : (window.localStorage.getItem("admin_token") ??
        window.sessionStorage.getItem("admin_token"));
  const response = await fetch(
    apiBaseUrl + "/admin/verifications/" + id + "/images/" + kind,
    {
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.message ?? "Không thể tải ảnh xác minh.",
      response.status,
    );
  }
  return response.blob();
}

export const adminApi = {
  health: () => request<{ status: string }>("/health"),
  login: (identifier: string, password: string) =>
    request<{
      success: boolean;
      token: string;
      admin: {
        id: number;
        name: string;
        email: string | null;
        phone: string | null;
        role: string;
      };
    }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    }),
  register: (payload: {
    full_name: string;
    email?: string;
    phone?: string;
    password: string;
    role: UserRole;
  }) =>
    request<{ success: boolean; message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyRegistrationOtp: (email: string, otp: string) =>
    request<{ success: boolean; message: string }>(
      "/auth/register/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      },
    ),
  resendRegistrationOtp: (email: string) =>
    request<{ success: boolean; message: string }>(
      "/auth/register/resend-otp",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    ),
  activateAccount: (token: string, password: string) =>
    request<{ success: boolean; message: string }>("/auth/activate-account", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  adminSession: () =>
    request<{
      success: boolean;
      admin: {
        userId: number;
        name: string;
        email: string | null;
        phone: string | null;
        role: string;
      };
    }>("/admin/session"),
  dashboard: (period: ReportPeriod = "30d") =>
    request<AdminDashboard>("/admin/dashboard?period=" + period),
  users: (
    filters: {
      search?: string;
      role?: string;
      status?: string;
      verified?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") query.set(key, String(value));
    }
    return request<UserListResponse>("/users?" + query.toString());
  },
  user: (id: number) =>
    request<{ success: boolean; data: AdminUser }>("/users/admin/" + id),
  createUser: (payload: UserPayload) =>
    request<{
      success: boolean;
      data: AdminUser;
      activation_token?: string;
      email_sent?: boolean;
      email_error?: string;
    }>("/users/admin", { method: "POST", body: JSON.stringify(payload) }),
  uploadAvatar,
  updateUser: (id: number, payload: UserPayload) =>
    request<{ success: boolean; data: AdminUser }>("/users/admin/" + id, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteUser: (id: number) =>
    request<{ success: boolean }>("/users/admin/" + id, { method: "DELETE" }),
  verifications: () =>
    request<{ items: AdminVerification[] }>("/admin/verifications"),
  verificationImage,
  reviewVerification: (
    id: number,
    status: "APPROVED" | "REJECTED",
    reason?: string,
  ) =>
    request("/admin/verifications/" + id, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    }),
  posts: () => request<{ items: AdminPost[] }>("/admin/posts"),
  createPost: (payload: AdminPostPayload & { author_id: number }) =>
    request<{ success: boolean; id: number }>("/admin/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePost: (
    id: number,
    payload: Partial<AdminPostPayload> & { is_approved?: boolean },
  ) =>
    request<{ success: boolean }>("/admin/posts/" + id, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  reports: () => request<{ items: AdminReport[] }>("/admin/reports"),
  reviewReport: (id: number, status: "RESOLVED" | "DISMISSED") =>
    request("/admin/reports/" + id, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  posts: async () => {
    const result = await request<{ items: AdminPost[] }>("/admin/posts");
    return {
      ...result,
      items: result.items.map((post) => ({
        ...post,
        imageUrl: post.imageUrl ? resolveMediaUrl(post.imageUrl) : null,
        imageUrls: post.imageUrls?.map(resolveMediaUrl),
      })),
    };
  },
  createPost: (payload: AdminPostPayload & { author_id: number }) =>
    request<{ success: boolean; id: number }>("/admin/posts", { method: "POST", body: JSON.stringify(payload) }),
  updatePost: (id: number, payload: Partial<AdminPostPayload> & { is_approved?: boolean; imageReviewDecision?: "REJECTED" }) =>
    request<{ success: boolean; imageReviewStatus?: string }>("/admin/posts/" + id, { method: "PATCH", body: JSON.stringify(payload) }),
  reports: async () => {
    const result = await request<{ items: AdminReport[] }>("/admin/reports");
    return {
      ...result,
      items: result.items.map((report) => ({
        ...report,
        evidenceImageUrl: report.evidenceImageUrl
          ? resolveMediaUrl(report.evidenceImageUrl)
          : report.evidenceImageUrl,
        post: {
          ...report.post,
          imageUrls: report.post.imageUrls?.map(resolveMediaUrl),
        },
      })),
    };
  },
  reviewReport: (id: number, status: "RESOLVED" | "DISMISSED") =>
    request<{ success: boolean; data: { status: AdminReport["status"]; postStatus: string | null; strikeCount: number | null; sanction: string | null; pendingReportCount: number } }>("/admin/reports/" + id, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  undoReportDecision: (id: number, reason: string) =>
    request<{ success: boolean; data: { status: AdminReport["status"]; postStatus: string; strikeCount: number; sanction: string | null; pendingReportCount: number } }>("/admin/reports/" + id + "/undo", {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),
  landmarks: () => request<{ items: AdminLandmark[] }>("/admin/landmarks"),
  createLandmark: (payload: unknown) =>
    request("/admin/landmarks", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLandmark: (id: number, payload: unknown) =>
    request<{ success: boolean }>("/admin/landmarks/" + id, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteLandmark: (id: number) =>
    request("/admin/landmarks/" + id, { method: "DELETE" }),
  transactions: () =>
    request<{ items: AdminTransaction[] }>("/admin/transactions"),
  updateTransaction: (id: number, status: AdminTransaction["status"]) =>
    request("/admin/transactions/" + id, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  subscriptions: () =>
    request<{ items: AdminSubscription[] }>("/admin/subscriptions"),
  vipPackages: () =>
    request<{ success: boolean; data: VipPackage[] }>("/vip-packages/admin"),
  createVipPackage: (payload: VipPackagePayload) =>
    request<{ success: boolean; data: VipPackage }>("/vip-packages/admin", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateVipPackage: (id: number, payload: Partial<VipPackagePayload>) =>
    request<{ success: boolean; data: VipPackage }>(
      "/vip-packages/admin/" + id,
      { method: "PUT", body: JSON.stringify(payload) },
    ),
  deleteVipPackage: (id: number) =>
    request<{ success: boolean; message: string }>(
      "/vip-packages/admin/" + id,
      { method: "DELETE" },
    ),
  vipRevenue: (period: ReportPeriod) =>
    request<VipRevenueReport>("/admin/vip-revenue?period=" + period),
  createVipSubscription: (payload: CreateVipSubscriptionInput) =>
    request<{ id: number; transactionCode: string }>(
      "/admin/vip-subscriptions",
      { method: "POST", body: JSON.stringify(payload) },
    ),
};
