"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Crown,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi, ApiError } from "@/services/api";
import type { VipPackage } from "@/types";

const emptyForm = {
  package_name: "",
  display_name: "",
  description: "",
  price: 0,
  duration_days: 30,
  benefits: "",
  is_active: true,
  sort_order: 0,
};

type VipPackageForm = typeof emptyForm;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(days: number) {
  const months = Math.round(days / 30);
  if (days % 30 === 0 && months > 0) return `${months} tháng`;
  return `${days} ngày`;
}

export default function VipPackagesPage() {
  const [packages, setPackages] = useState<VipPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VipPackageForm>(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  async function loadPackages() {
    setIsLoading(true);
    setError("");
    try {
      const result = await adminApi.vipPackages();
      setPackages(result.data);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Không thể tải danh sách gói VIP.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = await adminApi.vipPackages();
        if (!cancelled) setPackages(result.data);
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof ApiError
              ? reason.message
              : "Không thể tải danh sách gói VIP.",
          );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = useMemo(
    () => packages.filter((item) => item.is_active).length,
    [packages],
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startCreate() {
    resetForm();
    setError("");
    setNotice("");
  }

  function startEdit(item: VipPackage) {
    setEditingId(item.package_id);
    setForm({
      package_name: item.package_name,
      display_name: item.display_name,
      description: item.description ?? "",
      price: item.price,
      duration_days: item.duration_days,
      benefits: item.benefits.join("; "),
      is_active: Boolean(item.is_active),
      sort_order: item.sort_order,
    });
    setError("");
    setNotice("");
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        package_name: form.package_name.trim(),
        display_name: form.display_name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        duration_days: Number(form.duration_days),
        benefits: form.benefits
          .split(";")
          .map((benefit) => benefit.trim())
          .filter(Boolean),
        is_active: form.is_active ? 1 : 0,
        sort_order: Number(form.sort_order) || 0,
      };

      if (
        !payload.package_name ||
        !payload.display_name ||
        !Number.isFinite(payload.price) ||
        payload.price <= 0
      ) {
        throw new Error("Tên gói, tên hiển thị và giá phải hợp lệ.");
      }
      if (
        !Number.isInteger(payload.duration_days) ||
        payload.duration_days < 1 ||
        payload.duration_days > 3650
      ) {
        throw new Error("Thời hạn phải là số ngày hợp lệ từ 1 đến 3650.");
      }
      if (payload.benefits.length === 0) {
        throw new Error("Cần ít nhất một lợi ích cho gói VIP.");
      }

      if (editingId !== null) {
        await adminApi.updateVipPackage(editingId, payload);
        setNotice("Đã cập nhật gói VIP.");
      } else {
        await adminApi.createVipPackage(payload);
        setNotice("Đã thêm gói VIP mới.");
      }
      await loadPackages();
      resetForm();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể lưu gói VIP.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePackage(item: VipPackage) {
    if (
      !window.confirm(
        `Bạn có chắc muốn ${item.is_active ? "ẩn" : "kích hoạt"} gói ${item.display_name}?`,
      )
    )
      return;
    try {
      await adminApi.updateVipPackage(item.package_id, {
        is_active: item.is_active ? 0 : 1,
      });
      setNotice("Đã cập nhật trạng thái gói VIP.");
      await loadPackages();
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Không thể thay đổi trạng thái gói VIP.",
      );
    }
  }

  async function deletePackage(item: VipPackage) {
    if (
      !window.confirm(
        `Xóa gói ${item.display_name}? Thao tác này không thể hoàn tác.`,
      )
    )
      return;
    setConfirmingId(item.package_id);
    try {
      await adminApi.deleteVipPackage(item.package_id);
      setNotice("Đã xóa gói VIP.");
      await loadPackages();
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "Không thể xóa gói VIP.",
      );
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#fff4df] p-2 text-[#d98208]">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-[24px] font-bold text-slate-900">
                    Quản lý gói VIP
                  </h1>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Cấu hình gói đăng ký, giá, thời hạn và lợi ích hiển thị cho
                    chủ trọ.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2d5af5] px-3.5 py-2.5 text-[12px] font-medium text-white"
            >
              <Plus className="h-4 w-4" /> Thêm gói VIP
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">Tổng gói</p>
              <p className="mt-1 text-[22px] font-bold text-slate-900">
                {packages.length}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-[11px] text-emerald-700">Đang hoạt động</p>
              <p className="mt-1 text-[22px] font-bold text-emerald-900">
                {activeCount}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-[11px] text-amber-700">Hiển thị cho khách</p>
              <p className="mt-1 text-[22px] font-bold text-amber-900">
                {packages
                  .filter((item) => item.is_active)
                  .reduce((sum, item) => sum + item.price, 0)
                  .toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        </section>

        {(error || notice) && (
          <div
            className={
              error
                ? "rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700"
                : "rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-700"
            }
          >
            {error || notice}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-[16px] font-bold text-slate-900">
                Danh sách gói
              </h2>
            </div>
            {isLoading ? (
              <div className="flex min-h-72 items-center justify-center p-8 text-slate-500">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Đang tải gói VIP...
              </div>
            ) : packages.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-slate-500">
                Chưa có gói VIP nào.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {packages.map((item) => (
                  <article key={item.package_id} className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[16px] font-bold text-slate-900">
                            {item.display_name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                          >
                            {item.is_active ? "Đang hoạt động" : "Đang ẩn"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {item.package_name} ·{" "}
                          {formatDuration(item.duration_days)} · Thứ tự{" "}
                          {item.sort_order}
                        </p>
                        <p className="mt-2 text-[13px] font-semibold text-[#2d5af5]">
                          {formatCurrency(item.price)}
                        </p>
                        {item.description && (
                          <p className="mt-1 text-[12px] text-slate-600">
                            {item.description}
                          </p>
                        )}
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {item.benefits.map((benefit: string) => (
                            <li
                              key={benefit}
                              className="rounded-full bg-[#edf2ff] px-2.5 py-1 text-[10px] text-[#2d5af5]"
                            >
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => togglePackage(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700"
                        >
                          <Power className="h-3.5 w-3.5" />{" "}
                          {item.is_active ? "Ẩn" : "Hiện"}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePackage(item)}
                          disabled={confirmingId === item.package_id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] text-rose-700 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />{" "}
                          {confirmingId === item.package_id
                            ? "Đang xóa..."
                            : "Xóa"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
              {editingId !== null ? (
                <Pencil className="h-4 w-4 text-[#2d5af5]" />
              ) : (
                <Plus className="h-4 w-4 text-[#2d5af5]" />
              )}
              <h2 className="text-[16px] font-bold text-slate-900">
                {editingId !== null ? "Sửa gói" : "Thêm gói mới"}
              </h2>
            </div>
            <form onSubmit={submitForm} className="mt-4 space-y-3">
              <label className="block text-[11px] font-medium text-slate-600">
                Tên mã gói
                <input
                  value={form.package_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      package_name: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                  placeholder="VIP_1_MONTH"
                  required
                />
              </label>
              <label className="block text-[11px] font-medium text-slate-600">
                Tên hiển thị
                <input
                  value={form.display_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      display_name: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                  placeholder="VIP 1 tháng"
                  required
                />
              </label>
              <label className="block text-[11px] font-medium text-slate-600">
                Giá (VND)
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: Number(event.target.value),
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[11px] font-medium text-slate-600">
                  Thời hạn (ngày)
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    step="1"
                    value={form.duration_days}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        duration_days: Number(event.target.value),
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                    required
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-600">
                  Thứ tự
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sort_order: Number(event.target.value),
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                  />
                </label>
              </div>
              <label className="block text-[11px] font-medium text-slate-600">
                Mô tả
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                />
              </label>
              <label className="block text-[11px] font-medium text-slate-600">
                Lợi ích (phân cách bằng dấu chấm phẩy)
                <textarea
                  value={form.benefits}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      benefits: event.target.value,
                    }))
                  }
                  rows={4}
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"
                  required
                />
              </label>
              <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                />
                Hiển thị gói cho khách
              </label>
              <div className="flex gap-2 border-t border-slate-200 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2d5af5] px-3.5 py-2.5 text-[12px] font-medium text-white disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}{" "}
                  {editingId !== null ? "Lưu thay đổi" : "Tạo gói"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-[12px] font-medium text-slate-700"
                >
                  <X className="h-4 w-4" /> Hủy
                </button>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
