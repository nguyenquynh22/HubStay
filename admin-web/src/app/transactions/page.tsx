"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, Search, X } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { VIPStatusBadge } from "@/components/vip/VIPStatusBadge";
import { ApiError, adminApi, type AdminTransaction } from "@/services/api";

type VipTransactionStatus = AdminTransaction["status"];
type VipPaymentMethod = AdminTransaction["payment_method"];

const statusOptions: Array<{ value: "ALL" | VipTransactionStatus; label: string }> = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "SUCCESS", label: "Thành công" },
  { value: "FAILED", label: "Thất bại" },
];

const paymentLabels: Record<VipPaymentMethod, string> = {
  VIETQR: "VietQR",
  BANK_TRANSFER: "Chuyển khoản",
  ADMIN_MANUAL: "Admin",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function isInteractiveTarget(target: EventTarget) {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, label"));
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | VipTransactionStatus>("ALL");
  const [paymentMethod, setPaymentMethod] = useState<"ALL" | VipPaymentMethod>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<AdminTransaction | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadTransactions() {
    try {
      const result = await adminApi.transactions();
      setTransactions(result.items);
      setError("");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể tải giao dịch.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void adminApi.transactions()
      .then((result) => {
        if (!cancelled) {
          setTransactions(result.items);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải giao dịch.");
      });
    return () => { cancelled = true; };
  }, []);

  const filteredTransactions = useMemo(() => transactions.filter((transaction) => {
    const query = search.trim().toLocaleLowerCase("vi-VN");
    const matchesSearch = !query || `${transaction.full_name} ${transaction.email} ${transaction.transaction_code}`.toLocaleLowerCase("vi-VN").includes(query);
    const date = String(transaction.created_at).slice(0, 10);
    return matchesSearch
      && (status === "ALL" || transaction.status === status)
      && (paymentMethod === "ALL" || transaction.payment_method === paymentMethod)
      && (!startDate || date >= startDate)
      && (!endDate || date <= endDate);
  }), [transactions, search, status, paymentMethod, startDate, endDate]);

  async function confirmTransaction() {
    if (!selectedTransaction || selectedTransaction.status !== "PENDING") return;
    try {
      await adminApi.updateTransaction(selectedTransaction.transaction_id, "SUCCESS");
      setNotice(`Đã xác nhận giao dịch ${selectedTransaction.transaction_code}.`);
      setSelectedTransaction({ ...selectedTransaction, status: "SUCCESS" });
      await loadTransactions();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể cập nhật trạng thái giao dịch.");
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="text-[12px] text-slate-500"><span>VIP &amp; Doanh thu</span><span className="mx-2 text-slate-300">/</span><span className="font-medium text-[#1d4ed8]">Giao dịch VIP</span></div>
            <span className="hidden text-[11px] text-slate-500 sm:inline">Giao dịch gói quảng bá của chủ trọ</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[24px] font-bold leading-tight text-slate-900">Giao dịch VIP</h1>
              <p className="mt-2 text-[12px] text-slate-500">Theo dõi và quản lý các giao dịch thanh toán gói VIP của chủ trọ.</p>
            </div>
            <div className="text-[12px] font-medium text-slate-500">{filteredTransactions.length} giao dịch</div>
          </div>
        </section>

        {notice ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo" className="rounded p-1 hover:bg-emerald-100"><X className="h-4 w-4" /></button></div> : null}
        {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</div> : null}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4 xl:flex-row xl:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Tìm chủ trọ, email hoặc mã giao dịch" aria-label="Tìm chủ trọ, email hoặc mã giao dịch" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300" />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Lọc trạng thái giao dịch" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-300">
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} aria-label="Lọc phương thức thanh toán" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-300">
                <option value="ALL">Mọi phương thức</option>
                <option value="VIETQR">VietQR</option>
                <option value="BANK_TRANSFER">Chuyển khoản</option>
                <option value="ADMIN_MANUAL">Admin</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-500">
                <span>Từ</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="Ngày bắt đầu" className="min-w-0 bg-transparent text-[12px] text-slate-700 outline-none" />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-500">
                <span>Đến</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="Ngày kết thúc" className="min-w-0 bg-transparent text-[12px] text-slate-700 outline-none" />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-245 w-full text-left">
              <thead className="bg-slate-50 text-[12px] font-semibold uppercase tracking-[0.02em] text-slate-500">
                <tr><th className="px-4 py-3">Mã giao dịch</th><th className="px-3 py-3">Chủ trọ</th><th className="px-3 py-3">Gói VIP</th><th className="px-3 py-3">Số tiền</th><th className="px-3 py-3">Phương thức</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Thời gian</th><th className="px-3 py-3 text-right">Thao tác</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[13px] text-slate-700">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.transaction_id} tabIndex={0} role="button" aria-label={`Mở giao dịch ${transaction.transaction_code}`} className="cursor-pointer bg-white hover:bg-slate-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" onClick={(event) => { if (!isInteractiveTarget(event.target)) setSelectedTransaction(transaction); }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedTransaction(transaction); } }}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#2d5af5]">{transaction.transaction_code}</td>
                    <td className="px-3 py-3"><div className="flex min-w-48 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dfeaff] text-[11px] font-semibold text-[#254ad8]">{initials(transaction.full_name)}</span><span className="min-w-0"><span className="block font-semibold text-slate-800">{transaction.full_name}</span><span className="mt-0.5 block text-[12px] text-slate-500">{transaction.email}</span></span></div></td>
                    <td className="whitespace-nowrap px-3 py-3">Gói VIP</td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{formatCurrency(transaction.amount)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{paymentLabels[transaction.payment_method]}</td>
                    <td className="px-3 py-3"><VIPStatusBadge status={transaction.status} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-slate-500">{formatDate(transaction.created_at)}</td>
                    <td className="px-3 py-3 text-right"><button type="button" onClick={() => setSelectedTransaction(transaction)} aria-label={`Xem giao dịch ${transaction.transaction_code}`} className="rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100"><Eye className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredTransactions.length ? <div className="px-4 py-10 text-center text-[13px] text-slate-500">Không tìm thấy giao dịch phù hợp.</div> : null}
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Hiển thị {filteredTransactions.length} giao dịch VIP</span>
            <div className="flex items-center gap-1"><button type="button" disabled className="rounded-lg border border-slate-200 p-1.5 text-slate-300" aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></button><span className="px-2 font-medium text-slate-700">1</span><button type="button" disabled className="rounded-lg border border-slate-200 p-1.5 text-slate-300" aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></button></div>
          </div>
        </section>
      </div>

      {selectedTransaction ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTransaction(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="vip-transaction-title" className="max-h-[calc(100vh-2rem)] w-full max-w-140 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><h2 id="vip-transaction-title" className="text-[17px] font-bold text-slate-900">Chi tiết giao dịch VIP</h2><VIPStatusBadge status={selectedTransaction.status} /></div><p className="break-all text-[13px] font-medium text-slate-500">{selectedTransaction.transaction_code}</p></div><button type="button" onClick={() => setSelectedTransaction(null)} aria-label="Đóng chi tiết giao dịch" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfeaff] text-[12px] font-semibold text-[#254ad8]">{initials(selectedTransaction.full_name)}</span><div className="min-w-0"><p className="text-[14px] font-semibold text-slate-800">{selectedTransaction.full_name}</p><p className="break-all text-[13px] text-slate-500">{selectedTransaction.email} · Mã chủ trọ {selectedTransaction.user_id}</p></div></div>
            <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <Detail label="Mã giao dịch" value={selectedTransaction.transaction_code} />
              <Detail label="Gói VIP" value="Gói VIP" />
              <Detail label="Số tiền" value={formatCurrency(selectedTransaction.amount)} />
              <Detail label="Phương thức thanh toán" value={paymentLabels[selectedTransaction.payment_method]} />
              <Detail label="Thời gian" value={formatDate(selectedTransaction.created_at)} />
              <div><dt className="text-[12px] text-slate-500">Trạng thái</dt><dd className="mt-1"><VIPStatusBadge status={selectedTransaction.status} /></dd></div>
              <div className="sm:col-span-2"><Detail label="Mã chủ trọ" value={String(selectedTransaction.user_id)} /></div>
            </dl>
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] leading-5 text-slate-500">Dữ liệu giao dịch được lấy từ backend HubStay.</p>
          </div>
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">
            <button type="button" onClick={() => setSelectedTransaction(null)} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">Đóng</button>
            {selectedTransaction.status === "PENDING" ? <button type="button" onClick={confirmTransaction} className="inline-flex items-center gap-2 rounded-lg bg-[#3159df] px-3.5 py-2.5 text-[13px] font-medium text-white hover:bg-blue-700"><Check className="h-4 w-4" />Xác nhận giao dịch</button> : null}
          </footer>
        </section>
      </div> : null}
    </AdminLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[12px] text-slate-500">{label}</dt><dd className="mt-1 wrap-break-word text-[13px] font-medium text-slate-800">{value}</dd></div>;
}
