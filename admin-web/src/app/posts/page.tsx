"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Building2, Eye, Plus, Search } from "lucide-react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import { ApiError, adminApi, type AdminPost } from "@/services/api";

const statusLabels: Record<string, string> = {
  AVAILABLE: "Đang hoạt động",
  RENTED: "Đã cho thuê",
  HIDDEN: "Đã ẩn",
  PENDING: "Chờ duyệt",
  REJECTED: "Từ chối",
};
const statusStyles: Record<string, string> = {
  AVAILABLE: "bg-[#eafaf2] text-[#1e9b62]",
  RENTED: "bg-[#eaf2ff] text-[#2454d5]",
  HIDDEN: "bg-[#f3f4f6] text-[#6b7280]",
  PENDING: "bg-[#fff7e6] text-[#d97706]",
  REJECTED: "bg-[#fee2e2] text-[#b91c1c]",
};
const typeLabels: Record<string, string> = {
  RENTAL: "Cho thuê",
  CHO_THUE: "Cho thuê",
  SHARE: "Ở ghép",
  PASS: "Pass / Nhượng phòng",
  FIND: "Tìm phòng",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(date);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

export default function PostsPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void adminApi.posts()
      .then((result) => {
        if (!cancelled) {
          setPosts(result.items);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải bài đăng.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi-VN");
    return posts.filter((post) => {
      const matchesSearch = !query || `${post.id} ${post.title} ${post.address ?? ""} ${post.author.name} ${post.author.email}`.toLocaleLowerCase("vi-VN").includes(query);
      return matchesSearch && (statusFilter === "ALL" || post.status === statusFilter);
    });
  }, [posts, search, statusFilter]);
  const pendingCount = posts.filter((post) => post.status === "PENDING").length;
  const activeCount = posts.filter((post) => post.status === "AVAILABLE").length;
  const hiddenCount = posts.filter((post) => post.status === "HIDDEN").length;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#edf2ff] px-2.5 py-1.5 text-[11px] font-medium text-[#3759d9]">
              <span className="h-2 w-2 rounded-full bg-[#3759d9]" />
              DỮ LIỆU ĐỒNG BỘ TỪ BACKEND
            </div>
            <div className="text-[11px] text-slate-500">{isLoading ? "Đang đồng bộ dữ liệu..." : "Dữ liệu trực tiếp từ HubStay"}</div>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div><h1 className="text-[24px] font-bold leading-tight text-slate-900">Quản lý bài đăng phòng trọ</h1><p className="mt-2 max-w-2xl text-[12px] text-slate-500">Danh sách bài đăng hiện có trong HubStay.</p></div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-[12px] text-slate-500">{posts.length.toLocaleString("vi-VN")} bài đăng</div>
              <Link href="/posts/add" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />Thêm bài đăng
              </Link>
            </div>
          </div>
        </section>

        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[["TỔNG BÀI ĐĂNG", posts.length], ["ĐANG HOẠT ĐỘNG", activeCount], ["CHỜ DUYỆT", pendingCount], ["ĐÃ ẨN", hiddenCount]].map(([label, value]) => (
            <div key={label} className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[12px] font-semibold text-slate-500">{label}</p>
              <p className="mt-3 text-[28px] font-bold text-slate-900">{isLoading ? "…" : Number(value).toLocaleString("vi-VN")}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Tìm tiêu đề, địa chỉ hoặc người đăng" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[13px] outline-none focus:border-blue-300" />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái bài đăng" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px]">
              <option value="ALL">Mọi trạng thái</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.02em] text-slate-500"><tr><th className="px-3 py-3">Ảnh / bài đăng</th><th className="px-3 py-3">Người đăng</th><th className="px-3 py-3">Khu vực</th><th className="px-3 py-3">Giá</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Thời gian</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-200 text-[11px] text-slate-700">
                {filtered.map((post) => (
                  <tr key={post.id} className="bg-white hover:bg-slate-50/60">
                    <td className="px-3 py-3"><div className="flex items-center gap-2.5"><div className="relative flex h-12 w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">{post.imageUrl ? <Image src={post.imageUrl} alt="" fill unoptimized className="object-cover" /> : <Building2 className="h-7 w-7 text-slate-400/70" />}</div><div className="min-w-0"><Link href={`/posts/${post.id}`} className="block max-w-[205px] truncate font-semibold text-slate-800 hover:text-blue-700 hover:underline">{post.title}</Link><p className="mt-1 text-slate-500">#{post.id} · {typeLabels[post.postType] ?? post.postType}</p></div></div></td>
                    <td className="px-3 py-3"><div className="flex items-center gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dfeaff] text-[10px] font-semibold text-[#254ad8]">{initials(post.author.name)}</div><div><p className="font-semibold text-slate-800">{post.author.name}</p><p className="mt-0.5 text-slate-500">{post.author.email}</p></div></div></td>
                    <td className="px-3 py-3"><div className="font-medium text-slate-700">{post.address || "Chưa cập nhật địa chỉ"}</div><div className="mt-1 text-slate-500">{post.area ? `${post.area} m²` : "Khu vực chưa cập nhật"}</div></td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold">{formatCurrency(post.price)}</td>
                    <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${statusStyles[post.status] ?? "bg-slate-100 text-slate-600"}`}>{statusLabels[post.status] ?? post.status}</span></td>
                    <td className="whitespace-pre-line px-3 py-3 text-slate-500">{formatDate(post.createdAt)}</td>
                    <td className="px-3 py-3"><div className="flex justify-end"><Link href={`/posts/${post.id}`} aria-label={`Xem ${post.id}`} className="rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100"><Eye className="h-3.5 w-3.5" /></Link></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isLoading ? <p className="px-4 py-10 text-center text-[13px] text-slate-500">Đang tải bài đăng từ backend...</p> : null}
            {!isLoading && !filtered.length ? <p className="px-4 py-10 text-center text-[13px] text-slate-500">Không có bài đăng phù hợp.</p> : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
