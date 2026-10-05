type VIPStatus = "VIP" | "STANDARD" | "SUCCESS" | "PENDING" | "FAILED" | "ACTIVE" | "EXPIRED" | "CANCELLED";

const statusConfig: Record<VIPStatus, { label: string; className: string }> = {
  VIP: { label: "VIP", className: "bg-[#fff4df] text-[#9a6508]" },
  STANDARD: { label: "Thường", className: "bg-slate-100 text-slate-600" },
  SUCCESS: { label: "Thành công", className: "bg-[#eafaf2] text-[#18794e]" },
  PENDING: { label: "Đang chờ", className: "bg-[#fff7e6] text-[#a66308]" },
  FAILED: { label: "Thất bại", className: "bg-slate-100 text-slate-600" },
  ACTIVE: { label: "Đang hoạt động", className: "bg-[#eafaf2] text-[#18794e]" },
  EXPIRED: { label: "Đã hết hạn", className: "bg-slate-100 text-slate-600" },
  CANCELLED: { label: "Đã hủy", className: "bg-[#fff0f0] text-[#a64141]" },
};

export function VIPStatusBadge({ status }: { status: VIPStatus }) {
  const config = statusConfig[status];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium ${config.className}`}>{config.label}</span>;
}
