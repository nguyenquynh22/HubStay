export type ReportPeriod = "7d" | "30d" | "quarter" | "year";

export interface VipRevenueTrend {
  date: string;
  revenue: number;
  purchases: number;
}

export interface VipPlanSummary {
  name: string;
  subscribers: number;
  revenue: number;
}

export interface VipSubscription {
  id: number;
  userId: number;
  user: {
    name: string;
    email: string;
    initials: string;
    avatar?: string | null;
    avatarTone: string;
  };
  packageName: string;
  price: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  createdAt: string;
}

export interface VipRevenueReport {
  period: ReportPeriod;
  summary: {
    revenue: number;
    purchases: number;
    subscribers: number;
    activeVips: number;
  };
  trend: VipRevenueTrend[];
  plans: VipPlanSummary[];
  subscriptions: VipSubscription[];
}

export interface VipPackage {
  package_id: number;
  package_name: string;
  display_name: string;
  description: string | null;
  price: number;
  duration_days: number;
  benefits: string[];
  is_active: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface VipPackagePayload {
  package_name: string;
  display_name: string;
  description?: string | null;
  price: number;
  duration_days: number;
  benefits: string[];
  is_active?: number;
  sort_order?: number;
}

export interface CreateVipSubscriptionInput {
  userId: number;
  packageName: string;
  price: number;
  startDate: string;
  endDate: string;
  paymentMethod: "BANK_TRANSFER" | "VIETQR" | "ADMIN_MANUAL";
}
