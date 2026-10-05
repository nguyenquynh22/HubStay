"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Home,
  LockKeyhole,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { FormEvent, useState } from "react";

import RoleCard from "@/components/auth/RoleCard";
import { ApiError, adminApi } from "@/services/api";

type Role = "STUDENT" | "WORKER" | "LANDLORD";

export default function RegisterPage() {
  const [role, setRole] = useState<Role>("STUDENT");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setSuccess("");
    const form = new FormData(formElement);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (!email) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!agreeTerms) {
      setError("Vui lòng đồng ý với điều khoản để tiếp tục.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminApi.register({
        full_name: fullName,
        email,
        ...(phone ? { phone } : {}),
        password,
        role,
      });
      setSuccess(result.message);
      formElement.reset();
      setAgreeTerms(false);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể kết nối máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-white">
      <div className="flex h-full w-full">

        {/* =====================================================
            BÊN TRÁI
        ===================================================== */}
        <aside className="hidden h-full w-[38%] shrink-0 bg-[#2d5af5] text-white lg:block">
          <div className="flex h-full flex-col px-10 py-9 xl:px-14">

            {/* Logo */}
            <Link
              href="/"
              className="flex w-fit items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                <Home className="h-6 w-6" />
              </div>

              <span className="text-[25px] font-bold tracking-tight">
                HubStay
              </span>
            </Link>

            {/* Nội dung */}
            <div className="flex flex-1 flex-col justify-center">

              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-blue-100">
                Tham gia HubStay
              </p>

              <h1 className="max-w-[450px] text-[42px] font-bold leading-[1.12] tracking-tight xl:text-[46px]">
                Tạo tài khoản
                <br />
                và bắt đầu ngay.
              </h1>

              <p className="mt-5 max-w-[410px] text-[15px] leading-6 text-blue-100">
                Tìm phòng, tìm bạn ở ghép hoặc đăng chỗ ở
                của bạn trên HubStay.
              </p>

              {/* Features */}
              <div className="mt-9 space-y-4">
                <Feature
                  icon={<Search className="h-[18px] w-[18px]" />}
                  title="Tìm chỗ ở"
                  description="Tìm phòng phù hợp với nhu cầu."
                />

                <Feature
                  icon={<Users className="h-[18px] w-[18px]" />}
                  title="Kết nối"
                  description="Tìm bạn ở ghép phù hợp."
                />

                <Feature
                  icon={<ShieldCheck className="h-[18px] w-[18px]" />}
                  title="An tâm sử dụng"
                  description="Thông tin được quản lý an toàn."
                />
              </div>
            </div>

            <p className="text-xs text-blue-100/80">
              © {new Date().getFullYear()} HubStay
            </p>
          </div>
        </aside>

        {/* =====================================================
            BÊN PHẢI - FORM
        ===================================================== */}
        <section className="h-full min-w-0 flex-1 overflow-y-auto bg-white">
          <div className="mx-auto w-full max-w-[720px] px-7 py-10 sm:px-10 lg:px-12">

            {/* Mobile logo */}
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link
                href="/"
                className="flex items-center gap-2.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2d5af5] text-white">
                  <Home className="h-5 w-5" />
                </div>

                <span className="text-xl font-bold text-slate-900">
                  HubStay
                </span>
              </Link>

              <Link
                href="/login"
                className="text-sm font-semibold text-[#2d5af5]"
              >
                Đăng nhập
              </Link>
            </div>

            {/* =================================================
                HEADER
            ================================================= */}
            <div className="mb-7">
              <h2 className="text-[28px] font-bold tracking-tight text-slate-900">
                Tạo tài khoản
              </h2>

              <p className="mt-1.5 text-[14px] text-slate-500">
                Điền thông tin để tham gia HubStay.
              </p>
            </div>

            {/* =================================================
                FORM DUY NHẤT
            ================================================= */}
            <form onSubmit={handleSubmit}>
              {error ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
              {success ? <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}{" "}<Link href="/login" className="font-semibold underline">Đăng nhập</Link></p> : null}

              {/* Họ tên + SĐT */}
              <div className="grid gap-4 sm:grid-cols-2">

                <Field
                  id="fullName"
                  name="fullName"
                  label="Họ và tên"
                  icon={<UserRound className="h-[17px] w-[17px]" />}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                />

                <Field
                  id="phone"
                  name="phone"
                  label="Số điện thoại (không bắt buộc)"
                  icon={<Phone className="h-[17px] w-[17px]" />}
                  placeholder="09xxxxxxxx"
                  type="tel"
                  autoComplete="tel"
                  required={false}
                />

              </div>

              {/* Email */}
              <div className="mt-4">
                <Field
                  id="email"
                  name="email"
                  label="Email"
                  icon={<Mail className="h-[17px] w-[17px]" />}
                  placeholder="example@gmail.com"
                  type="email"
                  autoComplete="email"
                />
              </div>
              {/* =================================================
                  VAI TRÒ
              ================================================= */}
              <div className="mt-5">

                <label className="mb-2.5 block text-[13px] font-medium text-slate-700">
                  Bạn tham gia với tư cách <span className="text-rose-600">*</span>
                </label>

                <div className="grid gap-3 sm:grid-cols-3">

                  <RoleCard
                    selected={role === "STUDENT"}
                    onClick={() => setRole("STUDENT")}
                    icon={<GraduationCap className="h-5 w-5" />}
                    title="Sinh viên"
                    description="Tìm phòng"
                  />

                  <RoleCard
                    selected={role === "WORKER"}
                    onClick={() => setRole("WORKER")}
                    icon={<BriefcaseBusiness className="h-5 w-5" />}
                    title="Người đi làm"
                    description="Tìm chỗ ở"
                  />

                  <RoleCard
                    selected={role === "LANDLORD"}
                    onClick={() => setRole("LANDLORD")}
                    icon={<Home className="h-5 w-5" />}
                    title="Chủ trọ"
                    description="Đăng phòng"
                  />

                </div>
              </div>

              {/* =================================================
                  MẬT KHẨU
              ================================================= */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">

                <PasswordField
                  id="password"
                  name="password"
                  label="Mật khẩu"
                  placeholder="Ít nhất 8 ký tự"
                  showPassword={showPassword}
                  onToggle={() =>
                    setShowPassword((value) => !value)
                  }
                />

                <PasswordField
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Xác nhận mật khẩu"
                  placeholder="Nhập lại mật khẩu"
                  showPassword={showConfirmPassword}
                  onToggle={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                />

              </div>

              {/* Gợi ý mật khẩu */}
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Check className="h-3.5 w-3.5 text-[#2d5af5]" />
                Mật khẩu tối thiểu 8 ký tự.
              </div>

              {/* =================================================
                  XÁC MINH
              ================================================= */}
              <div className="mt-5 rounded-xl bg-blue-50/70 px-4 py-3">
                <p className="text-xs leading-5 text-blue-700">
                  <span className="font-semibold">
                    Xác minh tài khoản:
                  </span>{" "}
                  Bạn có thể xác minh sau khi đăng ký trong
                  phần Tài khoản.
                </p>
              </div>

              {/* =================================================
                  TERMS
              ================================================= */}
              <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(event) =>
                    setAgreeTerms(event.target.checked)
                  }
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#2d5af5]"
                />

                <span className="text-xs leading-5 text-slate-500">
                  <span className="text-rose-600">*</span>{" "}
                  Tôi đồng ý với{" "}
                  <Link
                    href="#"
                    className="font-medium text-[#2d5af5] hover:underline"
                  >
                    Điều khoản sử dụng
                  </Link>{" "}
                  và{" "}
                  <Link
                    href="#"
                    className="font-medium text-[#2d5af5] hover:underline"
                  >
                    Chính sách bảo mật
                  </Link>
                  .
                </span>
              </label>

              {/* =================================================
                  SUBMIT
              ================================================= */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2d5af5] text-sm font-semibold text-white transition hover:bg-[#244bd1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Login */}
              <p className="py-5 text-center text-sm text-slate-500">
                Đã có tài khoản?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#2d5af5] hover:underline"
                >
                  Đăng nhập
                </Link>
              </p>

            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =====================================================
   INPUT
===================================================== */

function Field({
  id,
  name,
  label,
  icon,
  placeholder,
  type = "text",
  autoComplete,
  required = true,
}: {
  id: string;
  name: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-medium text-slate-700"
      >
        {label}{required ? <> <span className="text-rose-600">*</span></> : null}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>

        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2d5af5] focus:ring-4 focus:ring-blue-50"
        />
      </div>
    </div>
  );
}

/* =====================================================
   PASSWORD
===================================================== */

function PasswordField({
  id,
  name,
  label,
  placeholder,
  showPassword,
  onToggle,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  showPassword: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-medium text-slate-700"
      >
        {label} <span className="text-rose-600">*</span>
      </label>

      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />

        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder={placeholder}
          minLength={8}
          required
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2d5af5] focus:ring-4 focus:ring-blue-50"
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
          }
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {showPassword ? (
            <EyeOff className="h-[17px] w-[17px]" />
          ) : (
            <Eye className="h-[17px] w-[17px]" />
          )}
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   LEFT FEATURE
===================================================== */

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
        {icon}
      </div>

      <div>
        <p className="text-[14px] font-semibold">
          {title}
        </p>

        <p className="mt-0.5 text-[12px] text-blue-100">
          {description}
        </p>
      </div>
    </div>
  );
}