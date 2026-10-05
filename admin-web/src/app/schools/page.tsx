"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  Map,
  Pencil,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { ApiError, adminApi, type AdminLandmark } from "@/services/api";

type LocationTone = "blue" | "emerald" | "amber" | "rose";

type Location = {
  id: number;
  name: string;
  address: string;
  type: string;
  latitude: string;
  longitude: string;
  tone: LocationTone;
};

const typeStyles = {
  blue: "bg-[#eaf2ff] text-[#2454d5]",
  emerald: "bg-[#eafaf2] text-[#1e9b62]",
  amber: "bg-[#fff7e6] text-[#d97706]",
  rose: "bg-[#ffefef] text-[#dc4c4c]",
} as const;

const categoryLabels: Record<string, string> = {
  UNIVERSITY: "Trường học",
  PARK: "Công viên",
  MUSEUM: "Bảo tàng",
  HOSPITAL: "Bệnh viện",
  SHOPPING: "Mua sắm",
  OTHER: "Địa điểm khác",
};

function mapLandmark(item: AdminLandmark): Location {
  const type = categoryLabels[item.category] ?? item.category;
  const tones: Record<string, LocationTone> = {
    UNIVERSITY: "blue", PARK: "emerald", MUSEUM: "amber",
    HOSPITAL: "rose", SHOPPING: "amber", OTHER: "blue",
  };
  return {
    id: item.landmark_id,
    name: item.name,
    address: item.address,
    type,
    latitude: String(item.latitude),
    longitude: String(item.longitude),
    tone: tones[item.category] ?? "blue",
  };
}

export default function SchoolsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", address: "", type: "Trường học", latitude: "", longitude: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadLocations() {
    try {
      const result = await adminApi.landmarks();
      setLocations(result.items.map(mapLandmark));
      setError("");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể tải danh sách địa điểm.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void adminApi.landmarks()
      .then((result) => {
        if (!cancelled) {
          setLocations(result.items.map(mapLandmark));
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải danh sách địa điểm.");
      });
    return () => { cancelled = true; };
  }, []);

  const filteredLocations = locations.filter((location) => `${location.name} ${location.address} ${location.type}`.toLowerCase().includes(query.toLowerCase()));

  function openAddModal() {
    setEditingLocationId(null);
    setForm({ name: "", address: "", type: "Trường học", latitude: "", longitude: "" });
    setIsModalOpen(true);
  }

  function openEditModal(location: Location) {
    setEditingLocationId(location.id);
    setForm({
      name: location.name,
      address: location.address,
      type: location.type,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setIsModalOpen(true);
  }

  async function saveLocation() {
    if (!form.name.trim() || !form.address.trim() || !form.latitude.trim() || !form.longitude.trim()) {
      setError("Vui lòng điền đầy đủ tên, địa chỉ và tọa độ.");
      return;
    }
    const categories: Record<string, string> = {
      "Trường học": "UNIVERSITY",
      "Công viên": "PARK",
      "Bảo tàng": "MUSEUM",
      "Bệnh viện": "HOSPITAL",
      "Mua sắm": "SHOPPING",
      "Địa điểm khác": "OTHER",
    };
    const category = categories[form.type] ?? "OTHER";
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError("Latitude phải từ -90 đến 90 và longitude từ -180 đến 180.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        category,
        latitude,
        longitude,
      };
      if (editingLocationId !== null) {
        await adminApi.updateLandmark(editingLocationId, payload);
      } else {
        await adminApi.createLandmark(payload);
      }
      await loadLocations();
      setForm({ name: "", address: "", type: "Trường học", latitude: "", longitude: "" });
      setIsModalOpen(false);
      setEditingLocationId(null);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể thêm địa điểm.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeLocation(location: Location) {
    if (!window.confirm(`Xóa địa điểm "${location.name}"?`)) return;
    try {
      await adminApi.deleteLandmark(location.id);
      setLocations((current) => current.filter((item) => item.id !== location.id));
      setError("");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể xóa địa điểm.");
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <span>Trang chủ</span><span className="text-slate-300">/</span><span className="font-medium text-[#1d4ed8]">Hệ thống điều hành</span>
            </div>
            <div className="text-[11px] text-slate-500">Dữ liệu đồng bộ từ backend HubStay</div>
          </div>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-[24px] font-bold leading-tight text-slate-900">Quản lý Trường học &amp; Địa điểm</h1>
              <p className="mt-2 max-w-2xl text-[12px] text-slate-500">Quản lý các trường học và địa điểm được sử dụng để hỗ trợ tìm kiếm phòng trọ.</p>
            </div>
            <button type="button" onClick={openAddModal} className="inline-flex items-center gap-2 self-start rounded-xl bg-[#2d5af5] px-3.5 py-2.5 text-[12px] font-medium text-white shadow-sm xl:self-auto">
              <Plus className="h-4 w-4" />
              Thêm địa điểm
            </button>
          </div>
        </section>

        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p> : null}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-[480px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="text" placeholder="Tìm kiếm trường học, địa điểm..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300" />
            </div>
            <div className="flex items-center gap-2 text-[12px] text-slate-500"><span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf2ff] text-[#2d5af5]"><MapPin className="h-3.5 w-3.5" /></span>{locations.length} địa điểm đang quản lý</div>
          </div>
        </div>

        <div className="overflow-hidden border-b border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div className="flex items-center gap-2"><h2 className="text-[15px] font-semibold text-slate-900">Danh sách địa điểm</h2><span className="text-[12px] text-slate-500">{filteredLocations.length} kết quả</span></div><div className="hidden items-center gap-1.5 text-[12px] text-slate-500 sm:flex"><Building2 className="h-3.5 w-3.5 text-[#2d5af5]" />Dữ liệu địa điểm HubStay</div></div>
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left">
              <thead className="bg-slate-50 text-[12px] font-semibold uppercase tracking-[0.02em] text-slate-500"><tr><th className="px-4 py-3">Tên địa điểm</th><th className="px-3 py-3">Địa chỉ</th><th className="px-3 py-3">Loại địa điểm</th><th className="px-3 py-3">Tọa độ</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-200 text-[13px] text-slate-700">
                {filteredLocations.map((location) => <tr key={location.id} className="hover:bg-slate-50/60"><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf2ff] text-[#2d5af5]"><Building2 className="h-4 w-4" /></div><div className="font-semibold text-slate-800">{location.name}</div></div></td><td className="px-3 py-3 text-slate-600">{location.address}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${typeStyles[location.tone]}`}>{location.type}</span></td><td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-slate-500">{location.latitude}, {location.longitude}</td><td className="px-3 py-3"><div className="flex justify-end gap-1.5"><button type="button" onClick={() => openEditModal(location)} className="rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100" aria-label={`Sửa ${location.name}`}><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void removeLocation(location)} className="rounded-lg border border-rose-100 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100" aria-label={`Xóa ${location.name}`}><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}
              </tbody>
            </table>
            {filteredLocations.length === 0 ? <div className="px-4 py-8 text-center text-[13px] text-slate-500">Không tìm thấy địa điểm phù hợp.</div> : null}
          </div>
        </div>

        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Bản đồ địa điểm</h2>
              <p className="mt-1 text-[11px] text-slate-500">Vị trí các trường học và địa điểm đang được quản lý.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eafaf2] px-2.5 py-1 text-[10px] font-medium text-[#1e9b62]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1e9b62]" />
              Bản đồ sẵn sàng
            </span>
          </div>
          <div
            className="relative h-[330px] overflow-hidden bg-[#e8f0e8]"
            style={{
              backgroundImage: "linear-gradient(#d2dfd2 1px, transparent 1px), linear-gradient(90deg, #d2dfd2 1px, transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          >
            <div className="absolute inset-[9%_7%] rounded-[40%] border-2 border-[#c7d7c6] bg-[#f3f6ec]/70" />
            <div className="absolute left-[12%] top-[12%] h-[78%] w-3 rotate-[22deg] rounded-full bg-[#d9e7ec]/80" />
            <div className="absolute right-[14%] top-[4%] h-[92%] w-2 rotate-[68deg] rounded-full bg-[#d9e7ec]/80" />
            <div className="absolute left-4 top-4 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-[11px] font-medium text-slate-600 shadow-sm">
              <Map className="mr-1.5 inline h-3.5 w-3.5 text-[#2d5af5]" />
              Google Maps placeholder
            </div>
            {locations.slice(0, 12).map((location) => {
              const latitude = Number(location.latitude);
              const longitude = Number(location.longitude);
              const left = Math.max(12, Math.min(88, 12 + ((longitude - 105.7) / 0.2) * 76));
              const top = Math.max(12, Math.min(86, 12 + ((21.08 - latitude) / 0.16) * 74));
              return (
                <div key={location.id} className="absolute group" style={{ left: `${left}%`, top: `${top}%` }}>
                  <MapPin className="h-8 w-8 -translate-x-1/2 -translate-y-full fill-[#2d5af5] text-white drop-shadow-md" />
                  <div className="absolute left-1/2 top-0 hidden -translate-x-1/2 -translate-y-[calc(100%+22px)] whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] text-white shadow-sm group-hover:block">
                    {location.name}
                  </div>
                </div>
              );
            })}
            {!locations.length ? <p className="absolute inset-0 flex items-center justify-center text-[12px] text-slate-500">Chưa có địa điểm để hiển thị.</p> : null}
            <div className="absolute bottom-4 right-4 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-[10px] text-slate-500 shadow-sm">
              Chưa cấu hình Google Maps API
            </div>
          </div>
        </section>
      </div>

      {isModalOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" role="dialog" aria-modal="true" aria-labelledby="location-modal-title"><div className="w-full max-w-[560px] rounded-[16px] border border-slate-200 bg-white shadow-xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="location-modal-title" className="text-[17px] font-bold text-slate-900">{editingLocationId ? "Sửa địa điểm" : "Thêm địa điểm"}</h2><p className="mt-1 text-[11px] text-slate-500">Nhập thông tin để {editingLocationId ? "cập nhật" : "thêm"} địa điểm vào hệ thống.</p></div><button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X className="h-5 w-5" /></button></div><div className="grid gap-3 px-5 py-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-[11px] font-medium text-slate-600">Tên địa điểm *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-blue-300" placeholder="Ví dụ: Đại học Bách Khoa Hà Nội" /></label><label className="sm:col-span-2"><span className="text-[11px] font-medium text-slate-600">Địa chỉ *</span><input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-blue-300" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" /></label><label><span className="text-[11px] font-medium text-slate-600">Loại địa điểm *</span><select required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:border-blue-300"><option>Trường học</option><option>Công viên</option><option>Bảo tàng</option><option>Bệnh viện</option><option>Mua sắm</option><option>Địa điểm khác</option></select></label><div /><label><span className="text-[11px] font-medium text-slate-600">Latitude *</span><input required type="number" min="-90" max="90" step="any" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-blue-300" placeholder="21.0077" /></label><label><span className="text-[11px] font-medium text-slate-600">Longitude *</span><input required type="number" min="-180" max="180" step="any" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-blue-300" placeholder="105.8431" /></label></div>      <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3"><button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-medium text-slate-600">Hủy</button><button type="button" disabled={isSubmitting} onClick={() => void saveLocation()} className="inline-flex items-center gap-2 rounded-xl bg-[#2d5af5] px-3.5 py-2.5 text-[12px] font-medium text-white"><Check className="h-4 w-4" />{isSubmitting ? "Đang lưu..." : editingLocationId ? "Lưu thay đổi" : "Thêm địa điểm"}</button></div></div></div> : null}
    </AdminLayout>
  );
}
