"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, Clock3, Search, X } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { ApiError, adminApi, type AdminVerification } from "@/services/api";

const accountLabels: Record<string, string> = {
  STUDENT: "Sinh viên",
  WORKER: "Người đi làm",
  LANDLORD: "Chủ trọ",
};

const statusLabels: Record<AdminVerification["status"], string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã xác thực",
  REJECTED: "Từ chối",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default function VerificationPage() {
  const [applications, setApplications] = useState<AdminVerification[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadApplications() {
    setIsLoading(true);
    try {
      const result = await adminApi.verifications();
      setApplications(result.items);
      setError("");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể tải hồ sơ xác thực.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void adminApi.verifications()
      .then((result) => {
        if (!cancelled) {
          setApplications(result.items);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải hồ sơ xác thực.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("vi-VN");
    return applications.filter((item) => !search ||
      `${item.name} ${item.email} ${item.id}`.toLocaleLowerCase("vi-VN").includes(search));
  }, [applications, query]);
  const pending = applications.filter((item) => item.status === "PENDING").length;
  const approved = applications.filter((item) => item.status === "APPROVED").length;
  const rejected = applications.filter((item) => item.status === "REJECTED").length;

  async function review(application: AdminVerification, status: "APPROVED" | "REJECTED") {
    const reason = status === "REJECTED" ? window.prompt("Nhập lý do từ chối hồ sơ:")?.trim() : undefined;
    if (status === "REJECTED" && !reason) return;
    if (status === "APPROVED" && !window.confirm(`Duyệt hồ sơ của ${application.name}?`)) return;

    setBusyId(application.id);
    setError("");
    try {
      await adminApi.reviewVerification(application.id, status, reason);
      setNotice(`${status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"} hồ sơ của ${application.name}.`);
      await loadApplications();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không thể cập nhật hồ sơ xác thực.");
    } finally {
      setBusyId(null);
    }
  }

  const stats = [
    { label: "CHỜ XÁC THỰC", value: pending, icon: Clock3, tone: "amber" },
    { label: "ĐÃ XÁC THỰC", value: approved, icon: BadgeCheck, tone: "emerald" },
    { label: "TỪ CHỐI", value: rejected, icon: X, tone: "rose" },
    { label: "TỔNG HỒ SƠ", value: applications.length, icon: Check, tone: "blue" },
  ] as const;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[12px] font-medium text-slate-500">DỮ LIỆU ĐỒNG BỘ TỪ BACKEND</p>
          <h1 className="mt-2 text-[24px] font-bold text-slate-900">Duyệt hồ sơ xác thực</h1>
          <p className="mt-1 text-[13px] text-slate-500">Hồ sơ và trạng thái được tải trực tiếp từ HubStay API.</p>
        </section>

        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{notice}</p> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] font-semibold text-slate-500">{label}</p>
                <Icon className={`h-5 w-5 ${tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : tone === "emerald" ? "text-emerald-600" : "text-blue-600"}`} />
              </div>
              <p className="mt-3 text-[28px] font-bold text-slate-900">{value.toLocaleString("vi-VN")}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <label className="relative block max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Tìm theo tên, email hoặc mã hồ sơ" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[13px] outline-none focus:border-blue-300" />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.02em] text-slate-500">
                <tr><th className="px-3 py-3">Mã hồ sơ</th><th className="px-3 py-3">Người dùng</th><th className="px-3 py-3">Loại tài khoản</th><th className="px-3 py-3">Giấy tờ</th><th className="px-3 py-3">Ngày gửi</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3 text-right">Thao tác</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[13px] text-slate-700">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-semibold text-blue-700">#{item.id}</td>
                    <td className="px-3 py-3"><p className="font-semibold text-slate-800">{item.name}</p><p className="text-[12px] text-slate-500">{item.email}</p></td>
                    <td className="px-3 py-3">{accountLabels[item.accountType] ?? item.accountType}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {item.frontCardUrl ? <a href={item.frontCardUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">Mặt trước</a> : <span className="text-slate-400">Không có ảnh</span>}
                        {item.backCardUrl ? <a href={item.backCardUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">Mặt sau</a> : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDate(item.createdAt)}</td>
                    <td className="px-3 py-3">{statusLabels[item.status]}</td>
                    <td className="px-3 py-3 text-right">
                      {item.status === "PENDING" ? <div className="inline-flex gap-2">
                        <button type="button" disabled={busyId === item.id} onClick={() => void review(item, "APPROVED")} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium text-emerald-700 disabled:opacity-50">Duyệt</button>
                        <button type="button" disabled={busyId === item.id} onClick={() => void review(item, "REJECTED")} className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[12px] font-medium text-rose-700 disabled:opacity-50">Từ chối</button>
                      </div> : <span className="text-slate-400">Đã xử lý</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && !filtered.length ? <p className="px-4 py-10 text-center text-[13px] text-slate-500">Không có hồ sơ phù hợp.</p> : null}
            {isLoading ? <p className="px-4 py-10 text-center text-[13px] text-slate-500">Đang tải hồ sơ từ backend...</p> : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
