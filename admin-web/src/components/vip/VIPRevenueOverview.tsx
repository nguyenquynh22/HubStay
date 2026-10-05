"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeDollarSign, Crown, ReceiptText, TrendingUp } from "lucide-react";
import { VIPRevenueChart } from "@/components/vip/VIPRevenueChart";
import { ApiError, adminApi } from "@/services/api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function VIPRevenueOverview() {
  const [report, setReport] = useState<Awaited<ReturnType<typeof adminApi.vipRevenue>> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void adminApi.vipRevenue("30d")
      .then((data) => {
        if (!cancelled) {
          setReport(data);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải dữ liệu VIP.");
      });
    return () => { cancelled = true; };
  }, []);

  const metrics = [
    { label: "Doanh thu VIP 30 ngày", value: report ? formatCurrency(report.summary.revenue) : "—", icon: BadgeDollarSign },
    { label: "Chủ trọ đang dùng VIP", value: report ? formatCount(report.summary.activeVips) : "—", icon: Crown },
    { label: "Giao dịch trong 30 ngày", value: report ? formatCount(report.summary.purchases) : "—", icon: ReceiptText },
    { label: "Chủ trọ đăng ký", value: report ? formatCount(report.summary.subscribers) : "—", icon: TrendingUp },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-slate-900">VIP &amp; Doanh thu</h2>
          <p className="mt-1 text-[13px] text-slate-500">Tóm tắt hoạt động gói quảng bá dành cho chủ trọ.</p>
        </div>
        <Link href="/revenue" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2d5af5] hover:text-blue-800">
          Xem báo cáo <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 px-3 py-3 first:pl-0 last:pr-0 sm:py-1 xl:px-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf2ff] text-[#3159df]"><Icon className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-[12px] text-slate-500">{label}</p>
              <p className="mt-1 truncate text-[17px] font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {error ? <p role="alert" className="mt-3 text-[12px] text-rose-700">{error}</p> : null}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <h3 className="text-[14px] font-semibold text-slate-800">Doanh thu VIP theo tháng</h3>
        {report ? <VIPRevenueChart points={report.trend} compact /> : <p className="mt-3 text-[12px] text-slate-500">{error ? "Không có dữ liệu để hiển thị." : "Đang tải dữ liệu..."}</p>}
      </div>
    </section>
  );
}
