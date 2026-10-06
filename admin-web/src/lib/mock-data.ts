export const navigationItems = [
  { label: "Tổng quan", href: "/", icon: "overview", badge: null },
  { label: "Quản lý người dùng", href: "/users", icon: "users", badge: null },
  { label: "Duyệt hồ sơ xác thực", href: "/verification", icon: "verification", badge: 12 },
  { label: "Quản lý bài đăng", href: "/posts", icon: "posts", badge: null },
  { label: "Quản lý báo cáo", href: "/reports", icon: "reports", badge: 5 },
  { label: "Doanh thu VIP", href: "/revenue", icon: "revenue", badge: null },
  { label: "Trường học & Địa điểm", href: "/schools", icon: "schools", badge: null },
] as const;

export const adminProfile = {
  name: "Nguyễn Hoàng Nam",
  role: "Quản trị viên",
};

export const filterOptions = ["7 ngày qua", "30 ngày qua", "Quý này", "Năm nay"];

export const statCards = [
  {
    title: "Tổng người dùng",
    value: "14,820",
    change: "+12.5%",
    detail: "so với tháng trước",
    tone: "blue",
    icon: "users",
  },
  {
    title: "Tổng bài đăng phòng",
    value: "3,450",
    change: "+8.3%",
    detail: "so với tuần trước",
    tone: "emerald",
    icon: "posts",
  },
  {
    title: "Hồ sơ chờ duyệt",
    value: "28",
    change: "Cần xử lý",
    detail: "Hạn chót < 24h",
    tone: "amber",
    icon: "verification",
  },
  {
    title: "Báo cáo chờ xử lý",
    value: "07",
    change: "+5.2%",
    detail: "Tỷ lệ khiếu nại giảm",
    tone: "rose",
    icon: "reports",
  },
] as const;

export const userGrowthData = [
  { day: "Thứ 2", student: 26, worker: 18, landlord: 12 },
  { day: "Thứ 3", student: 31, worker: 21, landlord: 15 },
  { day: "Thứ 4", student: 27, worker: 19, landlord: 11 },
  { day: "Thứ 5", student: 34, worker: 23, landlord: 16 },
  { day: "Thứ 6", student: 38, worker: 27, landlord: 18 },
  { day: "Thứ 7", student: 45, worker: 30, landlord: 21 },
  { day: "Chủ nhật", student: 50, worker: 33, landlord: 24 },
];

export const growthSummary = {
  avgPerDay: "243 đăng ký mới",
  highlight: "Cao điểm cuối tuần",
};

export const listingMix = [
  { label: "Cho thuê", value: 48, color: "#2563eb" },
  { label: "Tìm bạn ở ghép", value: 35, color: "#10b981" },
  { label: "Pass / Nhượng phòng", value: 17, color: "#f59e0b" },
];

export const dashboardSummary = {
  totalPosts: "642 tin mới",
};
