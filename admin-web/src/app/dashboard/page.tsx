"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Download,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { VIPRevenueOverview } from "@/components/vip/VIPRevenueOverview";
import { ApiError, adminApi, type AdminDashboard } from "@/services/api";
import type { ReportPeriod } from "@/types";

const filterOptions: Array<{ label: string; value: ReportPeriod }> = [
  { label: "7 ngày qua", value: "7d" },
  { label: "30 ngày qua", value: "30d" },
  { label: "Quý này", value: "quarter" },
  { label: "Năm nay", value: "year" },
];

const toneStyles = {
  blue: { badge: "bg-[#eaf7f4] text-[#1ea67a]", iconWrap: "bg-[#eaf7f4] text-[#1ea67a]" },
  emerald: { badge: "bg-[#ebfff3] text-[#1ea67a]", iconWrap: "bg-[#ebfff3] text-[#1ea67a]" },
  amber: { badge: "bg-[#fff4df] text-[#d98208]", iconWrap: "bg-[#fff4df] text-[#d98208]" },
  rose: { badge: "bg-[#ffefef] text-[#dc4c4c]", iconWrap: "bg-[#ffefef] text-[#dc4c4c]" },
} as const;

export default function DashboardPage() {
  const [period, setPeriod] = useState<ReportPeriod>("7d");
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void adminApi.dashboard(period)
      .then((data) => {
        if (!cancelled) {
          setDashboard(data);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải dữ liệu tổng quan.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [period]);

  const summary = dashboard?.summary;
  const statCards = [
    { title: "Tổng người dùng", value: summary?.usersCount, detail: "Tài khoản không phải quản trị viên", tone: "blue", icon: Users },
    { title: "Tổng bài đăng phòng", value: summary?.postsCount, detail: "Tổng bài đăng trong hệ thống", tone: "emerald", icon: FileText },
    { title: "Hồ sơ chờ duyệt", value: summary?.verificationPending, detail: "Cần xử lý", tone: "amber", icon: BadgeCheck },
    { title: "Báo cáo chờ xử lý", value: summary?.reportsPending, detail: "Cần xem xét", tone: "rose", icon: AlertTriangle },
  ] as const;
  const dailyGrowth = new Map<string, { student: number; worker: number; landlord: number }>();
  for (const row of dashboard?.growth ?? []) {
    const day = String(row.date).slice(0, 10);
    const totals = dailyGrowth.get(day) ?? { student: 0, worker: 0, landlord: 0 };
    if (row.role === "STUDENT") totals.student += Number(row.total);
    if (row.role === "WORKER") totals.worker += Number(row.total);
    if (row.role === "LANDLORD") totals.landlord += Number(row.total);
    dailyGrowth.set(day, totals);
  }
  const growthData = [...dailyGrowth.entries()].slice(-7).map(([date, values]) => ({
    day: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(new Date(`${date}T12:00:00`)),
    ...values,
  }));
  const postTypeLabels: Record<string, string> = {
    RENTAL: "Cho thuê", CHO_THUE: "Cho thuê", SHARE: "Tìm bạn ở ghép",
    TIM_O_GHEP: "Tìm bạn ở ghép", PASS: "Pass / Nhượng phòng",
  };
  const postColors = ["#2f5ce8", "#13b57a", "#ef8b24", "#7c3aed"];
  const rawPostMix = dashboard?.postMix ?? [];
  const totalListings = rawPostMix.reduce((total, item) => total + Number(item.total), 0);
  const listingMix = rawPostMix.map((item, index) => ({
    label: postTypeLabels[item.type] ?? item.type,
    amount: Number(item.total),
    value: totalListings ? Math.round((Number(item.total) / totalListings) * 100) : 0,
    color: postColors[index % postColors.length],
  }));
  const totalGrowth = (dashboard?.growth ?? []).reduce((total, item) => total + Number(item.total), 0);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#edf2ff] px-2.5 py-1.5 text-[12px] font-medium text-[#3759d9]">
              <span className="h-2 w-2 rounded-full bg-[#3759d9]" />
              DỮ LIỆU BACKEND HUBSTAY
            </div>
            <div className="text-[12px] text-slate-500">{isLoading ? "Đang tải dữ liệu..." : "Dữ liệu trực tiếp từ backend"}</div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-[24px] font-bold leading-tight text-slate-900 md:text-[28px]">
                Trung tâm Điều hành HubStay
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] text-slate-600">
                Giám sát hoạt động kết nối phòng trọ, phê duyệt hồ sơ và bảo mật cộng đồng sinh viên toàn quốc.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPeriod(option.value)}
                    className={[
                      "rounded-lg px-3 py-2 text-[12px] font-medium transition",
                      period === option.value ? "bg-[#3d5af1] text-white shadow-sm" : "text-slate-600 hover:bg-white",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3d5af1] px-4 py-2.5 text-[12px] font-medium text-white shadow-sm"
              >
                <Download className="h-4 w-4" />
                Xuất dữ liệu
              </button>
            </div>
          </div>
        </section>

        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            const styles = toneStyles[card.tone];

            return (
              <div key={card.title} className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-500">{card.title}</p>
                    <div className="mt-3">
                      <span className="text-[29px] font-bold leading-none tracking-tight text-slate-900">{card.value?.toLocaleString("vi-VN") ?? (isLoading ? "…" : "—")}</span>
                    </div>
                  </div>

                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles.iconWrap}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${styles.badge}`}>
                    <TrendingUp className="h-3.5 w-3.5" />
                    {isLoading ? "Đang tải" : "Từ hệ thống"}
                  </span>
                  <span className="text-[12px] text-slate-500">{card.detail}</span>
                </div>
              </div>
            );
          })}
        </section>

        <VIPRevenueOverview />

        <section className="grid gap-5 xl:grid-cols-[2.1fr_1fr]">
          <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-[17px] font-bold text-slate-900">Tăng trưởng người dùng mới ({filterOptions.find((item) => item.value === period)?.label})</h3>
              <div className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700">
                <TrendingUp className="h-3 w-3" />
                {filterOptions.find((item) => item.value === period)?.label}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-3">
              {growthData.map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-3">
                  <div className="flex h-44 w-full items-end justify-center gap-1.5">
                    {[item.student, item.worker, item.landlord].map((value, index) => (
                      <div key={`${item.day}-${index}`} className="flex h-full w-full max-w-[15px] items-end justify-center">
                        <div
                          className={[
                            "w-full rounded-t-md",
                            index === 0 ? "bg-[#3f67f6]" : index === 1 ? "bg-[#2bbd8d]" : "bg-[#efaf5c]",
                          ].join(" ")}
                          style={{ height: `${(value / 60) * 100}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">{item.day}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#3f67f6]" /> Sinh viên</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#2bbd8d]" /> Người đi làm</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#efaf5c]" /> Chủ trọ</span>
              </div>

              <div className="text-[12px] text-slate-500 sm:text-right">
                <div className="font-semibold text-slate-800">{totalGrowth.toLocaleString("vi-VN")} người dùng mới trong kỳ</div>
                <div className="mt-1 text-slate-500">{growthData.length} ngày có dữ liệu</div>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-[17px] font-bold text-slate-900">Bài Đăng Mới Theo Loại Hình</h3>
            <p className="mt-1 text-[12px] text-slate-500">Phân bố bài đăng mới theo loại trong kỳ</p>

            <div className="mt-4 flex flex-col items-center gap-4">
              <div className="relative flex h-52 w-52 items-center justify-center">
                <svg viewBox="0 0 180 180" className="h-52 w-52 -rotate-90">
                  <circle cx="90" cy="90" r="58" fill="none" stroke="#eef2f8" strokeWidth="22" />
                  {(() => {
                    const total = listingMix.reduce((sum, item) => sum + item.amount, 0);
                    const circumference = 2 * Math.PI * 58;

                    return listingMix.reduce<Array<{ label: string; color: string; dash: number; offset: number }>>(
                      (segments, item) => {
                        const dash = (item.amount / total) * circumference;
                        const previousOffset = segments.length === 0 ? 0 : segments[segments.length - 1].offset + segments[segments.length - 1].dash;
                        segments.push({
                          label: item.label,
                          color: item.color,
                          dash,
                          offset: previousOffset,
                        });
                        return segments;
                      },
                      [],
                    ).map((segment) => (
                      <circle
                        key={segment.label}
                        cx="90"
                        cy="90"
                        r="58"
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="22"
                        strokeLinecap="round"
                        strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
                        strokeDashoffset={-segment.offset}
                      />
                    ));
                  })()}
                </svg>

                <div className="absolute text-center">
                  <div className="text-[12px] font-semibold text-slate-500">{totalListings.toLocaleString("vi-VN")}</div>
                  <div className="text-[11px] text-slate-500">Tin mới</div>
                </div>
              </div>

              <div className="w-full space-y-2.5">
                {listingMix.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[13px] text-slate-700">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-semibold text-slate-900">{item.amount}</div>
                      <div className="text-[11px] text-slate-500">{item.value}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
