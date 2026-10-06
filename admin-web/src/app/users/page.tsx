'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LockKeyhole,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { VIPStatusBadge } from "@/components/vip/VIPStatusBadge";
import { adminApi, ApiError, type AdminUser, type UserListResponse, type UserRole, type UserStatus } from "@/services/api";

const roleLabels: Record<UserRole, string> = { STUDENT: "Sinh viên", WORKER: "Người đi làm", LANDLORD: "Chủ trọ" };
const roleStyles: Record<UserRole, string> = {
  STUDENT: "bg-[#eaf2ff] text-[#2454d5]",
  WORKER: "bg-[#f3e8ff] text-[#7c3aed]",
  LANDLORD: "bg-[#fff6df] text-[#b7791f]",
};
const statusLabels: Record<UserStatus, string> = { ACTIVE: "Đang hoạt động", WARNING: "Cảnh báo", BANNED: "Bị khóa" };
const statusStyles: Record<UserStatus, string> = {
  ACTIVE: "bg-[#eafaf2] text-[#1e9b62]",
  WARNING: "bg-[#fff7e6] text-[#d97706]",
  BANNED: "bg-[#fee2e2] text-[#b91c1c]",
};

function formatCount(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function formatVipExpiry(value: string | null) {
  if (!value) return "Không áp dụng";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export default function UsersPage() {
  const router = useRouter();
  const [result, setResult] = useState<UserListResponse | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      void adminApi.users({ search, role, status, verified, page, limit: 10 })
        .then((data) => {
          if (!cancelled) {
            setResult(data);
            setError("");
          }
        })
        .catch((reason: unknown) => {
          if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải danh sách người dùng.");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, role, status, verified, page, refreshKey]);

  function resetPageAndSet(setter: (value: string) => void, value: string) {
    setPage(1);
    setter(value);
  }

  async function toggleUserStatus(user: AdminUser) {
    const nextStatus: UserStatus = user.status === "BANNED" ? "ACTIVE" : "BANNED";
    const action = nextStatus === "BANNED" ? "khóa" : "mở khóa";
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${user.full_name}?`)) return;
    setBusyUserId(user.user_id);
    setError("");
    try {
      await adminApi.updateUser(user.user_id, {
        status: nextStatus,
        ban_reason: nextStatus === "BANNED" ? "Khóa bởi quản trị viên" : null,
        banned_until: null,
      });
      setNotice(`Đã ${action} tài khoản ${user.full_name}.`);
      setRefreshKey((current) => current + 1);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể cập nhật trạng thái tài khoản.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function removeUser(user: AdminUser) {
    if (!window.confirm(`Xóa vĩnh viễn tài khoản ${user.full_name}? Dữ liệu liên quan sẽ bị xóa theo tài khoản.`)) return;
    setBusyUserId(user.user_id);
    setError("");
    try {
      await adminApi.deleteUser(user.user_id);
      setNotice(`Đã xóa tài khoản ${user.full_name}.`);
      if (result?.data.length === 1 && page > 1) setPage((current) => current - 1);
      else setRefreshKey((current) => current + 1);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể xóa tài khoản.");
    } finally {
      setBusyUserId(null);
    }
  }

  function exportUsers() {
    if (!result?.data.length) return;
    const lines = [
      ["Mã người dùng", "Họ tên", "Email", "Điện thoại", "Vai trò", "Xác thực", "Trạng thái", "Ngày tạo"],
      ...result.data.map((user) => [
        String(user.user_id), user.full_name, user.email, user.phone ?? "", roleLabels[user.role],
        user.is_verified ? "Đã xác thực" : "Chưa xác thực", user.role === "LANDLORD" ? (user.is_vip ? "VIP" : "Thường") : "",
        user.role === "LANDLORD" ? (user.vip_expires_at ?? "") : "", statusLabels[user.status], user.created_at,
      ]),
    ];
    const csv = lines.map((line) => line.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hubstay-users-page-${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const summary = result?.summary;
  const pageCount = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.limit ?? 10)));

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#edf2ff] px-2.5 py-1.5 text-[12px] font-medium text-[#3759d9]">
              <span className="h-2 w-2 rounded-full bg-[#3759d9]" />
              DỮ LIỆU NGƯỜI DÙNG
            </div>
            <div className="text-[12px] text-slate-500">{isLoading ? "Đang đồng bộ dữ liệu..." : "Dữ liệu đồng bộ từ HubStay"}</div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[24px] font-bold leading-tight text-slate-900">Quản lý người dùng</h1>
                <span className="inline-flex items-center rounded-full bg-[#edf7f2] px-2.5 py-1 text-[12px] font-semibold text-[#1aa167]">
                  {formatCount(summary?.active)} đang hoạt động
                </span>
              </div>

              <p className="mt-2 text-[12px] text-slate-500">Tổng cộng {formatCount(summary?.total)} tài khoản người dùng</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportUsers}
                disabled={!result?.data.length}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-medium text-slate-700 shadow-sm"
              >
                <Download className="h-4 w-4" />
                Xuất trang CSV
              </button>

              <Link
                href="/users/add"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2d5af5] px-3.5 py-2.5 text-[13px] font-medium text-white shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Thêm người dùng mới
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Sinh viên", value: summary?.students ?? 0, note: "Tài khoản sinh viên" },
            { label: "Chủ nhà trọ", value: summary?.landlords ?? 0, note: "Tài khoản cho thuê" },
            { label: "Chưa xác thực", value: summary?.unverified ?? 0, note: "Cần hoàn tất eKYC" },
            { label: "Cảnh báo / bị khóa", value: summary?.restricted ?? 0, note: "Tài khoản cần lưu ý" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[12px] font-medium text-slate-500">{stat.label}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="text-[27px] font-bold leading-none tracking-tight text-slate-900">{formatCount(stat.value)}</div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                {stat.label === "Cảnh báo / bị khóa" ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
                <span className="text-slate-500">{stat.note}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-105">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => resetPageAndSet(setSearch, event.target.value)}
                placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                aria-label="Tìm kiếm người dùng"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select value={role} onChange={(event) => resetPageAndSet(setRole, event.target.value)} aria-label="Lọc theo vai trò" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none">
                <option value="">Tất cả vai trò</option>
                <option value="STUDENT">Sinh viên</option>
                <option value="WORKER">Người đi làm</option>
                <option value="LANDLORD">Chủ trọ</option>
              </select>
              <select value={status} onChange={(event) => resetPageAndSet(setStatus, event.target.value)} aria-label="Lọc theo trạng thái" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none">
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="WARNING">Cảnh báo</option>
                <option value="BANNED">Bị khóa</option>
              </select>
              <select value={verified} onChange={(event) => resetPageAndSet(setVerified, event.target.value)} aria-label="Lọc theo xác thực" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none">
                <option value="">Mọi trạng thái xác thực</option>
                <option value="true">Đã xác thực</option>
                <option value="false">Chưa xác thực</option>
              </select>
            </div>
          </div>
          </div>

        <div className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-slate-900">Danh sách người dùng</h2>
              <span className="text-[12px] text-slate-500">{formatCount(result?.total)} người dùng</span>
            </div>
          </div>

          {error ? <div role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</div> : null}
          {notice ? <div role="status" className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">{notice}</div> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1245px] table-fixed text-left">
              <colgroup>
                <col className="w-[170px]" />
                <col className="w-[270px]" />
                <col className="w-[145px]" />
                <col className="w-[155px]" />
                <col className="w-[90px]" />
                <col className="w-[150px]" />
                <col className="w-[145px]" />
                <col className="w-[120px]" />
              </colgroup>
              <thead className="bg-slate-50 text-[13px] font-semibold uppercase tracking-[0.02em] text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Email & số điện thoại</th>
                  <th className="px-4 py-3">Loại tài khoản</th>
                  <th className="px-4 py-3">Xác thực danh tính</th>
                  <th className="whitespace-nowrap px-4 py-3">VIP</th>
                  <th className="whitespace-nowrap px-4 py-3">Hết hạn</th>
                  <th className="whitespace-nowrap px-4 py-3">Trạng thái</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[13px] text-slate-700">
                {result?.data.map((user) => (
                  <tr
                    key={user.user_id}
                    className="cursor-pointer bg-white hover:bg-slate-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    tabIndex={0}
                    role="link"
                    aria-label={`Mở chi tiết ${user.full_name}`}
                    onClick={(event) => {
                      if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, label")) return;
                      router.push(`/users/${user.user_id}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/users/${user.user_id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/users/${user.user_id}`} className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 aspect-square items-center justify-center rounded-full bg-[#eaf2ff] text-[12px] font-semibold text-[#2454d5]">
                          {initials(user.full_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="break-words font-semibold leading-5 text-slate-800">{user.full_name}</div>
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-3">
                      <div className="break-all font-medium text-slate-700">{user.email}</div>
                      <div className="mt-1 break-words text-slate-500">{user.phone || "Chưa cập nhật số điện thoại"}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex max-w-full items-center justify-center rounded-full px-3 py-1.5 text-center text-[12px] font-medium leading-4 ${roleStyles[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex max-w-full items-center justify-center rounded-full px-3 py-1.5 text-center text-[12px] font-medium leading-4 ${user.is_verified ? "bg-[#eafaf2] text-[#1e9b62]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>
                        {user.is_verified ? "Đã xác thực" : "Chưa xác thực"}
                      </span>
                    </td>

                    <td className="px-4 py-3">{user.role === "LANDLORD" ? <VIPStatusBadge status={user.is_vip ? "VIP" : "STANDARD"} /> : <span aria-hidden="true" className="text-slate-300">—</span>}</td>

                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-slate-600">{user.role === "LANDLORD" ? formatVipExpiry(user.vip_expires_at) : <span aria-hidden="true" className="text-slate-300">—</span>}</td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex max-w-full items-center justify-center rounded-full px-3 py-1.5 text-center text-[12px] font-medium leading-4 ${statusStyles[user.status]}`}>
                        {statusLabels[user.status]}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 text-slate-500">
                        <Link
                          href={`/users/${user.user_id}`}
                          className="rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100"
                          aria-label={`Xem chi tiết ${user.full_name}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button type="button" disabled={busyUserId === user.user_id} onClick={() => void toggleUserStatus(user)} className="rounded-lg border border-amber-100 bg-amber-50 p-1.5 text-amber-600 hover:bg-amber-100 disabled:opacity-50" aria-label={user.status === "BANNED" ? `Mở khóa ${user.full_name}` : `Khóa ${user.full_name}`}>
                          {busyUserId === user.user_id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                        </button>
                        <button type="button" disabled={busyUserId === user.user_id} onClick={() => void removeUser(user)} className="rounded-lg border border-rose-100 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 disabled:opacity-50" aria-label={`Xóa ${user.full_name}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isLoading ? <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-8 text-[13px] text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Đang tải người dùng</div> : null}
            {!isLoading && !error && !result?.data.length ? <div className="px-4 py-10 text-center text-[13px] text-slate-500">Không tìm thấy người dùng phù hợp.</div> : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[13px] text-slate-500">Trang {page} / {pageCount} · {formatCount(result?.total)} người dùng</div>

            <div className="flex items-center gap-2 text-[13px] text-slate-600">
              <button type="button" aria-label="Trang trước" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-500 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-7 text-center font-medium text-slate-700">{page}</span>
              <button type="button" aria-label="Trang sau" disabled={page >= pageCount || isLoading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-500 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        </section>
      </div>
    </AdminLayout>
  );
}
