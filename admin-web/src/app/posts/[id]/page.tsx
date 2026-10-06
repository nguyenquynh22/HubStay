"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Check, EyeOff, Pencil, RotateCcw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { ApiError, adminApi, type AdminPost, type AdminPostPayload } from "@/services/api";

const statusLabels: Record<string, string> = {
  AVAILABLE: "Đang hoạt động",
  RENTED: "Đã cho thuê",
  HIDDEN: "Đã ẩn",
  PENDING: "Chờ duyệt",
  REJECTED: "Từ chối",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export default function PostDetailsPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<AdminPost | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    post_type: "RENTAL",
    price: "",
    area: "",
    address_detail: "",
  });

  useEffect(() => {
    let cancelled = false;
    void adminApi.posts()
      .then((result) => {
        const selected = result.items.find((item) => String(item.id) === params.id);
        if (!cancelled) {
          setPost(selected ?? null);
          if (!selected) setError("Không tìm thấy bài đăng.");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải bài đăng.");
      });
    return () => { cancelled = true; };
  }, [params.id]);

  async function updatePost(payload: Partial<AdminPostPayload> & { is_approved?: boolean }, message: string) {
    if (!post) return;
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      await adminApi.updatePost(post.id, payload);
      setPost((current) => current ? {
        ...current,
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.is_approved !== undefined ? { verified: payload.is_approved } : {}),
      } : current);
      setNotice(message);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể cập nhật bài đăng.");
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing() {
    if (!post) return;
    setEditForm({
      title: post.title,
      description: post.description,
      post_type: post.postType,
      price: String(post.price),
      area: post.area === null ? "" : String(post.area),
      address_detail: post.address ?? "",
    });
    setIsEditing(true);
  }

  async function savePostEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) return;
    setIsSaving(true);
    setError("");
    setNotice("");
    const payload = {
      ...editForm,
      price: Number(editForm.price),
      area: editForm.area ? Number(editForm.area) : null,
    };
    try {
      await adminApi.updatePost(post.id, payload);
      setPost((current) => current ? {
        ...current,
        title: payload.title,
        description: payload.description,
        postType: payload.post_type,
        price: payload.price,
        area: payload.area,
        address: payload.address_detail || null,
      } : current);
      setNotice("Đã cập nhật nội dung bài đăng.");
      setIsEditing(false);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể cập nhật bài đăng.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <Link href="/posts" className="inline-flex items-center gap-2 text-[12px] font-medium text-[#2d5af5] hover:underline"><ArrowLeft className="h-4 w-4" />Quay lại danh sách bài đăng</Link>
        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p> : null}
        {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{notice}</p> : null}
        {post ? <section className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
          {post.imageUrl ? <Image src={post.imageUrl} alt="" width={1200} height={700} unoptimized className="h-64 w-full object-cover" /> : <div className="flex h-48 items-center justify-center bg-slate-50"><Building2 className="h-12 w-12 text-slate-300" /></div>}
          <div className="space-y-5 p-5">
            <div><p className="text-[11px] font-medium text-slate-500">BÀI ĐĂNG #{post.id}</p>{!isEditing ? <h1 className="mt-1 text-[24px] font-bold leading-tight text-slate-900">{post.title}</h1> : null}</div>
            {isEditing ? (
              <form onSubmit={savePostEdits} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-[12px] font-medium text-slate-700 sm:col-span-2">Tiêu đề
                    <input required maxLength={200} value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
                  </label>
                  <label className="space-y-1 text-[12px] font-medium text-slate-700">Loại bài đăng
                    <select value={editForm.post_type} onChange={(event) => setEditForm({ ...editForm, post_type: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px]">
                      <option value="RENTAL">Cho thuê</option><option value="SHARE">Ở ghép</option><option value="PASS">Pass / Nhượng phòng</option><option value="FIND">Tìm phòng</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-[12px] font-medium text-slate-700">Giá thuê (VND/tháng)
                    <input required type="number" min="1" step="1" value={editForm.price} onChange={(event) => setEditForm({ ...editForm, price: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
                  </label>
                  <label className="space-y-1 text-[12px] font-medium text-slate-700">Diện tích (m²)
                    <input type="number" min="0.1" step="0.1" value={editForm.area} onChange={(event) => setEditForm({ ...editForm, area: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
                  </label>
                  <label className="space-y-1 text-[12px] font-medium text-slate-700 sm:col-span-2">Địa chỉ
                    <input value={editForm.address_detail} onChange={(event) => setEditForm({ ...editForm, address_detail: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
                  </label>
                  <label className="space-y-1 text-[12px] font-medium text-slate-700 sm:col-span-2">Mô tả
                    <textarea rows={5} value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-700">Hủy</button>
                  <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50">{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</button>
                </div>
              </form>
            ) : (
              <>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div><dt className="text-[12px] text-slate-500">Người đăng</dt><dd className="mt-1 font-medium text-slate-800">{post.author.name} · {post.author.email}</dd></div>
                  <div><dt className="text-[12px] text-slate-500">Điện thoại</dt><dd className="mt-1 font-medium text-slate-800">{post.author.phone || "Chưa cập nhật"}</dd></div>
                  <div><dt className="text-[12px] text-slate-500">Giá</dt><dd className="mt-1 font-medium text-slate-800">{formatCurrency(post.price)}</dd></div>
                  <div><dt className="text-[12px] text-slate-500">Diện tích</dt><dd className="mt-1 font-medium text-slate-800">{post.area ? `${post.area} m²` : "Chưa cập nhật"}</dd></div>
                  <div><dt className="text-[12px] text-slate-500">Địa chỉ</dt><dd className="mt-1 font-medium text-slate-800">{post.address || "Chưa cập nhật"}</dd></div>
                  <div><dt className="text-[12px] text-slate-500">Trạng thái</dt><dd className="mt-1 font-medium text-slate-800">{statusLabels[post.status] ?? post.status}</dd></div>
                  <div><dt className="text-[12px] text-slate-500">Loại bài đăng</dt><dd className="mt-1 font-medium text-slate-800">{post.postType}</dd></div>
                  <div><dt className="text-[12px] text-slate-500">Ngày tạo</dt><dd className="mt-1 font-medium text-slate-800">{new Date(post.createdAt).toLocaleString("vi-VN")}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-[12px] text-slate-500">Mô tả</dt><dd className="mt-1 whitespace-pre-wrap font-medium text-slate-800">{post.description || "Chưa có mô tả."}</dd></div>
                </dl>
              </>
            )}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {!isEditing ? <button type="button" onClick={startEditing} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700"><Pencil className="h-4 w-4" />Sửa nội dung</button> : null}
              {!post.verified ? <button type="button" disabled={isSaving} onClick={() => void updatePost({ is_approved: true }, "Đã duyệt bài đăng.")} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"><Check className="h-4 w-4" />Duyệt bài đăng</button> : <button type="button" disabled={isSaving} onClick={() => void updatePost({ is_approved: false }, "Đã gỡ duyệt bài đăng.")} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800 disabled:opacity-50"><RotateCcw className="h-4 w-4" />Gỡ duyệt</button>}
              {post.status !== "HIDDEN" ? <button type="button" disabled={isSaving} onClick={() => void updatePost({ status: "HIDDEN" }, "Đã ẩn bài đăng.")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-700 disabled:opacity-50"><EyeOff className="h-4 w-4" />Ẩn bài đăng</button> : <button type="button" disabled={isSaving} onClick={() => void updatePost({ status: "AVAILABLE" }, "Đã mở lại bài đăng.")} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700 disabled:opacity-50"><RotateCcw className="h-4 w-4" />Mở lại bài đăng</button>}
              {isSaving ? <span className="self-center text-[12px] text-slate-500">Đang lưu...</span> : null}
            </div>
          </div>
        </section> : !error ? <p className="rounded-xl border border-slate-200 bg-white p-6 text-[13px] text-slate-500">Đang tải bài đăng từ backend...</p> : null}
      </div>
    </AdminLayout>
  );
}
