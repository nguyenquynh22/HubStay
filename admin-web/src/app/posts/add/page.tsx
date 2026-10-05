"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { ApiError, adminApi, type AdminUser } from "@/services/api";

const inputClassName = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

const emptyPost = {
  author_id: "",
  title: "",
  description: "",
  post_type: "RENTAL",
  price: "",
  area: "",
  address_detail: "",
  post_lat: "",
  post_lng: "",
};

export default function AddPostPage() {
  const [landlords, setLandlords] = useState<AdminUser[]>([]);
  const [isLoadingLandlords, setIsLoadingLandlords] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createdPostId, setCreatedPostId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [newPost, setNewPost] = useState(emptyPost);

  useEffect(() => {
    let cancelled = false;
    void adminApi.users({ role: "LANDLORD", status: "ACTIVE", limit: 100, page: 1 })
      .then((result) => {
        if (!cancelled) setLandlords(result.data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải danh sách chủ trọ.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLandlords(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError("");
    try {
      const result = await adminApi.createPost({
        ...newPost,
        author_id: Number(newPost.author_id),
        price: Number(newPost.price),
        area: newPost.area ? Number(newPost.area) : null,
        post_lat: Number(newPost.post_lat),
        post_lng: Number(newPost.post_lng),
      });
      setCreatedPostId(result.id);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể tạo bài đăng.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <AdminLayout>
      <main className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[12px] text-slate-500">
              <Link href="/posts" className="hover:text-blue-700">Quản lý bài đăng</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-700">Thêm bài đăng</span>
            </div>
            <h1 className="text-[21px] font-bold text-slate-900">Thêm bài đăng mới</h1>
          </div>
          <span className="w-fit rounded-full bg-[#edf2ff] px-2.5 py-1 text-[11px] font-semibold text-[#3759d9]">TẠO BÀI ĐĂNG HUBSTAY</span>
        </header>

        {createdPostId !== null ? (
          <section role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <h2 className="text-[15px] font-semibold text-emerald-900">Đã tạo bài đăng mới</h2>
                <p className="mt-1 text-[13px] text-emerald-800">Bài đăng #{createdPostId} đã được lưu vào hệ thống.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/posts/${createdPostId}`} className="rounded-lg bg-emerald-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-emerald-800">Xem bài đăng</Link>
                  <Link href="/posts" className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[12px] font-medium text-emerald-800 hover:bg-emerald-100">Danh sách bài đăng</Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <form onSubmit={createPost} className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-[16px] font-semibold text-slate-900">Thông tin bài đăng</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-[12px] font-medium text-slate-700">
                  Chủ trọ *
                  <select required value={newPost.author_id} onChange={(event) => setNewPost({ ...newPost, author_id: event.target.value })} className={inputClassName} disabled={isLoadingLandlords || landlords.length === 0}>
                    <option value="">{isLoadingLandlords ? "Đang tải danh sách chủ trọ..." : "Chọn tài khoản chủ trọ"}</option>
                    {landlords.map((landlord) => <option key={landlord.user_id} value={landlord.user_id}>{landlord.full_name} · {landlord.email}</option>)}
                  </select>
                  {!isLoadingLandlords && landlords.length === 0 && !error ? <span className="block text-[11px] font-normal text-amber-700">Chưa có chủ trọ đang hoạt động để gán bài đăng.</span> : null}
                </label>
                <label className="space-y-1 text-[12px] font-medium text-slate-700">
                  Loại bài đăng
                  <select value={newPost.post_type} onChange={(event) => setNewPost({ ...newPost, post_type: event.target.value })} className={inputClassName}>
                    <option value="RENTAL">Cho thuê</option>
                    <option value="SHARE">Ở ghép</option>
                    <option value="PASS">Pass / Nhượng phòng</option>
                    <option value="FIND">Tìm phòng</option>
                  </select>
                </label>
                <label className="space-y-1 text-[12px] font-medium text-slate-700 md:col-span-2">
                  Tiêu đề *
                  <input required maxLength={200} value={newPost.title} onChange={(event) => setNewPost({ ...newPost, title: event.target.value })} className={inputClassName} />
                </label>
                <label className="space-y-1 text-[12px] font-medium text-slate-700">
                  Giá thuê (VND/tháng) *
                  <input required type="number" min="1" step="1" value={newPost.price} onChange={(event) => setNewPost({ ...newPost, price: event.target.value })} className={inputClassName} />
                </label>
                <label className="space-y-1 text-[12px] font-medium text-slate-700">
                  Diện tích (m²)
                  <input type="number" min="0.1" step="0.1" value={newPost.area} onChange={(event) => setNewPost({ ...newPost, area: event.target.value })} className={inputClassName} />
                </label>
                <label className="space-y-1 text-[12px] font-medium text-slate-700 md:col-span-2">
                  Địa chỉ
                  <input value={newPost.address_detail} onChange={(event) => setNewPost({ ...newPost, address_detail: event.target.value })} className={inputClassName} />
                </label>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-[12px] font-medium text-slate-700">Tọa độ vị trí *</p>
                  <p className="text-[11px] text-slate-500">Nhập vĩ độ và kinh độ của phòng trọ. Có thể lấy từ Google Maps bằng cách nhấn chuột phải lên vị trí.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-[12px] font-medium text-slate-700">
                      Vĩ độ
                      <input required type="number" min="-90" max="90" step="any" placeholder="Ví dụ: 21.0071" value={newPost.post_lat} onChange={(event) => setNewPost({ ...newPost, post_lat: event.target.value })} className={inputClassName} />
                    </label>
                    <label className="space-y-1 text-[12px] font-medium text-slate-700">
                      Kinh độ
                      <input required type="number" min="-180" max="180" step="any" placeholder="Ví dụ: 105.8431" value={newPost.post_lng} onChange={(event) => setNewPost({ ...newPost, post_lng: event.target.value })} className={inputClassName} />
                    </label>
                  </div>
                </div>
                <label className="space-y-1 text-[12px] font-medium text-slate-700 md:col-span-2">
                  Mô tả
                  <textarea rows={5} value={newPost.description} onChange={(event) => setNewPost({ ...newPost, description: event.target.value })} className={inputClassName} />
                </label>
              </div>
            </section>

            {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/posts" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại danh sách
              </Link>
              <button type="submit" disabled={isCreating || isLoadingLandlords || landlords.length === 0} className="rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50">
                {isCreating ? "Đang tạo..." : "Tạo bài đăng"}
              </button>
            </div>
          </form>
        )}
      </main>
    </AdminLayout>
  );
}
