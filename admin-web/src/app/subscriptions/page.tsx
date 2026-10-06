"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarClock, ChevronLeft, ChevronRight, Crown, Eye, Search, UsersRound, X } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { VIPStatusBadge } from "@/components/vip/VIPStatusBadge";
import { ApiError, adminApi, type AdminSubscription } from "@/services/api";

type SubscriptionFilter = "ALL" | "ACTIVE" | "EXPIRED" | "CANCELLED";

type SubscriptionState = "ACTIVE" | "EXPIRED" | "CANCELLED";

const packageLabels: Record<string, string> = {
  VIP_1_MONTH: "VIP 1 tháng",
  VIP_3_MONTHS: "VIP 3 tháng",
  VIP_1_YEAR: "VIP 1 năm",
};

const filterOptions: Array<{ value: SubscriptionFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "EXPIRED", label: "Đã hết hạn" },
  { value: "CANCELLED", label: "Đã hủy" },
];

type Subscription = {
  id: number;
  userId: number;
  user: { name: string; email: string; initials: string; avatarTone: string };
  packageName: string;
  price: number;
  startDate: string;
  endDate: string;
  status: SubscriptionState;
  createdAt: string;
  displayStatus: SubscriptionState;
};

function getSubscriptionState(subscription: { status: SubscriptionState; endDate: string }): SubscriptionState {
  if (subscription.status === "CANCELLED") return "CANCELLED";
  if (subscription.status === "EXPIRED") return "EXPIRED";
  const expiresAt = new Date(`${subscription.endDate.slice(0, 10)}T23:59:59`);
  return expiresAt.getTime() < Date.now() ? "EXPIRED" : "ACTIVE";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function isInteractiveTarget(target: EventTarget) {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, label"));
}

export default function SubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SubscriptionFilter>("ALL");
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [subscriptionRows, setSubscriptionRows] = useState<AdminSubscription[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void adminApi.subscriptions()
      .then((result) => {
        if (!cancelled) {
          setSubscriptionRows(result.items);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải đăng ký VIP.");
      });
    return () => { cancelled = true; };
  }, []);

  const subscriptions = useMemo(() => subscriptionRows.map((row) => ({
    ...row,
    user: {
      name: row.full_name,
      email: row.email,
      initials: row.full_name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase(),
      avatarTone: "bg-[#dfeaff] text-[#254ad8]",
    },
    id: row.subscription_id,
    userId: row.user_id,
    packageName: row.package_name,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    displayStatus: getSubscriptionState({ status: row.status, endDate: row.end_date }),
  })), [subscriptionRows]);

  const filteredSubscriptions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi-VN");
    return subscriptions.filter((subscription) => {
      const matchesSearch = !query || `${subscription.user.name} ${subscription.user.email}`.toLocaleLowerCase("vi-VN").includes(query);
      return matchesSearch && (filter === "ALL" || subscription.displayStatus === filter);
    });
  }, [subscriptions, search, filter]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soonLimit = new Date(today);
  soonLimit.setDate(soonLimit.getDate() + 7);
  const activeCount = subscriptions.filter((item) => item.displayStatus === "ACTIVE").length;
  const expiringCount = subscriptions.filter((item) => {
    const expiry = new Date(`${item.endDate.slice(0, 10)}T00:00:00`);
    return item.displayStatus === "ACTIVE" && expiry >= today && expiry <= soonLimit;
  }).length;
  const expiredCount = subscriptions.filter((item) => item.displayStatus === "EXPIRED").length;

  const stats = [
    { label: "ĐANG SỬ DỤNG VIP", value: activeCount, note: "Gói còn hiệu lực", icon: Crown, tone: "blue" },
    { label: "SẮP HẾT HẠN", value: expiringCount, note: "Trong 7 ngày tới", icon: CalendarClock, tone: "amber" },
    { label: "ĐÃ HẾT HẠN", value: expiredCount, note: "Theo ngày hết hạn", icon: BadgeCheck, tone: "slate" },
    { label: "TỔNG LƯỢT ĐĂNG KÝ", value: subscriptions.length, note: "Chủ trọ đăng ký VIP", icon: UsersRound, tone: "green" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4"><div className="text-[12px] text-slate-500"><span>VIP &amp; Doanh thu</span><span className="mx-2 text-slate-300">/</span><span className="font-medium text-[#1d4ed8]">Đăng ký VIP</span></div><span className="hidden text-[11px] text-slate-500 sm:inline">Lịch sử gói của chủ trọ</span></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-[24px] font-bold leading-tight text-slate-900">Đăng ký VIP</h1><p className="mt-2 text-[12px] text-slate-500">Theo dõi chủ trọ đang sử dụng và từng đăng ký gói VIP.</p></div><span className="text-[12px] font-medium text-slate-500">{filteredSubscriptions.length} lượt đăng ký</span></div>
        </section>

        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, note, icon: Icon, tone }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[12px] font-semibold text-slate-500">{label}</p><p className="mt-2 text-[26px] font-bold leading-none text-slate-900">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone === "amber" ? "bg-[#fff4df] text-[#a66308]" : tone === "green" ? "bg-[#eafaf2] text-[#18794e]" : tone === "slate" ? "bg-slate-100 text-slate-600" : "bg-[#edf2ff] text-[#3159df]"}`}><Icon className="h-4 w-4" /></span></div>
              <p className="mt-3 text-[12px] text-slate-500">{note}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative w-full lg:max-w-95"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" aria-label="Tìm chủ trọ theo tên hoặc email" placeholder="Tìm chủ trọ hoặc email" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300" /></label>
            <div role="group" aria-label="Lọc trạng thái đăng ký" className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
              {filterOptions.map((option) => <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)} className={filter === option.value ? "rounded-md bg-[#3d5af1] px-3 py-2 text-[12px] font-medium text-white" : "rounded-md px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50"}>{option.label}</button>)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-225 w-full text-left">
              <thead className="bg-slate-50 text-[12px] font-semibold uppercase tracking-[0.02em] text-slate-500"><tr><th className="px-4 py-3">Chủ trọ</th><th className="px-3 py-3">Gói VIP</th><th className="px-3 py-3">Giá</th><th className="px-3 py-3">Ngày bắt đầu</th><th className="px-3 py-3">Ngày hết hạn</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-200 text-[13px] text-slate-700">
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} tabIndex={0} role="button" aria-label={`Mở đăng ký VIP của ${subscription.user.name}`} className="cursor-pointer bg-white hover:bg-slate-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" onClick={(event) => { if (!isInteractiveTarget(event.target)) setSelectedSubscription(subscription); }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedSubscription(subscription); } }}>
                    <td className="px-4 py-3"><div className="flex min-w-48 items-center gap-2.5"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${subscription.user.avatarTone}`}>{subscription.user.initials}</span><span><span className="block font-semibold text-slate-800">{subscription.user.name}</span><span className="mt-0.5 block text-[12px] text-slate-500">{subscription.user.email}</span></span></div></td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700">{packageLabels[subscription.packageName] ?? subscription.packageName}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{formatCurrency(subscription.price)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-slate-600">{formatDate(subscription.startDate)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-slate-600">{formatDate(subscription.endDate)}</td>
                    <td className="px-3 py-3"><VIPStatusBadge status={subscription.displayStatus} /></td>
                    <td className="px-3 py-3 text-right"><button type="button" aria-label={`Xem đăng ký của ${subscription.user.name}`} onClick={() => setSelectedSubscription(subscription)} className="rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100"><Eye className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredSubscriptions.length ? <div className="px-4 py-10 text-center text-[13px] text-slate-500">Không tìm thấy đăng ký VIP phù hợp.</div> : null}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3"><span className="text-[12px] text-slate-500">Hiển thị {filteredSubscriptions.length} trên {subscriptions.length} đăng ký</span><div className="flex items-center gap-1"><button type="button" disabled className="rounded-lg border border-slate-200 p-1.5 text-slate-300" aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></button><span className="px-2 text-[12px] font-medium text-slate-700">1</span><button type="button" disabled className="rounded-lg border border-slate-200 p-1.5 text-slate-300" aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></button></div></div>
        </section>
      </div>

      {selectedSubscription ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSubscription(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="vip-subscription-title" className="w-full max-w-125 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 id="vip-subscription-title" className="text-[17px] font-bold text-slate-900">Chi tiết đăng ký VIP</h2><p className="mt-1 text-[13px] text-slate-500">Mã đăng ký VIP-{selectedSubscription.id}</p></div><button type="button" aria-label="Đóng chi tiết đăng ký" onClick={() => setSelectedSubscription(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
          <dl className="grid gap-x-5 gap-y-4 px-5 py-4 sm:grid-cols-2"><Detail label="Chủ trọ" value={selectedSubscription.user.name} /><Detail label="Email" value={selectedSubscription.user.email} /><Detail label="Gói VIP" value={packageLabels[selectedSubscription.packageName] ?? selectedSubscription.packageName} /><Detail label="Giá gói" value={formatCurrency(selectedSubscription.price)} /><Detail label="Ngày bắt đầu" value={formatDate(selectedSubscription.startDate)} /><Detail label="Ngày hết hạn" value={formatDate(selectedSubscription.endDate)} /><div><dt className="text-[12px] text-slate-500">Trạng thái</dt><dd className="mt-1"><VIPStatusBadge status={getSubscriptionState(selectedSubscription)} /></dd></div><Detail label="Mã chủ trọ" value={String(selectedSubscription.userId)} /></dl>
          <footer className="flex justify-between gap-2 border-t border-slate-200 px-5 py-3"><Link href={`/users/${selectedSubscription.userId}`} className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50">Mở hồ sơ chủ trọ</Link><button type="button" onClick={() => setSelectedSubscription(null)} className="rounded-lg bg-[#3159df] px-3.5 py-2.5 text-[13px] font-medium text-white hover:bg-blue-700">Đóng</button></footer>
        </section>
      </div> : null}
    </AdminLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-[12px] text-slate-500">{label}</dt><dd className="mt-1 wrap-break-word text-[13px] font-medium text-slate-800">{value}</dd></div>;
}
