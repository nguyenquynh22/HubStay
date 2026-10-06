"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  ChevronRight,
  Map,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  defaultCenter,
  OpenStreetMap,
  type MapCoordinate,
} from "@/components/OpenStreetMap";
import { ApiError, adminApi, type AdminUser } from "@/services/api";

const inputClassName = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

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

const postTypes = [
  { value: "RENTAL", label: "Cho thuê", detail: "Đăng phòng đang cho thuê", icon: MapPin },
  { value: "SHARE", label: "Ở ghép", detail: "Tìm người ở cùng", icon: Users },
  { value: "PASS", label: "Pass phòng", detail: "Nhượng lại phòng thuê", icon: ArrowLeftRight },
  { value: "FIND", label: "Tìm phòng", detail: "Đăng nhu cầu tìm phòng", icon: Search },
] as const;

function parseCoordinates(latitude: string, longitude: string): MapCoordinate | null {
  const point = { latitude: Number(latitude), longitude: Number(longitude) };
  if (!latitude.trim() || !longitude.trim() ||
      !Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90 ||
      !Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
    return null;
  }
  return point;
}

export default function AddPostPage() {
  const [landlords, setLandlords] = useState<AdminUser[]>([]);
  const [isLoadingLandlords, setIsLoadingLandlords] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createdPostId, setCreatedPostId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [newPost, setNewPost] = useState(emptyPost);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [initialMapLocation, setInitialMapLocation] = useState<MapCoordinate | null>(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState<MapCoordinate | null>(null);

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

  function openLocationMap() {
    const point = parseCoordinates(newPost.post_lat, newPost.post_lng);
    const location = point ?? null;
    setMapCenter(location ?? defaultCenter);
    setInitialMapLocation(location);
    setSelectedMapLocation(location);
    setIsMapOpen(true);
  }

  function updateCoordinate(field: "post_lat" | "post_lng", value: string) {
    const nextPost = { ...newPost, [field]: value };
    setNewPost(nextPost);
    setSelectedMapLocation(parseCoordinates(nextPost.post_lat, nextPost.post_lng));
  }

  function selectMapLocation(point: MapCoordinate) {
    setNewPost((current) => ({
      ...current,
      post_lat: String(point.latitude),
      post_lng: String(point.longitude),
    }));
    setSelectedMapLocation(point);
    setError("");
  }

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
            <p className="mt-1 text-[12px] text-slate-500">Nhập thông tin bài đăng và ghim vị trí chính xác trên bản đồ.</p>
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
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[13px] font-bold text-blue-700">1</span>
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900">Hình thức &amp; người đăng</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Chọn loại tin và tài khoản chủ trọ đại diện.</p>
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-[12px] font-medium text-slate-700">Hình thức đăng tin *</legend>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {postTypes.map((item) => {
                    const Icon = item.icon;
                    const active = newPost.post_type === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setNewPost({ ...newPost, post_type: item.value })}
                        className={`flex min-h-[76px] items-start gap-3 rounded-xl border p-3 text-left transition-colors ${active ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                      >
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-blue-700" : "text-slate-500"}`} />
                        <span>
                          <span className={`block text-[12px] font-semibold ${active ? "text-blue-800" : "text-slate-800"}`}>{item.label}</span>
                          <span className="mt-1 block text-[10px] font-normal text-slate-500">{item.detail}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="mt-4 block space-y-1 text-[12px] font-medium text-slate-700">
                Chủ trọ *
                <select
                  required
                  value={newPost.author_id}
                  onChange={(event) => setNewPost({ ...newPost, author_id: event.target.value })}
                  className={inputClassName}
                  disabled={isLoadingLandlords || landlords.length === 0}
                >
                  <option value="">{isLoadingLandlords ? "Đang tải danh sách chủ trọ..." : "Chọn tài khoản chủ trọ"}</option>
                  {landlords.map((landlord) => <option key={landlord.user_id} value={landlord.user_id}>{landlord.full_name} · {landlord.email}</option>)}
                </select>
                {!isLoadingLandlords && landlords.length === 0 && !error ? <span className="block text-[11px] font-normal text-amber-700">Chưa có chủ trọ đang hoạt động để gán bài đăng.</span> : null}
              </label>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[13px] font-bold text-blue-700">2</span>
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900">Thông tin phòng trọ</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Mô tả ngắn gọn để người tìm phòng dễ nắm thông tin.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-[12px] font-medium text-slate-700 md:col-span-2">
                  Tiêu đề bài đăng *
                  <input required maxLength={200} value={newPost.title} onChange={(event) => setNewPost({ ...newPost, title: event.target.value })} className={inputClassName} placeholder="Ví dụ: Phòng khép kín gần Đại học Bách Khoa" />
                  <span className="block text-[10px] font-normal text-slate-500">Tối đa 200 ký tự.</span>
                </label>
                <label className="space-y-1 text-[12px] font-medium text-slate-700">
                  Giá thuê (VND/tháng) *
                  <span className="flex overflow-hidden rounded-lg border border-slate-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                    <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-500">₫</span>
                    <input required type="number" min="1" step="1" value={newPost.price} onChange={(event) => setNewPost({ ...newPost, price: event.target.value })} className="min-w-0 flex-1 px-3 py-2.5 text-[13px] text-slate-700 outline-none" placeholder="3.500.000" />
                    <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-500">/ tháng</span>
                  </span>
                </label>
                <label className="space-y-1 text-[12px] font-medium text-slate-700">
                  Diện tích
                  <span className="flex overflow-hidden rounded-lg border border-slate-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                    <input type="number" min="0.1" step="0.1" value={newPost.area} onChange={(event) => setNewPost({ ...newPost, area: event.target.value })} className="min-w-0 flex-1 px-3 py-2.5 text-[13px] text-slate-700 outline-none" placeholder="25" />
                    <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-500">m²</span>
                  </span>
                </label>
                <label className="space-y-1 text-[12px] font-medium text-slate-700 md:col-span-2">
                  Mô tả chi tiết
                  <textarea rows={5} value={newPost.description} onChange={(event) => setNewPost({ ...newPost, description: event.target.value })} className={`${inputClassName} resize-y`} placeholder="Mô tả tiện ích, nội thất, giờ giấc và các lưu ý khác..." />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[13px] font-bold text-blue-700">3</span>
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900">Địa chỉ &amp; vị trí</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Tìm địa chỉ hoặc chọn trực tiếp trên bản đồ để ghim tọa độ.</p>
                </div>
              </div>

              <label className="block space-y-1 text-[12px] font-medium text-slate-700">
                Địa chỉ phòng trọ
                <input value={newPost.address_detail} onChange={(event) => setNewPost({ ...newPost, address_detail: event.target.value })} className={inputClassName} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
              </label>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[12px] font-semibold text-slate-800">Tọa độ vị trí *</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">Chọn trên bản đồ hoặc nhập vĩ độ, kinh độ bên dưới.</p>
                </div>
                <button type="button" onClick={openLocationMap} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
                  <Map className="h-3.5 w-3.5" />
                  {isMapOpen ? "Đặt lại bản đồ" : "Chọn trên bản đồ"}
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-[11px] font-medium text-slate-600">
                  Vĩ độ *
                  <input required type="number" min="-90" max="90" step="any" placeholder="21.0071" value={newPost.post_lat} onChange={(event) => updateCoordinate("post_lat", event.target.value)} className={inputClassName} />
                </label>
                <label className="space-y-1 text-[11px] font-medium text-slate-600">
                  Kinh độ *
                  <input required type="number" min="-180" max="180" step="any" placeholder="105.8431" value={newPost.post_lng} onChange={(event) => updateCoordinate("post_lng", event.target.value)} className={inputClassName} />
                </label>
              </div>
              {isMapOpen ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <p className="mb-2 text-[11px] text-slate-600">Phóng to hoặc di chuyển bản đồ, sau đó chạm vào vị trí phòng trọ để ghim.</p>
                  <OpenStreetMap
                    center={mapCenter}
                    selectable
                    address={newPost.address_detail}
                    onAddressChange={(address) => setNewPost({ ...newPost, address_detail: address })}
                    initialLocation={initialMapLocation}
                    selectedLocation={selectedMapLocation}
                    onSelect={selectMapLocation}
                    height={340}
                  />
                </div>
              ) : null}
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
