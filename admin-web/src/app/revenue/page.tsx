"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  Check,
  Crown,
  Download,
  Plus,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import { VIPRevenueChart } from "@/components/vip/VIPRevenueChart";
import { VIPStatusBadge } from "@/components/vip/VIPStatusBadge";
import { ApiError, adminApi, type AdminTransaction } from "@/services/api";
import type {
  CreateVipSubscriptionInput,
  ReportPeriod,
  VipPackage,
  VipRevenueReport,
} from "@/types";

const periodOptions: Array<{ value: ReportPeriod; label: string }> = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "year", label: "12 tháng" },
];

const paymentLabels = {
  VIETQR: "VietQR",
  BANK_TRANSFER: "Chuyển khoản",
  ADMIN_MANUAL: "Admin",
} as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function LoadingPanel() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-32 rounded-[16px] border border-slate-200 bg-white" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-32 rounded-[16px] border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="h-80 rounded-[16px] border border-slate-200 bg-white" />
    </div>
  );
}

export default function RevenuePage() {
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [report, setReport] = useState<VipRevenueReport | null>(null);
  const [yearReport, setYearReport] = useState<VipRevenueReport | null>(null);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [vipPackages, setVipPackages] = useState<VipPackage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateVipSubscriptionInput>({
    userId: 0,
    packageName: "",
    price: 0,
    startDate: dateInputValue(new Date()),
    endDate: dateInputValue(new Date()),
    paymentMethod: "ADMIN_MANUAL",
  });

  useEffect(() => {
    let cancelled = false;
    void adminApi
      .vipPackages()
      .then((result) => {
        if (!cancelled) {
          const activePackages = result.data.filter(
            (item) => item.is_active === 1,
          );
          setVipPackages(activePackages);
          if (activePackages.length > 0) {
            const firstPackage = activePackages[0];
            const date = new Date();
            date.setDate(date.getDate() + firstPackage.duration_days);
            setForm((current) => ({
              ...current,
              packageName: firstPackage.package_name,
              price: firstPackage.price,
              endDate: dateInputValue(date),
            }));
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const loadReport = useCallback(async (nextPeriod: ReportPeriod) => {
    setStatus("loading");
    try {
      const data = await adminApi.vipRevenue(nextPeriod);
      setReport(data);
      setStatus("ready");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Không thể kết nối dữ liệu doanh thu VIP.",
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReport(period);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadReport, period]);

  useEffect(() => {
    let cancelled = false;
    void adminApi
      .vipRevenue("year")
      .then((data) => {
        if (!cancelled) setYearReport(data);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setMessage(
            error instanceof ApiError
              ? error.message
              : "Không thể tải tổng quan doanh thu.",
          );
      });
    void adminApi
      .transactions()
      .then((data) => {
        if (!cancelled) setTransactions(data.items);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setMessage(
            error instanceof ApiError
              ? error.message
              : "Không thể tải giao dịch.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectPackage(packageName: string) {
    const selected =
      vipPackages.find((item) => item.package_name === packageName) ??
      vipPackages[0];
    if (!selected) return;
    const date = new Date();
    date.setDate(date.getDate() + selected.duration_days);
    setForm((current) => ({
      ...current,
      packageName: selected.package_name,
      price: selected.price,
      endDate: dateInputValue(date),
    }));
  }

  async function createSubscription() {
    if (vipPackages.length === 0) {
      setMessage(
        "Chưa có gói VIP đang hoạt động. Hãy cấu hình gói trước khi đăng ký.",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await adminApi.user(form.userId);
      if (user.data.role !== "LANDLORD") {
        setMessage("Gói VIP chỉ dành cho tài khoản chủ trọ.");
        return;
      }
      await adminApi.createVipSubscription(form);
      setIsModalOpen(false);
      setForm({
        userId: 0,
        packageName: vipPackages[0].package_name,
        price: vipPackages[0].price,
        startDate: dateInputValue(new Date()),
        endDate: dateInputValue(
          new Date(
            Date.now() + vipPackages[0].duration_days * 24 * 60 * 60 * 1000,
          ),
        ),
        paymentMethod: "ADMIN_MANUAL",
      });
      await loadReport(period);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Không thể ghi nhận giao dịch VIP.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function exportReport() {
    if (!report) return;
    const rows = [
      [
        "Mã đăng ký",
        "Người dùng",
        "Email",
        "Gói",
        "Doanh thu",
        "Bắt đầu",
        "Kết thúc",
        "Trạng thái",
      ],
      ...report.subscriptions.map((item) => [
        String(item.id),
        item.user.name,
        item.user.email,
        item.packageName,
        String(item.price),
        item.startDate,
        item.endDate,
        item.status,
      ]),
    ];
    const content = rows
      .map((row) =>
        row.map((cell) => '"' + cell.replaceAll('"', '""') + '"').join(","),
      )
      .join("\n");
    const blob = new Blob(["\ufeff" + content], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "hubstay-doanh-thu-vip.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (status === "loading" && !report) {
    return (
      <AdminLayout>
        <LoadingPanel />
      </AdminLayout>
    );
  }

  if (!report) {
    return (
      <AdminLayout>
        <section className="rounded-[16px] border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-[20px] font-bold text-slate-900">
            Không thể tải báo cáo doanh thu VIP
          </h1>
          <p className="mt-2 text-[13px] text-slate-600">
            {message || "Kiểm tra API và kết nối MySQL rồi thử lại."}
          </p>
          <button
            type="button"
            onClick={() => void loadReport(period)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3d5af1] px-3.5 py-2.5 text-[12px] font-medium text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </button>
        </section>
      </AdminLayout>
    );
  }

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const previousMonthDate = new Date();
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonthKey = previousMonthDate.toISOString().slice(0, 7);
  const revenueForMonth = (monthKey: string) =>
    (yearReport?.trend ?? []).reduce(
      (total, point) =>
        total + (point.date.startsWith(monthKey) ? point.revenue : 0),
      0,
    );
  const currentMonthRevenue = yearReport
    ? revenueForMonth(currentMonthKey)
    : null;
  const previousMonthRevenue = yearReport
    ? revenueForMonth(previousMonthKey)
    : null;
  const totalPlanRevenue = Math.max(
    (yearReport?.plans ?? []).reduce((total, item) => total + item.revenue, 0),
    1,
  );
  const cards = [
    {
      label: "TỔNG DOANH THU",
      value: yearReport ? formatCurrency(yearReport.summary.revenue) : "—",
      detail: "tổng từ các gói VIP",
      icon: BadgeDollarSign,
      tone: "blue",
    },
    {
      label: "DOANH THU THÁNG NÀY",
      value:
        currentMonthRevenue === null
          ? "—"
          : formatCurrency(currentMonthRevenue),
      detail: "tháng hiện tại",
      icon: CalendarDays,
      tone: "emerald",
    },
    {
      label: "DOANH THU THÁNG TRƯỚC",
      value:
        previousMonthRevenue === null
          ? "—"
          : formatCurrency(previousMonthRevenue),
      detail: "tháng liền trước",
      icon: ReceiptText,
      tone: "amber",
    },
    {
      label: "GIAO DỊCH THÀNH CÔNG",
      value: yearReport ? formatNumber(yearReport.summary.purchases) : "—",
      detail: "lượt đăng ký VIP",
      icon: UsersRound,
      tone: "rose",
    },
  ];
  const iconStyles: Record<string, string> = {
    blue: "bg-[#eaf2ff] text-[#2454d5]",
    emerald: "bg-[#eafaf2] text-[#1e9b62]",
    amber: "bg-[#fff4df] text-[#d98208]",
    rose: "bg-[#ffefef] text-[#dc4c4c]",
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <span>VIP &amp; Doanh thu</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-[#1d4ed8]">Doanh thu</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Dữ liệu theo giao dịch đăng ký VIP
            </div>
          </div>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[24px] font-bold leading-tight text-slate-900">
                  Doanh thu VIP
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4df] px-2.5 py-1 text-[11px] font-semibold text-[#d98208]">
                  <Crown className="h-3.5 w-3.5" />
                  {yearReport
                    ? formatNumber(yearReport.summary.activeVips)
                    : "—"}{" "}
                  chủ trọ đang dùng VIP
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-[12px] text-slate-500">
                Theo dõi doanh thu phát sinh từ các gói VIP dành cho chủ trọ.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={exportReport}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-medium text-slate-700 shadow-sm"
              >
                <Download className="h-4 w-4" />
                Xuất dữ liệu
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3d5af1] px-3.5 py-2.5 text-[12px] font-medium text-white shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Ghi nhận VIP
              </button>
            </div>
          </div>
        </section>

        {message ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-[#fff5f5] px-4 py-3 text-[12px] text-rose-700"
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="rounded-lg p-1 text-rose-700"
              aria-label="Đóng thông báo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold tracking-[0.02em] text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-3 truncate text-[25px] font-bold leading-none text-slate-900">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " +
                      iconStyles[card.tone]
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
                  <TrendingUp className="h-3.5 w-3.5 text-[#1e9b62]" />
                  {card.detail}
                </div>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={
                    period === option.value
                      ? "rounded-md bg-[#3d5af1] px-3 py-2 text-[12px] font-medium text-white shadow-sm"
                      : "rounded-md px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void loadReport(period)}
              disabled={status === "loading"}
              className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-white disabled:opacity-50"
            >
              <RefreshCw
                className={
                  status === "loading"
                    ? "h-3.5 w-3.5 animate-spin"
                    : "h-3.5 w-3.5"
                }
              />
              Cập nhật dữ liệu
            </button>
          </div>

          <div className="grid gap-5 border-b border-slate-200 p-4 xl:grid-cols-[1.75fr_1fr]">
            <div className="min-w-0 border-b border-slate-200 pb-4 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-bold text-slate-900">
                    Xu hướng doanh thu VIP
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Doanh thu ghi nhận từ các gói chưa hủy trong kỳ.
                  </p>
                </div>
                <div className="rounded-lg bg-[#eafaf2] px-2.5 py-1.5 text-[12px] font-semibold text-[#1e9b62]">
                  {formatCurrency(report.summary.revenue)}
                </div>
              </div>
              <VIPRevenueChart points={report.trend} />
            </div>

            <div className="min-w-0 xl:pl-1">
              <div>
                <h2 className="text-[17px] font-bold text-slate-900">
                  Cơ cấu gói VIP
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Theo doanh thu trong kỳ.
                </p>
              </div>
              <div className="mt-5 space-y-4">
                {(yearReport?.plans ?? []).length ? (
                  yearReport?.plans.map((plan, index) => {
                    const colors = [
                      "bg-[#3d5af1]",
                      "bg-[#20ad78]",
                      "bg-[#efaf5c]",
                    ];
                    return (
                      <div key={plan.name}>
                        <div className="flex items-start justify-between gap-3 text-[13px]">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {vipPackages.find(
                                (item) => item.package_name === plan.name,
                              )?.display_name ?? plan.name}
                            </p>
                            <p className="mt-1 text-slate-500">
                              {formatNumber(plan.subscribers)} đăng ký
                            </p>
                          </div>
                          <p className="font-semibold text-slate-800">
                            {formatCurrency(plan.revenue)}
                          </p>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={
                              "h-full rounded-full " +
                              colors[index % colors.length]
                            }
                            style={{
                              width:
                                (plan.revenue / totalPlanRevenue) * 100 + "%",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-[13px] text-slate-500">
                    Chưa có đăng ký VIP trong kỳ này.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">
                  Giao dịch VIP gần đây
                </h2>
                <p className="mt-1 text-[12px] text-slate-500">
                  Các khoản thanh toán gói quảng bá của chủ trọ.
                </p>
              </div>
              <Link
                href="/transactions"
                className="inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-[#2d5af5] hover:text-blue-800"
              >
                Xem tất cả giao dịch <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-205 w-full text-left">
                <thead className="bg-slate-50 text-[12px] font-semibold uppercase tracking-[0.02em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã giao dịch</th>
                    <th className="px-3 py-3">Chủ trọ</th>
                    <th className="px-3 py-3">Gói VIP</th>
                    <th className="px-3 py-3">Số tiền</th>
                    <th className="px-3 py-3">Phương thức</th>
                    <th className="px-3 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[13px] text-slate-700">
                  {transactions.slice(0, 5).map((transaction) => (
                    <tr
                      key={transaction.transaction_id}
                      className="hover:bg-slate-50/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#2d5af5]">
                        {transaction.transaction_code}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800">
                          {transaction.full_name}
                        </div>
                        <div className="mt-0.5 text-[12px] text-slate-500">
                          {transaction.email}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">Gói VIP</td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {paymentLabels[transaction.payment_method]}
                      </td>
                      <td className="px-3 py-3">
                        <VIPStatusBadge status={transaction.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-10 text-center text-[12px] text-slate-500">
              Các giao dịch mới nhất lấy từ backend HubStay.
            </div>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vip-modal-title"
        >
          <div className="w-full max-w-[560px] overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2
                  id="vip-modal-title"
                  className="text-[17px] font-bold text-slate-900"
                >
                  Ghi nhận đăng ký VIP
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Tạo giao dịch thành công và kích hoạt thời hạn VIP cho người
                  dùng.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-[11px] font-medium text-slate-600">
                  Mã người dùng
                </span>
                <input
                  value={form.userId || ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      userId: Number(event.target.value),
                    }))
                  }
                  type="number"
                  min="1"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                  placeholder="Ví dụ: 1024"
                />
              </label>
              <label>
                <span className="text-[11px] font-medium text-slate-600">
                  Gói VIP
                </span>
                <select
                  value={form.packageName}
                  onChange={(event) => selectPackage(event.target.value)}
                  disabled={vipPackages.length === 0}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-blue-300 disabled:bg-slate-100"
                >
                  {vipPackages.length ? (
                    vipPackages.map((item) => (
                      <option key={item.package_id} value={item.package_name}>
                        {item.display_name}
                      </option>
                    ))
                  ) : (
                    <option value="">Chưa có gói hoạt động</option>
                  )}
                </select>
              </label>
              <label>
                <span className="text-[11px] font-medium text-slate-600">
                  Doanh thu (VND)
                </span>
                <input
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: Number(event.target.value),
                    }))
                  }
                  type="number"
                  min="1"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                />
              </label>
              <label>
                <span className="text-[11px] font-medium text-slate-600">
                  Bắt đầu
                </span>
                <input
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  type="date"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                />
              </label>
              <label>
                <span className="text-[11px] font-medium text-slate-600">
                  Kết thúc
                </span>
                <input
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  type="date"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[11px] font-medium text-slate-600">
                  Phương thức thanh toán
                </span>
                <select
                  value={form.paymentMethod}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      paymentMethod: event.target
                        .value as CreateVipSubscriptionInput["paymentMethod"],
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                >
                  <option value="ADMIN_MANUAL">Admin ghi nhận</option>
                  <option value="VIETQR">VietQR</option>
                  <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-medium text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void createSubscription()}
                disabled={isSubmitting || !form.userId || !form.price}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3d5af1] px-3.5 py-2.5 text-[12px] font-medium text-white disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {isSubmitting ? "Đang ghi nhận..." : "Ghi nhận VIP"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
