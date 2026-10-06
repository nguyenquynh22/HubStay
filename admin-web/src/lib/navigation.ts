export const navigationItems = [
  { label: "Tổng quan", href: "/", icon: "overview" },
  { label: "Quản lý người dùng", href: "/users", icon: "users" },
  { label: "Duyệt hồ sơ xác thực", href: "/verification", icon: "verification" },
  { label: "Quản lý bài đăng", href: "/posts", icon: "posts" },
  { label: "Quản lý báo cáo", href: "/reports", icon: "reports" },
  { label: "Trường học & Địa điểm", href: "/schools", icon: "schools" },
  { label: "VIP & DOANH THU", type: "section" },
  { label: "Giao dịch VIP", href: "/transactions", icon: "transactions" },
  { label: "Đăng ký VIP", href: "/subscriptions", icon: "subscriptions" },
  { label: "Doanh thu", href: "/revenue", icon: "revenue" },
] as const;
