"use client";

import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Home,
  LockKeyhole,
  Mail,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, adminApi } from "@/services/api";
import { markAdminSessionVerified } from "@/lib/admin-session";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await adminApi.login(String(form.get("identifier") ?? ""), String(form.get("password") ?? ""));
      if (result.admin.role !== "ADMIN") {
        setError("Tài khoản này không có quyền quản trị.");
        return;
      }
      window.localStorage.removeItem("admin_token");
      window.sessionStorage.removeItem("admin_token");
      window.localStorage.setItem("admin_profile", JSON.stringify(result.admin));
      const storage = remember ? window.localStorage : window.sessionStorage;
      storage.setItem("admin_token", result.token);
      markAdminSessionVerified(result.token, result.admin.name.trim());
      router.replace("/dashboard");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể kết nối máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        {/* ================= LEFT ================= */}
        <section className="hidden bg-[#2d5af5] lg:flex">
          <div className="flex w-full flex-col justify-between p-10 xl:p-14">
            {/* Logo */}
            <Link
              href="/"
              className="flex w-fit items-center gap-3 text-white"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Home className="h-5 w-5" />
              </div>

              <span className="text-xl font-bold">
                HubStay
              </span>
            </Link>

            {/* Content */}
            <div className="max-w-md">
              <p className="mb-3 text-xs font-semibold tracking-wider text-blue-100">
                NỀN TẢNG CHỖ Ở
              </p>

              <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                Tìm nơi ở phù hợp
                <br />
                với bạn.
              </h1>

              <p className="mt-5 text-sm leading-6 text-blue-100">
                HubStay giúp sinh viên, người đi làm và chủ trọ
                kết nối với nhau dễ dàng hơn.
              </p>

              <div className="mt-8 space-y-4">
                <Feature
                  icon={<Search className="h-4 w-4" />}
                  text="Tìm kiếm chỗ ở dễ dàng"
                />

                <Feature
                  icon={<Users className="h-4 w-4" />}
                  text="Kết nối người thuê và chủ trọ"
                />

                <Feature
                  icon={<ShieldCheck className="h-4 w-4" />}
                  text="Thông tin rõ ràng, minh bạch"
                />
              </div>
            </div>

            <p className="text-xs text-blue-100">
              © 2026 HubStay
            </p>
          </div>
        </section>

        {/* ================= RIGHT ================= */}
        <section className="flex min-h-screen items-center justify-center px-5 py-8">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <Link
              href="/"
              className="mb-8 flex items-center gap-2 lg:hidden"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2d5af5] text-white">
                <Home className="h-5 w-5" />
              </div>

              <span className="font-bold text-slate-900">
                HubStay
              </span>
            </Link>

            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-3xl font-bold text-slate-900">
                Chào mừng trở lại 👋
              </h2>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
              {/* Email or phone */}
              <div>
                <label
                  htmlFor="identifier"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email/SĐT <span className="text-rose-600">*</span>
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="Nhập email hoặc số điện thoại"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#2d5af5] focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700"
                  >
                    Mật khẩu <span className="text-rose-600">*</span>
                  </label>

                  <button
                    type="button"
                    className="text-xs font-medium text-[#2d5af5] hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Nhập mật khẩu"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm outline-none focus:border-[#2d5af5] focus:ring-4 focus:ring-blue-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) =>
                    setRemember(e.target.checked)
                  }
                  className="h-4 w-4 accent-[#2d5af5]"
                />

                <span className="text-sm text-slate-600">
                  Ghi nhớ đăng nhập
                </span>
              </label>

              {/* Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2d5af5] text-sm font-semibold text-white transition hover:bg-[#244bd1]"
              >
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Register */}
              <p className="pt-2 text-center text-sm text-slate-500">
                Chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[#2d5af5] hover:underline"
                >
                  Đăng ký ngay
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-white">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
        {icon}
      </div>

      {text}
    </div>
  );
}