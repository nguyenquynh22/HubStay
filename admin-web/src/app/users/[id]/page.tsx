'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Link2,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { adminApi, ApiError, type AdminUser, type UserPayload, type UserRole, type UserStatus } from "@/services/api";
import { AdminLayout } from "@/components/AdminLayout";
import { VIPStatusBadge } from "@/components/vip/VIPStatusBadge";

const roleLabels: Record<UserRole, string> = {
  STUDENT: "Sinh viên",
  WORKER: "Người đi làm",
  LANDLORD: "Chủ trọ",
};

const statusLabels: Record<UserStatus, string> = {
  ACTIVE: "Đang hoạt động",
  WARNING: "Cảnh báo",
  BANNED: "Bị khóa",
};

const inputClassName = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";

function SectionTitle({ number, title }: { number: number; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
      <span className="flex h-5 w-5 items-center justify-center rounded bg-[#2454d5] text-[12px] font-bold text-white">{number}</span>
      {title}
    </h2>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function inputDateTime(value: string | null | undefined) {
  return value ? value.replace(" ", "T").slice(0, 16) : "";
}

function sqlDateTime(value: FormDataEntryValue | null) {
  return typeof value === "string" && value ? value.replace("T", " ") + (value.length === 16 ? ":00" : "") : null;
}

function roleFromForm(value: FormDataEntryValue | null): UserRole {
  return value === "WORKER" || value === "LANDLORD" ? value : "STUDENT";
}

function statusFromForm(value: FormDataEntryValue | null): UserStatus {
  return value === "WARNING" || value === "BANNED" ? value : "ACTIVE";
}

function ErrorMessage({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">{children}</div>;
}

function AddUserPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");
  const [passwordSetup, setPasswordSetup] = useState<"ACTIVATION_LINK" | "SET_PASSWORD">("ACTIVATION_LINK");
  const [showInitialPassword, setShowInitialPassword] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [activationLink, setActivationLink] = useState("");
  const [activationComplete, setActivationComplete] = useState(false);
  const [activationEmailSent, setActivationEmailSent] = useState(false);
  const [activationEmailError, setActivationEmailError] = useState("");
  const [copiedActivationLink, setCopiedActivationLink] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    const values = new FormData(event.currentTarget);
    let avatarUrl: string | null = null;
    try {
      if (avatarFile) avatarUrl = await adminApi.uploadAvatar(avatarFile);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể tải ảnh đại diện lên.");
      setIsSaving(false);
      return;
    }
    const payload: UserPayload = {
      full_name: String(values.get("full_name") ?? "").trim(),
      email: String(values.get("email") ?? "").trim(),
      phone: String(values.get("phone") ?? "").trim() || null,
      ...(passwordSetup === "SET_PASSWORD" ? { password: String(values.get("password") ?? "") } : {}),
      password_setup: passwordSetup,
      role,
      avatar_url: avatarUrl,
      status,
      is_verified: false,
      is_vip: role === "LANDLORD" && isVip,
      vip_expires_at: role === "LANDLORD" && isVip ? sqlDateTime(values.get("vip_expires_at")) : null,
      banned_until: status === "BANNED" ? sqlDateTime(values.get("banned_until")) : null,
      ban_reason: status === "BANNED" ? String(values.get("ban_reason") ?? "").trim() || null : null,
    };

    try {
      const response = await adminApi.createUser(payload);
      if (passwordSetup === "ACTIVATION_LINK") {
        if (response.email_sent) {
          setActivationEmailSent(true);
        } else {
          setActivationEmailError(response.email_error || "Email chưa được gửi. Kiểm tra cấu hình Gmail ở backend.");
          if (response.activation_token) {
            const activationOrigin = process.env.NEXT_PUBLIC_USER_ACTIVATION_ORIGIN || window.location.origin;
            const url = new URL("/activate-account", activationOrigin);
            url.searchParams.set("token", response.activation_token);
            setActivationLink(url.toString());
          }
        }
        setActivationComplete(true);
      } else {
        router.push(`/users/${response.data.user_id}`);
      }
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể tạo tài khoản. Vui lòng kiểm tra kết nối máy chủ.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <header className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[12px] text-slate-500">
            <Link href="/users" className="hover:text-blue-700">Quản lý người dùng</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-700">Thêm tài khoản</span>
          </div>
          <h1 className="text-[21px] font-bold text-slate-900">Thêm tài khoản người dùng mới</h1>
        </div>
        <span className="w-fit rounded-full bg-[#edf2ff] px-2.5 py-1 text-[11px] font-semibold text-[#3759d9]">TẠO TÀI KHOẢN HUBSTAY</span>
      </header>

      {activationComplete ? <section className={`mb-4 rounded-xl border p-4 ${activationEmailSent ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${activationEmailSent ? "text-emerald-600" : "text-amber-600"}`} />
          <div className="min-w-0 flex-1">
            <h2 className={`text-[14px] font-semibold ${activationEmailSent ? "text-emerald-900" : "text-amber-900"}`}>{activationEmailSent ? "Đã tạo tài khoản và gửi email kích hoạt" : "Đã tạo tài khoản nhưng chưa gửi được email"}</h2>
            <p className={`mt-1 text-[12px] leading-5 ${activationEmailSent ? "text-emerald-800" : "text-amber-800"}`}>{activationEmailSent ? "Email kích hoạt đã được gửi đến địa chỉ người dùng. Link chỉ dùng một lần và hết hạn sau 48 giờ." : activationEmailError}</p>
            {activationLink ? <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={activationLink} className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-[12px] text-slate-700" aria-label="Link kích hoạt tài khoản" />
              <button type="button" onClick={() => {
                if (!navigator.clipboard) {
                  setError("Không thể sao chép link. Hãy chọn và sao chép link thủ công.");
                  return;
                }
                void navigator.clipboard.writeText(activationLink).then(() => setCopiedActivationLink(true)).catch(() => {
                  setError("Không thể sao chép link. Hãy chọn và sao chép link thủ công.");
                });
              }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-3 py-2 text-[12px] font-semibold text-white hover:bg-amber-800">
                <Copy className="h-4 w-4" />{copiedActivationLink ? "Đã sao chép" : "Sao chép link"}
              </button>
            </div> : null}
            {!activationEmailSent && !activationLink ? <p className="mt-2 text-[12px] text-rose-700">Không có link dự phòng. Hãy kiểm tra backend và gửi lại lời mời cho tài khoản này.</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/users" className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[12px] font-medium text-emerald-800 hover:bg-emerald-100">Danh sách người dùng</Link>
            </div>
            {error ? <p role="alert" className="mt-2 text-[12px] text-rose-700">{error}</p> : null}
          </div>
        </div>
      </section> : null}

      <form onSubmit={createUser} className={activationComplete ? "hidden" : "grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]"}>
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col items-center border-b border-slate-100 pb-4 text-center">
            {avatarPreview ? <img src={avatarPreview} alt="Ảnh đại diện đã chọn" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#2454d5]"><CircleUserRound className="h-7 w-7" /></div>}
            <h2 className="mt-3 text-[14px] font-semibold text-slate-800">Tài khoản mới</h2>
            <p className="mt-1 max-w-52 text-[12px] leading-5 text-slate-500">Thông tin được lưu trực tiếp vào tài khoản HubStay.</p>
          </div>
          <dl className="space-y-3 pt-4 text-[12px]">
            <SummaryRow label="Trạng thái" value={statusLabels[status]} />
            <SummaryRow label="Vai trò" value={roleLabels[role]} />
            <SummaryRow label="Xác thực" value="Chưa xác thực" />
            {role === "LANDLORD" ? <SummaryRow label="Gói VIP" value={isVip ? "VIP" : "Thường"} /> : null}
          </dl>
        </aside>

        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><SectionTitle number={1} title="Phân loại vai trò người dùng *" /><span className="text-[11px] text-slate-500">Vai trò được lưu trong users.role</span></div>
            <div className="grid gap-3 md:grid-cols-3">
              {(["STUDENT", "WORKER", "LANDLORD"] as const).map((item) => {
                const Icon = item === "LANDLORD" ? Building2 : UserRound;
                return <label key={item} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${role === item ? "border-[#3159e7] bg-[#f4f7ff]" : "border-slate-200 hover:border-blue-300"}`}>
                  <input type="radio" name="role" value={item} checked={role === item} onChange={() => { setRole(item); if (item !== "LANDLORD") setIsVip(false); }} className="accent-[#3159e7]" />
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#eaf2ff] text-[#2454d5]"><Icon className="h-4 w-4" /></span>
                  <span className="text-[13px] font-semibold text-slate-800">{roleLabels[item]}</span>
                </label>;
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><SectionTitle number={2} title="Thông tin tài khoản *" /><span className="text-[11px] text-slate-500">Khớp các trường trong bảng users</span></div>
            <label className="block text-[12px] font-medium text-slate-600">Họ và tên *<input name="full_name" required maxLength={100} autoComplete="name" placeholder="Nguyễn Văn An" className={inputClassName} /></label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-medium text-slate-600">Email *<span className="relative mt-1.5 block"><Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input name="email" type="email" required maxLength={100} autoComplete="email" placeholder="nguyenvana@email.com" className={`${inputClassName} mt-0 pl-9`} /></span></label>
              <label className="block text-[12px] font-medium text-slate-600">Số điện thoại<span className="relative mt-1.5 block"><Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input name="phone" type="tel" maxLength={15} autoComplete="tel" placeholder="0987 654 321" className={`${inputClassName} mt-0 pl-9`} /></span></label>
            </div>
            <label className="mt-3 block text-[12px] font-medium text-slate-600">Ảnh đại diện (tùy chọn)
              <span className="relative mt-1.5 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-[13px] text-slate-600 hover:border-blue-400">
                <ImagePlus className="h-4 w-4 text-blue-600" />
                {avatarFile?.name ?? "Chọn ảnh từ máy tính (JPG, PNG, WebP; tối đa 5 MB)"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setAvatarFile(file);
                  setAvatarPreview(file ? URL.createObjectURL(file) : "");
                }} />
              </span>
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3"><SectionTitle number={3} title="Thiết lập Kích hoạt & Mật khẩu *" /></div>
            <div className="space-y-2">
              <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${passwordSetup === "ACTIVATION_LINK" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <input type="radio" name="password_setup" value="ACTIVATION_LINK" checked={passwordSetup === "ACTIVATION_LINK"} onChange={() => setPasswordSetup("ACTIVATION_LINK")} className="mt-0.5 accent-[#3159e7]" />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-slate-800"><Link2 className="h-3.5 w-3.5" />Link kích hoạt bảo mật <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Khuyên dùng</span></span>
                  <span className="mt-1 block text-[11px] leading-4 text-slate-500">Người dùng tự đặt mật khẩu bằng link gửi tới email. Khi chưa cấu hình email, link sẽ hiển thị để quản trị viên gửi thủ công.</span>
                </span>
              </label>
              <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${passwordSetup === "SET_PASSWORD" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <input type="radio" name="password_setup" value="SET_PASSWORD" checked={passwordSetup === "SET_PASSWORD"} onChange={() => setPasswordSetup("SET_PASSWORD")} className="mt-0.5 accent-[#3159e7]" />
                <span className="min-w-0">
                  <span className="text-[12px] font-semibold text-slate-800">Đặt trước mật khẩu khởi tạo cho người dùng</span>
                  <span className="mt-1 block text-[11px] leading-4 text-slate-500">Quản trị viên tự đặt mật khẩu ban đầu và thông báo trực tiếp cho người dùng.</span>
                </span>
              </label>
            </div>
            {passwordSetup === "SET_PASSWORD" ? <label className="mt-3 block text-[12px] font-medium text-slate-600">Mật khẩu khởi tạo *<span className="relative mt-1.5 block"><KeyRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input name="password" type={showInitialPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" className={`${inputClassName} mt-0 pl-9 pr-10`} /><button type="button" onClick={() => setShowInitialPassword((visible) => !visible)} aria-label={showInitialPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showInitialPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showInitialPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span><span className="mt-1 block text-[11px] font-normal text-slate-500">Mật khẩu sẽ được băm trước khi lưu, không trả về trình duyệt.</span></label> : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-medium text-slate-600">Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value as UserStatus)} className={inputClassName}><option value="ACTIVE">Đang hoạt động</option><option value="WARNING">Cảnh báo</option><option value="BANNED">Bị khóa</option></select></label>
              <div className="block text-[12px] font-medium text-slate-600">Xác thực danh tính<div className={`${inputClassName} flex items-center bg-slate-50 text-slate-600`}>Chưa xác thực</div><span className="mt-1 block text-[11px] font-normal text-slate-500">Tài khoản mới mặc định chưa xác thực.</span></div>
            </div>
            {status === "BANNED" ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-medium text-slate-600">Khóa đến<input name="banned_until" type="datetime-local" className={inputClassName} /></label>
              <label className="block text-[12px] font-medium text-slate-600">Lý do khóa<input name="ban_reason" maxLength={2000} placeholder="Nhập lý do khóa tài khoản" className={inputClassName} /></label>
            </div> : null}
          </section>

          {role === "LANDLORD" ? <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3"><SectionTitle number={4} title="Gói VIP" /></div>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input type="checkbox" checked={isVip} onChange={(event) => setIsVip(event.target.checked)} className="h-4 w-4 accent-[#3159e7]" />
              <span><span className="block text-[13px] font-semibold text-slate-800">Kích hoạt VIP cho tài khoản</span><span className="mt-1 block text-[11px] text-slate-500">Trạng thái được lưu trong users.is_vip.</span></span>
            </label>
            {isVip ? <label className="mt-3 block max-w-sm text-[12px] font-medium text-slate-600">VIP hết hạn lúc<input name="vip_expires_at" type="datetime-local" className={inputClassName} /></label> : null}
          </section> : null}

          {error ? <ErrorMessage>{error}</ErrorMessage> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/users" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" /> Quay lại danh sách</Link>
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2149c9] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#193da9] disabled:cursor-wait disabled:opacity-60"><ShieldCheck className="h-3.5 w-3.5" />{isSaving ? "Đang tạo..." : "Tạo tài khoản"}</button>
          </div>
        </div>
      </form>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-700">{value}</dd></div>;
}

function UserDetailsPage({ id }: { id: string }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditedPassword, setShowEditedPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      const userId = Number(id);
      if (!Number.isInteger(userId) || userId < 1) {
        if (!cancelled) setError("Mã người dùng không hợp lệ.");
        return;
      }
      try {
        const response = await adminApi.user(userId);
        if (!cancelled) setUser(response.data);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Không thể tải thông tin người dùng.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [id]);

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const nextRole = roleFromForm(values.get("role"));
    let avatarUrl = user.avatar_url;
    if (avatarFile) {
      try {
        avatarUrl = await adminApi.uploadAvatar(avatarFile);
      } catch (reason) {
        setError(reason instanceof ApiError ? reason.message : "Không thể tải ảnh đại diện lên.");
        setIsSaving(false);
        return;
      }
    }
    const payload: UserPayload = {
      full_name: String(values.get("full_name") ?? "").trim(),
      email: String(values.get("email") ?? "").trim(),
      phone: String(values.get("phone") ?? "").trim() || null,
      avatar_url: avatarUrl,
      role: nextRole,
      status: statusFromForm(values.get("status")),
      is_verified: values.get("is_verified") === "on",
      is_vip: nextRole === "LANDLORD" && values.get("is_vip") === "on",
      vip_expires_at: nextRole === "LANDLORD" ? sqlDateTime(values.get("vip_expires_at")) : null,
      banned_until: sqlDateTime(values.get("banned_until")),
      ban_reason: String(values.get("ban_reason") ?? "").trim() || null,
    };
    const password = String(values.get("password") ?? "");
    if (password) payload.password = password;

    try {
      const response = await adminApi.updateUser(user.user_id, payload);
      setUser(response.data);
      setAvatarFile(null);
      setAvatarPreview("");
      setSelectedRole(null);
      setIsEditing(false);
      setNotice("Đã cập nhật thông tin người dùng.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể cập nhật thông tin người dùng.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus() {
    if (!user) return;
    const nextStatus: UserStatus = user.status === "BANNED" ? "ACTIVE" : "BANNED";
    const action = nextStatus === "BANNED" ? "khóa" : "mở khóa";
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${user.full_name}?`)) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await adminApi.updateUser(user.user_id, { status: nextStatus, ban_reason: nextStatus === "BANNED" ? "Khóa bởi quản trị viên" : null, banned_until: null });
      setUser(response.data);
      setNotice(`Đã ${action} tài khoản.`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể cập nhật trạng thái.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteUser() {
    if (!user || !window.confirm(`Xóa vĩnh viễn tài khoản ${user.full_name}? Các bài đăng, yêu cầu và giao dịch liên quan có thể bị xóa theo khóa ngoại.`)) return;
    setIsSaving(true);
    setError("");
    try {
      await adminApi.deleteUser(user.user_id);
      router.push("/users");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể xóa tài khoản.");
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-[14px] text-slate-500">Đang tải thông tin người dùng...</div>;
  if (!user) return <div className="space-y-4"><Link href="/users" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-700"><ArrowLeft className="h-4 w-4" /> Quay lại danh sách</Link><ErrorMessage>{error || "Không tìm thấy người dùng."}</ErrorMessage></div>;

  const isVerified = Boolean(user.is_verified);
  const isLandlord = (selectedRole ?? user.role) === "LANDLORD";
  const isVip = isLandlord && Boolean(user.is_vip);
  const isBanned = user.status === "BANNED";

  return (
    <>
      <header className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[12px] text-slate-500"><Link href="/users" className="hover:text-blue-700">Quản lý người dùng</Link><ChevronRight className="h-3 w-3" /><span className="text-slate-700">Chi tiết người dùng</span></div>
          <h1 className="text-[21px] font-bold text-slate-900">Chi tiết người dùng</h1>
        </div>
        <Link href="/users" className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" /> Quay lại danh sách</Link>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500"><span>Mã người dùng</span><span className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-700">{user.user_id}</span><span className={`rounded-full px-2.5 py-1 font-semibold ${isBanned ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{statusLabels[user.status]}</span></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={isSaving} onClick={() => { setError(""); if (isEditing) setSelectedRole(null); setIsEditing((current) => !current); }} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{isEditing ? "Đóng chỉnh sửa" : "Chỉnh sửa hồ sơ"}</button>
          <button type="button" disabled={isSaving} onClick={() => void toggleStatus()} className="rounded-lg border border-amber-200 px-3 py-2 text-[12px] font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">{isBanned ? "Mở khóa tài khoản" : "Khóa tài khoản"}</button>
          <button type="button" disabled={isSaving} onClick={() => void deleteUser()} aria-label="Xóa người dùng" className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {error ? <div className="mb-4"><ErrorMessage>{error}</ErrorMessage></div> : null}
      {notice ? <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-700">{notice}</div> : null}

      <form onSubmit={saveUser} className="grid items-start gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col items-center border-b border-slate-100 pb-4 text-center">
            {avatarPreview || user.avatar_url ? <img src={avatarPreview || user.avatar_url || ""} alt={`Ảnh đại diện ${user.full_name}`} className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf2ff] text-[18px] font-bold text-[#2454d5]">{initials(user.full_name)}</div>}
            <h2 className="mt-3 text-[13px] font-semibold text-slate-900">{user.full_name}</h2>
            <span className="mt-2 rounded-full bg-[#eaf2ff] px-2.5 py-1 text-[11px] font-semibold text-[#2454d5]">{roleLabels[user.role]}</span>
          </div>
          <dl className="space-y-3 pt-4 text-[12px]">
            <SummaryRow label="Trạng thái" value={statusLabels[user.status]} />
            <SummaryRow label="Xác thực" value={isVerified ? "Đã xác thực" : "Chưa xác thực"} />
            {isLandlord ? <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Gói</dt><dd><VIPStatusBadge status={isVip ? "VIP" : "STANDARD"} /></dd></div> : null}
            {isLandlord ? <SummaryRow label="VIP hết hạn" value={user.vip_expires_at ? inputDateTime(user.vip_expires_at).replace("T", " ") : "Chưa thiết lập"} /> : null}
            <SummaryRow label="Ngày tạo" value={user.created_at} />
          </dl>
        </aside>

        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4"><SectionTitle number={1} title="Thông tin cá nhân & liên hệ" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Họ và tên" name="full_name" defaultValue={user.full_name} disabled={!isEditing} required maxLength={100} />
              <TextField label="Email" name="email" type="email" defaultValue={user.email} disabled={!isEditing} required maxLength={100} />
              <TextField label="Số điện thoại" name="phone" defaultValue={user.phone ?? ""} disabled={!isEditing} maxLength={15} />
              <label className="block text-[12px] font-medium text-slate-600">Ảnh đại diện
                <span className={`relative mt-1.5 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-[13px] ${isEditing ? "cursor-pointer hover:border-blue-400" : "bg-slate-50 text-slate-400"}`}>
                  <ImagePlus className="h-4 w-4 text-blue-600" />
                  {avatarFile?.name ?? (user.avatar_url ? "Đã có ảnh · chọn ảnh khác để thay" : "Chọn ảnh từ máy tính (JPG, PNG, WebP; tối đa 5 MB)")}
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!isEditing} className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setAvatarFile(file);
                    setAvatarPreview(file ? URL.createObjectURL(file) : "");
                  }} />
                </span>
              </label>
              <SelectField label="Vai trò" name="role" defaultValue={selectedRole ?? user.role} disabled={!isEditing} onChange={(value) => setSelectedRole(roleFromForm(value))} options={Object.entries(roleLabels).map(([value, label]) => [value, label])} />
              <SelectField label="Trạng thái" name="status" defaultValue={user.status} disabled={!isEditing} options={Object.entries(statusLabels).map(([value, label]) => [value, label])} />
              {isEditing ? <label className="block text-[12px] font-medium text-slate-600">Đặt mật khẩu mới (để trống nếu giữ nguyên)<span className="relative mt-1.5 block"><input name="password" type={showEditedPassword ? "text" : "password"} minLength={8} autoComplete="new-password" className={`${inputClassName} pr-10`} /><button type="button" onClick={() => setShowEditedPassword((visible) => !visible)} aria-label={showEditedPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showEditedPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showEditedPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              <CheckField label="Đã xác thực danh tính" name="is_verified" checked={isVerified} disabled={!isEditing} />
              {isLandlord ? <CheckField label="Tài khoản VIP" name="is_vip" checked={isVip} disabled={!isEditing} /> : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4"><SectionTitle number={2} title={isLandlord ? "VIP, khóa tài khoản & eKYC" : "Khóa tài khoản & eKYC"} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {isLandlord ? <TextField label="VIP hết hạn lúc" name="vip_expires_at" type="datetime-local" defaultValue={inputDateTime(user.vip_expires_at)} disabled={!isEditing} /> : null}
              <TextField label="Khóa đến" name="banned_until" type="datetime-local" defaultValue={inputDateTime(user.banned_until)} disabled={!isEditing} />
              <TextField label="Lý do khóa" name="ban_reason" defaultValue={user.ban_reason ?? ""} disabled={!isEditing} />
              <ReadField label="eKYC mới nhất" value={user.latest_verification ? `${user.latest_verification.status} · ${user.latest_verification.account_type}` : "Chưa có hồ sơ xác thực"} />
            </div>
            {user.latest_verification?.rejection_reason ? <p className="mt-3 text-[12px] text-rose-700">Lý do từ chối: {user.latest_verification.rejection_reason}</p> : null}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4"><SectionTitle number={3} title="Hoạt động tài khoản" /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ReadField label="Tổng bài đăng" value={String(user.post_count ?? 0)} icon={<Building2 className="h-4 w-4" />} />
              <ReadField label="Bài đang hoạt động" value={String(user.active_post_count ?? 0)} icon={<BadgeCheck className="h-4 w-4" />} />
              {isLandlord ? <ReadField label="Gói VIP đang hoạt động" value={String(user.active_subscription_count ?? 0)} icon={<ShieldCheck className="h-4 w-4" />} /> : null}
              <ReadField label="Tạo lúc" value={user.created_at} icon={<Clock3 className="h-4 w-4" />} />
              <ReadField label="Cập nhật gần nhất" value={user.updated_at ?? "Chưa có dữ liệu"} icon={<Clock3 className="h-4 w-4" />} />
            </div>
          </section>

          {isEditing ? <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" disabled={isSaving} onClick={() => { setSelectedRole(null); setIsEditing(false); }} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50">Hủy chỉnh sửa</button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2149c9] px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#193da9] disabled:opacity-60"><Check className="h-3.5 w-3.5" />{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</button>
          </div> : null}
        </div>
      </form>
    </>
  );
}

function TextField({ label, name, defaultValue, type = "text", disabled = false, required = false, maxLength, minLength, autoComplete }: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  autoComplete?: string;
}) {
  return <label className="block text-[12px] font-medium text-slate-600">{label}<input name={name} type={type} defaultValue={defaultValue} disabled={disabled} required={required} maxLength={maxLength} minLength={minLength} autoComplete={autoComplete} className={inputClassName} /></label>;
}

function SelectField({ label, name, defaultValue, disabled, options, onChange }: { label: string; name: string; defaultValue: string; disabled: boolean; options: string[][]; onChange?: (value: string) => void }) {
  return <label className="block text-[12px] font-medium text-slate-600">{label}<select name={name} value={name === "role" ? defaultValue : undefined} defaultValue={name === "role" ? undefined : defaultValue} onChange={onChange ? (event) => onChange(event.target.value) : undefined} disabled={disabled} className={inputClassName}>{options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}</select></label>;
}

function CheckField({ label, name, checked, disabled }: { label: string; name: string; checked: boolean; disabled: boolean }) {
  return <label className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-700"><input type="checkbox" name={name} defaultChecked={checked} disabled={disabled} className="h-4 w-4 accent-[#3159e7]" />{label}</label>;
}

function ReadField({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return <div><p className="text-[11px] font-medium text-slate-500">{label}</p><div className="mt-1.5 flex min-h-10 items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-700">{icon ? <span className="text-slate-400">{icon}</span> : null}<span className="break-all">{value}</span></div></div>;
}

export default function UserPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <AdminLayout>
      <main className="mx-auto max-w-6xl">
        {id === "add" ? <AddUserPage /> : <UserDetailsPage id={id} />}
      </main>
    </AdminLayout>
  );
}
