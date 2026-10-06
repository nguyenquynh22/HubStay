"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Clock3, Search, ShieldAlert, X } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { ApiError, adminApi, type AdminReport } from "@/services/api";

const statusLabels: Record<string, string> = {
  PENDING: "Chờ xử lý",
  IN_PROGRESS: "Đang kiểm tra",
  RESOLVED: "Đã xử lý",
  DISMISSED: "Không vi phạm",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    void adminApi.reports()
      .then((result) => {
        if (!cancelled) {
          setReports(result.items);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải báo cáo.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("vi-VN");
    return reports.filter((item) => !search ||
      `${item.id} ${item.reason} ${item.reporter.name} ${item.reporter.email} ${item.target.name} ${item.post.title}`.toLocaleLowerCase("vi-VN").includes(search));
  }, [reports, query]);
  const pending = reports.filter((item) => item.status === "PENDING").length;
  const inProgress = reports.filter((item) => item.status === "IN_PROGRESS").length;
  const resolved = reports.filter((item) => item.status === "RESOLVED").length;
  const dismissed = reports.filter((item) => item.status === "DISMISSED").length;
  const reportStats = [
    { label: "BÁO CÁO CHỜ XỬ LÝ", value: pending, icon: Clock3, tone: "blue" },
    { label: "ĐANG KIỂM TRA", value: inProgress, icon: AlertTriangle, tone: "amber" },
    { label: "ĐÃ XỬ LÝ", value: resolved, icon: CheckCircle2, tone: "emerald" },
    { label: "KHÔNG VI PHẠM", value: dismissed, icon: ShieldAlert, tone: "rose" },
  ] as const;

  async function resolveReport(report: AdminReport, status: "RESOLVED" | "DISMISSED") {
    setBusyId(report.id);
    setError("");
    try {
      await adminApi.reviewReport(report.id, status);
      setReports((items) => items.map((item) => item.id === report.id ? { ...item, status } : item));
      setSelected((item) => item?.id === report.id ? { ...item, status } : item);
      setNotice(`Đã cập nhật báo cáo #${report.id}: ${statusLabels[status]}.`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể cập nhật báo cáo.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[12px] font-medium text-slate-500">DỮ LIỆU ĐỒNG BỘ TỪ BACKEND</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div><h1 className="text-[24px] font-bold text-slate-900">Quản lý báo cáo</h1><p className="mt-1 text-[13px] text-slate-500">Tiếp nhận và xử lý báo cáo do người dùng gửi.</p></div>
            <span className="text-[13px] text-slate-500">{pending.toLocaleString("vi-VN")} báo cáo chờ xử lý</span>
          </div>
        </section>
        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{notice}</p> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {reportStats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] font-medium text-slate-500">{label}</p>
                <Icon className={`h-5 w-5 ${tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : tone === "emerald" ? "text-emerald-600" : "text-blue-600"}`} />
              </div>
              <p className="mt-3 text-[27px] font-bold leading-none tracking-tight text-slate-900">{value.toLocaleString("vi-VN")}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="relative block max-w-[420px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Tìm mã, người dùng hoặc nội dung báo cáo" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[12px] outline-none focus:border-blue-300" />
          </label>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.02em] text-slate-500"><tr><th className="px-4 py-3">Mã</th><th className="px-3 py-3">Người báo cáo</th><th className="px-3 py-3">Đối tượng</th><th className="px-3 py-3">Bài đăng</th><th className="px-3 py-3">Lý do</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Thời gian</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-200 text-[11px] text-slate-700">
                {filtered.map((report) => (
                  <tr key={report.id}>
                    <td className="px-4 py-3 font-semibold text-[#2d5af5]">#{report.id}</td>
                    <td className="px-3 py-3"><p className="font-medium">{report.reporter.name || "Không rõ"}</p><p className="text-[12px] text-slate-500">{report.reporter.email}</p></td>
                    <td className="px-3 py-3">{report.target.name || "Không rõ"}</td>
                    <td className="max-w-[170px] px-3 py-3 text-slate-600">{report.post.title || "Bài đăng không còn tồn tại"}</td>
                    <td className="px-3 py-3">{report.reason || "Không có nội dung"}</td>
                    <td className="px-3 py-3">{statusLabels[report.status] ?? report.status}</td>
                    <td className="whitespace-pre-line px-3 py-3 text-slate-500">{formatDate(report.createdAt)}</td>
                    <td className="px-3 py-3 text-right"><button type="button" onClick={() => setSelected(report)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-100">Chi tiết</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isLoading ? <p className="px-4 py-10 text-center text-[13px] text-slate-500">Đang tải báo cáo từ backend...</p> : null}
            {!isLoading && !filtered.length ? <p className="px-4 py-10 text-center text-[13px] text-slate-500">Không có báo cáo phù hợp.</p> : null}
          </div>
        </section>
      </div>

      {selected ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="report-detail-title" className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
          <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div><h2 id="report-detail-title" className="font-bold text-slate-900">Báo cáo #{selected.id}</h2><p className="mt-1 text-[12px] text-slate-500">{formatDate(selected.createdAt)} · {statusLabels[selected.status] ?? selected.status}</p></div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Đóng chi tiết" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </header>
          <div className="space-y-3 px-5 py-4 text-[13px]">
            <p><strong>Người báo cáo:</strong> {selected.reporter.name} ({selected.reporter.email})</p>
            <p><strong>Đối tượng:</strong> {selected.target.name} ({selected.target.email})</p>
            <p><strong>Bài đăng:</strong> {selected.post.title}</p>
            <p><strong>Lý do:</strong> {selected.reason}</p>
            {selected.description ? <p><strong>Mô tả:</strong> {selected.description}</p> : null}
          </div>
          {selected.status === "PENDING" ? <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
            <button type="button" disabled={busyId === selected.id} onClick={() => void resolveReport(selected, "DISMISSED")} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-700 disabled:opacity-50">Không vi phạm</button>
            <button type="button" disabled={busyId === selected.id} onClick={() => void resolveReport(selected, "RESOLVED")} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />Đánh dấu đã xử lý</button>
          </footer> : null}
        </section>
      </div> : null}
    </AdminLayout>
  );
}
