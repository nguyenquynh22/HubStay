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

type VerificationImageKind = "front" | "back" | "selfie";
type VerificationImageState =
  | { status: "loading" }
  | { status: "loaded"; url: string }
  | { status: "error"; message: string };

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
  const [selectedApplication, setSelectedApplication] = useState<AdminVerification | null>(null);
  const [verificationImages, setVerificationImages] = useState<
    Partial<Record<VerificationImageKind, VerificationImageState>>
  >({});
  const [imagePreview, setImagePreview] = useState<{ url: string; label: string } | null>(null);
  const [loadingImageKey, setLoadingImageKey] = useState("");

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview.url);
  }, [imagePreview]);

  useEffect(() => {
    if (!selectedApplication) {
      setVerificationImages({});
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];
    const images: Array<{ kind: VerificationImageKind; available: boolean; url: string | null }> = [
      { kind: "front", available: selectedApplication.frontImageAvailable, url: selectedApplication.frontCardUrl },
      { kind: "back", available: selectedApplication.backImageAvailable, url: selectedApplication.backCardUrl },
      { kind: "selfie", available: selectedApplication.selfieAvailable, url: null },
    ].filter((image) => image.available || Boolean(image.url));

    const initialState: Partial<Record<VerificationImageKind, VerificationImageState>> = {};
    for (const image of images) initialState[image.kind] = { status: "loading" };
    setVerificationImages(initialState);

    for (const image of images) {
      void (async () => {
        try {
          let url = image.url;
          if (image.available) {
            const blob = await adminApi.verificationImage(selectedApplication.id, image.kind);
            url = URL.createObjectURL(blob);
            if (cancelled) {
              URL.revokeObjectURL(url);
              return;
            }
            objectUrls.push(url);
          }
          if (!url) throw new Error("Không tìm thấy đường dẫn ảnh.");
          if (!cancelled) {
            setVerificationImages((current) => ({
              ...current,
              [image.kind]: { status: "loaded", url },
            }));
          }
        } catch (cause) {
          if (!cancelled) {
            setVerificationImages((current) => ({
              ...current,
              [image.kind]: {
                status: "error",
                message: cause instanceof ApiError ? cause.message : "Không thể tải ảnh.",
              },
            }));
          }
        }
      })();
    }

    return () => {
      cancelled = true;
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, [selectedApplication]);

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
      setSelectedApplication((current) => current?.id === application.id ? null : current);
      await loadApplications();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không thể cập nhật hồ sơ xác thực.");
    } finally {
      setBusyId(null);
    }
  }

  async function showImage(
    application: AdminVerification,
    kind: "front" | "back" | "selfie",
    label: string,
  ) {
    const key = `${application.id}-${kind}`;
    setLoadingImageKey(key);
    setError("");
    try {
      const image = await adminApi.verificationImage(application.id, kind);
      setImagePreview({ url: URL.createObjectURL(image), label });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không thể tải ảnh xác minh.");
    } finally {
      setLoadingImageKey("");
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

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Tìm theo tên hoặc email" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[13px] outline-none focus:border-blue-300" />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.02em] text-slate-500">
                <tr><th className="px-3 py-3">Người dùng</th><th className="px-3 py-3">Loại tài khoản</th><th className="px-3 py-3">Ảnh xác minh</th><th className="px-3 py-3">Ngày gửi</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3 text-right">Thao tác</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[13px] text-slate-700">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedApplication(item)}
                    className="cursor-pointer hover:bg-blue-50/50"
                  >
                    <td className="px-3 py-3"><p className="font-semibold text-slate-800">{item.name}</p><p className="text-[12px] text-slate-500">{item.email}</p></td>
                    <td className="px-3 py-3">{accountLabels[item.accountType] ?? item.accountType}</td>
                    <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                      <div className="flex gap-2">
                        {item.frontImageAvailable ? (
                          <button type="button" disabled={loadingImageKey === `${item.id}-front`} onClick={() => void showImage(item, "front", "Ảnh mặt trước")} className="text-blue-700 underline disabled:opacity-50">
                            {loadingImageKey === `${item.id}-front` ? "Đang tải..." : "Mặt trước"}
                          </button>
                        ) : item.frontCardUrl ? <a href={item.frontCardUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">Mặt trước</a> : <span className="text-slate-400">Không có ảnh</span>}
                        {item.backImageAvailable ? (
                          <button type="button" disabled={loadingImageKey === `${item.id}-back`} onClick={() => void showImage(item, "back", "Ảnh mặt sau")} className="text-blue-700 underline disabled:opacity-50">
                            {loadingImageKey === `${item.id}-back` ? "Đang tải..." : "Mặt sau"}
                          </button>
                        ) : item.backCardUrl ? <a href={item.backCardUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">Mặt sau</a> : null}
                      </div>
                      {item.selfieAvailable ? (
                        <button
                          type="button"
                          disabled={loadingImageKey === `${item.id}-selfie`}
                          onClick={() => void showImage(item, "selfie", "Ảnh chân dung")}
                          className="mt-2 text-blue-700 underline disabled:opacity-50"
                        >
                          {loadingImageKey === `${item.id}-selfie` ? "Đang tải ảnh..." : "Xem ảnh chân dung"}
                        </button>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDate(item.createdAt)}</td>
                    <td className="px-3 py-3">{statusLabels[item.status]}</td>
                    <td className="px-3 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="inline-flex gap-2">
                        {item.status === "PENDING" ? <>
                          <button type="button" disabled={busyId === item.id} onClick={() => void review(item, "APPROVED")} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium text-emerald-700 disabled:opacity-50">Duyệt</button>
                          <button type="button" disabled={busyId === item.id} onClick={() => void review(item, "REJECTED")} className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[12px] font-medium text-rose-700 disabled:opacity-50">Từ chối</button>
                        </> : <span className="self-center text-slate-400">Đã xử lý</span>}
                      </div>
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
      {selectedApplication ? (
        <div
          role="presentation"
          onClick={() => setSelectedApplication(null)}
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-4"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="verification-detail-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Chi tiết hồ sơ xác thực</p>
                <h2 id="verification-detail-title" className="mt-1 text-xl font-bold text-slate-900">
                  Hồ sơ #{selectedApplication.id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApplication(null)}
                aria-label="Đóng chi tiết hồ sơ"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-6 px-6 py-5">
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Thông tin người gửi</h3>
                <dl className="mt-3 grid gap-x-6 gap-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-500">Họ và tên</dt>
                    <dd className="mt-1 font-medium text-slate-900">{selectedApplication.name || "Chưa có thông tin"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Email</dt>
                    <dd className="mt-1 break-all font-medium text-slate-900">{selectedApplication.email || "Chưa có thông tin"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Loại tài khoản đăng ký xác thực</dt>
                    <dd className="mt-1 font-medium text-slate-900">{accountLabels[selectedApplication.accountType] ?? selectedApplication.accountType}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Ngày gửi hồ sơ</dt>
                    <dd className="mt-1 font-medium text-slate-900">{formatDate(selectedApplication.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Trạng thái</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        selectedApplication.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedApplication.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                      }`}>
                        {statusLabels[selectedApplication.status]}
                      </span>
                    </dd>
                  </div>
                  {selectedApplication.rejectionReason ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-slate-500">Lý do từ chối</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm text-rose-800">{selectedApplication.rejectionReason}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-900">Ảnh và giấy tờ đã gửi</h3>
                <p className="mt-1 text-xs text-slate-500">Chọn ảnh để mở bản xem lớn.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {([
                    { kind: "front", label: "Mặt trước giấy tờ", available: selectedApplication.frontImageAvailable, url: selectedApplication.frontCardUrl },
                    { kind: "back", label: "Mặt sau giấy tờ", available: selectedApplication.backImageAvailable, url: selectedApplication.backCardUrl },
                    { kind: "selfie", label: "Ảnh chân dung", available: selectedApplication.selfieAvailable, url: null },
                  ] as const).map((image) => {
                    const imageKey = `${selectedApplication.id}-${image.kind}`;
                    const imageState = verificationImages[image.kind];
                    return (
                      <div key={image.kind} className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="border-b border-slate-100 px-3 py-2">
                          <p className="text-sm font-medium text-slate-800">{image.label}</p>
                        </div>
                        {imageState?.status === "loaded" ? (
                          <button
                            type="button"
                            disabled={loadingImageKey === imageKey}
                            onClick={() => void showImage(selectedApplication, image.kind, image.label)}
                            className="block w-full bg-slate-50 p-2 disabled:opacity-60"
                            aria-label={`Mở ảnh lớn: ${image.label}`}
                          >
                            <img src={imageState.url} alt={image.label} className="h-48 w-full object-contain" />
                            <span className="mt-1 block text-xs text-blue-700">
                              {loadingImageKey === imageKey ? "Đang mở ảnh..." : "Chọn để xem ảnh lớn"}
                            </span>
                          </button>
                        ) : imageState?.status === "error" ? (
                          <p role="alert" className="p-4 text-xs text-rose-700">{imageState.message}</p>
                        ) : imageState?.status === "loading" ? (
                          <p className="p-4 text-xs text-slate-500">Đang tải ảnh...</p>
                        ) : (
                          <p className="p-4 text-xs text-slate-400">Không có ảnh</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {selectedApplication.status === "PENDING" ? (
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    disabled={busyId === selectedApplication.id}
                    onClick={() => void review(selectedApplication, "REJECTED")}
                    className="rounded-lg bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Từ chối hồ sơ
                  </button>
                  <button
                    type="button"
                    disabled={busyId === selectedApplication.id}
                    onClick={() => void review(selectedApplication, "APPROVED")}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Duyệt hồ sơ
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
      {imagePreview ? (
        <div
          role="presentation"
          onClick={() => setImagePreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={imagePreview.label}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-xl bg-white p-3"
          >
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setImagePreview(null)} className="text-sm font-semibold text-slate-700">
                Đóng
              </button>
            </div>
            <img src={imagePreview.url} alt={imagePreview.label} className="max-h-[78vh] max-w-full object-contain" />
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
