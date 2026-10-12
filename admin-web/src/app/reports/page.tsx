"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, CheckCircle2, Clock3, ExternalLink, Search, ShieldAlert, X } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { PostImageWithFallback } from "@/components/PostImageWithFallback";
import { ApiError, adminApi, resolveMediaUrl, type AdminReport } from "@/services/api";

const statusLabels: Record<string, string> = {
  PENDING: "Chờ xử lý",
  RESOLVED: "Đã chấp thuận",
  DISMISSED: "Từ chối",
};
const postStatusLabels: Record<string, string> = {
  AVAILABLE: "Đang cho thuê",
  RENTED: "Đã cho thuê",
  HIDDEN: "Đã ẩn",
};
const postTypeLabels: Record<string, string> = {
  RENTAL: "Cho thuê",
  SHARE: "Ở ghép",
  PASS: "Nhượng phòng",
  FIND: "Tìm phòng",
};
type ReportFilter = "ALL" | "PENDING" | "PROCESSED";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function reportStatusLabel(report: AdminReport) {
  return report.decisionReversed
    ? "Đã hoàn tác kết luận vi phạm"
    : statusLabels[report.status] ?? report.status;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function isLikelyDuplicate(first: AdminReport, second: AdminReport) {
  return Boolean(first.reporter.email) &&
    first.reporter.email.toLocaleLowerCase() === second.reporter.email.toLocaleLowerCase() &&
    first.reason.trim().toLocaleLowerCase() === second.reason.trim().toLocaleLowerCase() &&
    first.description.trim() === second.description.trim() &&
    (first.evidenceImageUrl ?? "") === (second.evidenceImageUrl ?? "");
}

export default function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportFilter>("ALL");
  const [selected, setSelected] = useState<AdminReport | null>(null);
  const returnReportOpened = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const syncReports = async (initialLoad = false) => {
      if (!initialLoad && document.visibilityState === "hidden") return;
      try {
        const result = await adminApi.reports();
        if (cancelled) return;
        setReports(result.items);
        setSelected((current) =>
          current
            ? result.items.find((item) => item.id === current.id) ?? current
            : null,
        );
        const returnParams = new URLSearchParams(window.location.search);
        const returnReportId = Number(returnParams.get("returnToReport"));
        const returnPostId = Number(returnParams.get("returnToPost"));
        if (!returnReportOpened.current && Number.isInteger(returnReportId) && returnReportId > 0) {
          const reportToOpen = result.items.find((item) => item.id === returnReportId);
          if (reportToOpen) {
            setSelected(reportToOpen);
            returnReportOpened.current = true;
          }
        } else if (!returnReportOpened.current && Number.isInteger(returnPostId) && returnPostId > 0) {
          const reportToOpen = result.items.find((item) =>
            item.post.id === returnPostId && item.status === "PENDING",
          ) ?? result.items.find((item) => item.post.id === returnPostId);
          if (reportToOpen) {
            setSelected(reportToOpen);
            returnReportOpened.current = true;
          }
        }
        setError("");
      } catch (reason: unknown) {
        if (!cancelled && initialLoad) {
          setError(reason instanceof ApiError ? reason.message : "Không thể tải báo cáo.");
        }
      } finally {
        if (!cancelled && initialLoad) setIsLoading(false);
      }
    };
    void syncReports(true);
    const interval = window.setInterval(() => void syncReports(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("vi-VN");
    return reports.filter((item) => {
      const matchesSearch = !search ||
        `${item.reason} ${item.description} ${item.reporter.name} ${item.reporter.email} ${item.target.name} ${item.post.title}`.toLocaleLowerCase("vi-VN").includes(search);
      const matchesStatus = statusFilter === "ALL" ||
        (statusFilter === "PENDING" ? item.status === "PENDING" : item.status !== "PENDING");
      return matchesSearch && matchesStatus;
    });
  }, [reports, query, statusFilter]);
  const pending = reports.filter((item) => item.status === "PENDING").length;
  const resolved = reports.filter((item) => item.status === "RESOLVED").length;
  const dismissed = reports.filter((item) => item.status === "DISMISSED").length;
  const withEvidence = reports.filter((item) => Boolean(item.evidenceImageUrl)).length;
  const reportStats = [
    { label: "BÁO CÁO CHỜ XỬ LÝ", value: pending, icon: Clock3, tone: "blue" },
    { label: "ĐÃ CHẤP THUẬN", value: resolved, icon: CheckCircle2, tone: "emerald" },
    { label: "BỊ TỪ CHỐI", value: dismissed, icon: ShieldAlert, tone: "rose" },
    { label: "CÓ ẢNH BẰNG CHỨNG", value: withEvidence, icon: Search, tone: "amber" },
  ] as const;

  function openReport(report: AdminReport) {
    setSelected(report);
    setError("");
    setNotice("");
  }

  async function reviewReport(report: AdminReport, status: "RESOLVED" | "DISMISSED") {
    if (status === "RESOLVED" && !window.confirm(
      `Xác nhận kết luận báo cáo #${report.id} là có vi phạm? Bài đăng sẽ bị ẩn khỏi danh sách công khai.`,
    )) {
      return;
    }
    setBusyId(report.id);
    setError("");
    try {
      const result = await adminApi.reviewReport(report.id, status);
      const updated = {
        ...report,
        ...result.data,
        post: result.data.postStatus
          ? { ...report.post, status: result.data.postStatus }
          : report.post,
      };
      setReports((items) => items.map((item) => {
        const samePost = item.post.id === report.post.id;
        const sameOwner = Boolean(report.target.email) && item.target.email === report.target.email;
        if (!samePost && !(sameOwner && result.data.sanction && result.data.sanction !== "WARNING")) return item;
        return {
          ...item,
          ...(samePost && status === "RESOLVED" ? { status: "RESOLVED" as const } : samePost && item.id === report.id ? { status } : {}),
          ...(samePost ? { pendingReportCount: result.data.pendingReportCount } : {}),
          post: samePost
            ? updated.post
            : { ...item.post, status: "HIDDEN" },
        };
      }));
      setSelected((item) => item?.id === report.id ? updated : item);
      setNotice(
        status === "RESOLVED"
          ? `Đã chấp thuận báo cáo, ẩn bài đăng và xử lý chế tài chủ bài (vi phạm lần ${result.data.strikeCount ?? "?"}${result.data.sanction === "SEVEN_DAY_RESTRICTION" ? ", khóa đăng bài 7 ngày" : result.data.sanction === "PERMANENT_BAN" ? ", khóa tài khoản vĩnh viễn" : ""}).`
          : `Đã từ chối báo cáo. Bài đăng vẫn được giữ nguyên.`,
      );
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : reason instanceof Error
            ? `Không thể cập nhật báo cáo: ${reason.message}`
            : "Không thể cập nhật báo cáo do lỗi không xác định.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function undoReportDecision(report: AdminReport, retryRestore = false) {
    const reason = window.prompt(
      retryRestore
        ? "Nhập lý do thử khôi phục bài đã hoàn tác (bắt buộc, tối thiểu 5 ký tự):"
        : "Nhập lý do hoàn tác kết luận vi phạm (bắt buộc, tối thiểu 5 ký tự):",
    )?.trim();
    if (!reason) return;
    if (reason.length < 5 || reason.length > 400) {
      setError("Lý do hoàn tác phải có từ 5 đến 400 ký tự.");
      return;
    }
    if (!window.confirm(
      retryRestore
        ? "Thử khôi phục bài đã hoàn tác. Bài chỉ được hiện lại nếu không còn chế tài hoặc ngưỡng báo cáo đang chặn. Tiếp tục?"
        : "Hoàn tác kết luận này sẽ chuyển các báo cáo của bài đăng sang 'Từ chối', tính lại strike và có thể khôi phục quyền hiển thị bài. Tiếp tục?",
    )) return;

    setBusyId(report.id);
    setError("");
    setNotice("");
    try {
      const result = await adminApi.undoReportDecision(report.id, reason);
      const changed = reports
        .filter((item) => item.post.id === report.post.id && item.status === "RESOLVED")
        .map((item) => item.id);
      setReports((items) => items.map((item) => {
        if (item.post.id !== report.post.id) return item;
        return {
          ...item,
          ...(changed.includes(item.id)
            ? { status: "DISMISSED" as const, decisionReversed: true, reversalNote: `Lý do hoàn tác: ${reason}` }
            : {}),
          pendingReportCount: result.data.pendingReportCount,
          post: { ...item.post, status: result.data.postStatus },
        };
      }));
      setSelected((current) => current?.post.id === report.post.id
        ? {
            ...current,
            ...(changed.includes(current.id)
              ? { status: "DISMISSED" as const, decisionReversed: true, reversalNote: `Lý do hoàn tác: ${reason}` }
              : {}),
            pendingReportCount: result.data.pendingReportCount,
            post: { ...current.post, status: result.data.postStatus },
          }
        : current);
      const postOutcome = result.data.postStatus === "AVAILABLE"
        ? "Bài đăng đã hiển thị lại trên mobile."
        : result.data.postStatus === "RENTED"
          ? "Bài được phục hồi trạng thái đã cho thuê; bài không xuất hiện trong danh sách phòng đang cho thuê."
          : "Bài vẫn đang ẩn do trạng thái trước đó hoặc chế tài còn hiệu lực.";
      setNotice(
        `${retryRestore ? "Đã kiểm tra lại việc khôi phục." : "Đã hoàn tác kết luận."} Báo cáo liên quan đã được cập nhật, strike còn ${result.data.strikeCount}. ${postOutcome} Lý do: ${reason}`,
      );
    } catch (reasonError) {
      setError(
        reasonError instanceof ApiError
          ? reasonError.message
          : reasonError instanceof Error
            ? `Không thể hoàn tác kết luận: ${reasonError.message}`
            : "Không thể hoàn tác kết luận do lỗi không xác định.",
      );
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
            <span className="text-[13px] text-slate-500">{pending.toLocaleString("vi-VN")} báo cáo chờ xử lý · tự cập nhật mỗi 5 giây</span>
          </div>
        </section>
        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{notice}</p> : null}

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="relative block min-w-[240px] max-w-[420px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Tìm người dùng hoặc nội dung báo cáo" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[12px] outline-none focus:border-blue-300" />
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Lọc trạng thái báo cáo">
              {([
                ["ALL", `Tất cả (${reports.length})`],
                ["PENDING", `Chưa xử lý (${pending})`],
                ["PROCESSED", `Đã xử lý (${resolved + dismissed})`],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${statusFilter === value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.02em] text-slate-500"><tr><th className="px-3 py-3">Người báo cáo</th><th className="px-3 py-3">Đối tượng</th><th className="px-3 py-3">Bài đăng</th><th className="px-3 py-3">Lý do</th><th className="px-3 py-3">Lượt chờ</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Thời gian</th><th className="sticky right-0 bg-slate-50 px-3 py-3 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-200 text-[11px] text-slate-700">
                {filtered.map((report) => (
                  <tr
                    key={report.id}
                    tabIndex={0}
                    aria-label={`Mở chi tiết báo cáo ${report.id}`}
                    onClick={() => openReport(report)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openReport(report);
                      }
                    }}
                    className={`cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${report.status === "PENDING" ? "border-l-4 border-l-amber-400 bg-amber-50/30 hover:bg-amber-50" : "border-l-4 border-l-emerald-500 hover:bg-emerald-50/40"}`}
                  >
                    <td className="px-3 py-3"><p className="font-medium">{report.reporter.name || "Không rõ"}</p><p className="text-[12px] text-slate-500">{report.reporter.email}</p></td>
                    <td className="px-3 py-3">{report.target.name || "Không rõ"}</td>
                    <td className="max-w-[170px] px-3 py-3 text-slate-600">{report.post.title || "Bài đăng không còn tồn tại"}</td>
                    <td className="px-3 py-3">{report.reason || "Không có nội dung"}</td>
                    <td className="px-3 py-3 font-semibold">{report.pendingReportCount ?? 0}</td>
                    <td className="px-3 py-3"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${report.status === "PENDING" ? "bg-amber-100 text-amber-800" : report.decisionReversed ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"}`}>{report.status === "PENDING" ? "● Chưa xử lý" : `✓ Đã xử lý · ${reportStatusLabel(report)}`}</span></td>
                    <td className="whitespace-pre-line px-3 py-3 text-slate-500">{formatDate(report.createdAt)}</td>
                    <td className="sticky right-0 bg-white px-3 py-3 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); openReport(report); }} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-100">Chi tiết</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isLoading ? <p className="px-4 py-10 text-center text-[13px] text-slate-500">Đang tải báo cáo từ backend...</p> : null}
            {!isLoading && !filtered.length ? <p className="px-4 py-10 text-center text-[13px] text-slate-500">Không có báo cáo phù hợp.</p> : null}
          </div>
        </section>
      </div>

      {selected ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" onClick={() => setSelected(null)}>
        <section role="dialog" aria-modal="true" aria-labelledby="report-detail-title" onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
          <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div><h2 id="report-detail-title" className="font-bold text-slate-900">Chi tiết báo cáo #{selected.id}</h2><p className="mt-1 text-[12px] text-slate-500">{formatDate(selected.createdAt)} · {reportStatusLabel(selected)}</p></div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Đóng chi tiết" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </header>
          {notice ? <p role="status" className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">{notice}</p> : null}
          {error ? <p role="alert" className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p> : null}
          <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Thông tin báo cáo</h3>
                {selected.decisionReversed ? <p className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] text-violet-800">{selected.reversalNote || "Kết luận vi phạm trước đây đã được hoàn tác."}</p> : null}
                <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
                  <div><dt className="text-slate-500">Lý do</dt><dd className="mt-1 font-medium text-slate-900">{selected.reason || "Chưa cung cấp"}</dd></div>
                  <div><dt className="text-slate-500">Gửi lúc</dt><dd className="mt-1 text-slate-800">{formatDate(selected.createdAt)}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-slate-500">Mô tả của người báo cáo</dt><dd className="mt-1 whitespace-pre-wrap text-slate-800">{selected.description || "Không có mô tả bổ sung."}</dd></div>
                </dl>
                {selected.evidenceImageUrl ? (
                  <a href={resolveMediaUrl(selected.evidenceImageUrl)} target="_blank" rel="noreferrer" className="mt-4 block w-fit">
                    <Image src={resolveMediaUrl(selected.evidenceImageUrl)} alt="Ảnh bằng chứng báo cáo" width={640} height={420} unoptimized className="max-h-72 w-auto rounded-lg border border-slate-200 object-contain" />
                    <span className="mt-1 block text-xs font-medium text-blue-600">Mở ảnh bằng chứng kích thước đầy đủ</span>
                  </a>
                ) : <p className="mt-3 text-xs text-slate-500">Người dùng không đính kèm ảnh bằng chứng.</p>}
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Dữ liệu tương tác được đối chiếu</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Các mã dưới đây được đối chiếu từ dữ liệu tương tác hiện có theo người báo cáo và bài đăng; chúng không được lưu trong bản ghi báo cáo.
                </p>
                <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
                  {selected.interactionEvidence?.chat ? (
                    <>
                      <div><dt className="text-slate-500">Mã cuộc trò chuyện</dt><dd className="mt-1 break-all font-mono text-xs text-slate-800">{selected.interactionEvidence.chat.conversationId}</dd></div>
                      <div><dt className="text-slate-500">Mã tin nhắn người báo cáo đã gửi</dt><dd className="mt-1 break-all font-mono text-xs text-slate-800">{selected.interactionEvidence.chat.messageId}</dd></div>
                      <div><dt className="text-slate-500">Thời điểm gửi tin nhắn</dt><dd className="mt-1 text-slate-800">{selected.interactionEvidence.chat.messageAt ? formatDate(selected.interactionEvidence.chat.messageAt) : "Không rõ"}</dd></div>
                    </>
                  ) : null}
                  {selected.interactionEvidence?.appointmentId ? (
                    <div><dt className="text-slate-500">Mã lịch hẹn</dt><dd className="mt-1 font-mono text-xs text-slate-800">{selected.interactionEvidence.appointmentId}</dd></div>
                  ) : null}
                  {selected.interactionEvidence?.rentalRequestId ? (
                    <div><dt className="text-slate-500">Mã yêu cầu thuê</dt><dd className="mt-1 font-mono text-xs text-slate-800">{selected.interactionEvidence.rentalRequestId}</dd></div>
                  ) : null}
                </dl>
                {!selected.interactionEvidence?.chat &&
                !selected.interactionEvidence?.appointmentId &&
                !selected.interactionEvidence?.rentalRequestId ? (
                  <p className="mt-3 text-xs text-slate-600">
                    {selected.interactionEvidence?.chatLookupAvailable === false
                      ? "Không thể truy xuất dữ liệu trò chuyện hiện tại; hãy thử tải lại để kiểm tra."
                      : "Không tìm thấy tương tác đã lưu nào khớp với báo cáo này."}
                  </p>
                ) : null}
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-semibold text-slate-900">{selected.post.title || "Bài đăng không còn tồn tại"}</h3><p className="mt-1 text-xs text-slate-500">Bài đăng #{selected.post.id || "—"} · {selected.post.reportCount ?? 0} báo cáo liên quan</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${selected.post.verified && selected.post.status === "AVAILABLE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{selected.post.verified && selected.post.status === "AVAILABLE" ? "Đang hiển thị công khai" : "Không hiển thị công khai"}</span>
                </div>
                <dl className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
                  <div><dt className="text-slate-500">Loại tin</dt><dd className="mt-1 text-slate-800">{postTypeLabels[selected.post.postType ?? ""] ?? selected.post.postType ?? "Chưa rõ"}</dd></div>
                  <div><dt className="text-slate-500">Trạng thái</dt><dd className="mt-1 text-slate-800">{selected.post.status === "HIDDEN" && (selected.pendingReportCount ?? 0) >= 3 ? "Tạm ẩn do có nhiều báo cáo đang chờ" : postStatusLabels[selected.post.status ?? ""] ?? selected.post.status ?? "Không rõ"}</dd></div>
                  <div><dt className="text-slate-500">Giá thuê</dt><dd className="mt-1 text-slate-800">{selected.post.price == null ? "Chưa cung cấp" : `${formatCurrency(selected.post.price)}/tháng`}</dd></div>
                  <div><dt className="text-slate-500">Diện tích</dt><dd className="mt-1 text-slate-800">{selected.post.area == null ? "Chưa cung cấp" : `${selected.post.area} m²`}</dd></div>
                  <div><dt className="text-slate-500">Địa chỉ</dt><dd className="mt-1 text-slate-800">{selected.post.address || "Chưa cung cấp"}</dd></div>
                  <div><dt className="text-slate-500">Ngày đăng</dt><dd className="mt-1 text-slate-800">{selected.post.createdAt ? formatDate(selected.post.createdAt) : "Không rõ"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-slate-500">Nội dung bài đăng</dt><dd className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap text-slate-800">{selected.post.description || "Không có mô tả."}</dd></div>
                </dl>
                {selected.post.imageUrls?.length ? <div className="mt-4 flex gap-2 overflow-x-auto">{selected.post.imageUrls.map((url, index) => <a key={`${url}-${index}`} href={resolveMediaUrl(url)} target="_blank" rel="noreferrer" className="block shrink-0 rounded-lg border border-slate-200"><PostImageWithFallback src={resolveMediaUrl(url)} alt={`Ảnh bài đăng ${index + 1}`} className="h-24 w-32 rounded-lg" /></a>)}</div> : <PostImageWithFallback src={null} alt="" className="mt-4 h-24 w-32 rounded-lg border border-slate-200" />}
                {selected.post.id ? <Link href={`/posts/${selected.post.id}?returnToReport=${selected.id}`} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"><ExternalLink className="h-3.5 w-3.5" />Mở bài đăng trong trang quản trị</Link> : null}
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Các báo cáo khác về bài này</h3>
                <div className="mt-3 space-y-3">
                  {reports
                    .filter((item) => item.post.id === selected.post.id && item.id !== selected.id)
                    .map((item) => (
                      <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-xs">
                        <div className="flex flex-wrap justify-between gap-2">
                          <span className="font-medium text-slate-800">
                            {item.reporter.name || "Người dùng"} · {item.reason}
                            {isLikelyDuplicate(selected, item) ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Có thể trùng nội dung</span> : null}
                          </span>
                          <span className="text-slate-500">{reportStatusLabel(item)} · {formatDate(item.createdAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-slate-600">{item.description || "Không có mô tả bổ sung."}</p>
                        {item.evidenceImageUrl ? <a href={resolveMediaUrl(item.evidenceImageUrl)} target="_blank" rel="noreferrer" className="mt-2 inline-block font-medium text-blue-600 hover:underline">Xem ảnh bằng chứng</a> : null}
                      </div>
                    ))}
                  {!reports.some((item) => item.post.id === selected.post.id && item.id !== selected.id) ? <p className="text-xs text-slate-500">Không có báo cáo nào khác về bài này.</p> : null}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-xl border border-slate-200 p-4 text-[13px]">
                <h3 className="font-semibold text-slate-900">Các bên liên quan</h3>
                <div className="mt-3 space-y-4">
                  <div><p className="text-xs font-medium uppercase text-slate-500">Người báo cáo</p><p className="mt-1 font-medium">{selected.reporter.name || "Không rõ"}</p><p className="text-slate-600">{selected.reporter.email || "Không có email"}</p><p className="text-slate-600">{selected.reporter.phone || "Không có số điện thoại"}</p></div>
                  <div className="border-t border-slate-100 pt-3"><p className="text-xs font-medium uppercase text-slate-500">Người đăng bị báo cáo</p><p className="mt-1 font-medium">{selected.target.name || "Không rõ"}</p><p className="text-slate-600">{selected.target.email || "Không có email"}</p><p className="text-slate-600">{selected.target.phone || "Không có số điện thoại"}</p></div>
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 p-4 text-[13px]">
                <h3 className="font-semibold text-slate-900">Cách xử lý</h3>
                <p className="mt-2 text-slate-600">Xem nội dung, ảnh bài đăng và toàn bộ báo cáo liên quan trước khi kết luận. Xác nhận vi phạm sẽ ẩn bài khỏi danh sách công khai; kết luận không vi phạm sẽ đóng báo cáo.</p>
              </section>
            </aside>
          </div>
          {selected.status === "PENDING" ? <footer className="border-t border-slate-200 px-5 py-4">
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={busyId === selected.id} onClick={() => void reviewReport(selected, "DISMISSED")} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-700 disabled:opacity-50">Kết luận không vi phạm</button>
              <button type="button" disabled={busyId === selected.id || !selected.post.id} onClick={() => void reviewReport(selected, "RESOLVED")} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />Xác nhận vi phạm & ẩn bài</button>
            </div>
          </footer> : selected.status === "RESOLVED" || (selected.decisionReversed && selected.post.status === "HIDDEN") ? <footer className="border-t border-slate-200 px-5 py-4">
            <p className="mb-3 text-xs text-slate-500">{selected.decisionReversed ? "Bài vẫn đang ẩn sau khi hoàn tác trước đó. Có thể thử đồng bộ khôi phục lại; hệ thống chỉ mở bài nếu không còn chế tài hoặc ngưỡng báo cáo đang chặn." : "Nếu phát hiện quyết định xác nhận vi phạm không chính xác, có thể hoàn tác. Hệ thống sẽ ghi nhận lý do, cập nhật báo cáo, tính lại strike và đồng bộ trạng thái bài trên mobile."}</p>
            <div className="flex justify-end">
              <button type="button" disabled={busyId === selected.id} onClick={() => void undoReportDecision(selected, selected.decisionReversed)} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50">{busyId === selected.id ? "Đang xử lý..." : selected.decisionReversed ? "Thử khôi phục bài đăng" : "Hoàn tác kết luận vi phạm"}</button>
            </div>
          </footer> : null}
        </section>
      </div> : null}
    </AdminLayout>
  );
}
