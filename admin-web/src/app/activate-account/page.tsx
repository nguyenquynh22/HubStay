"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { ApiError, adminApi } from "@/services/api";

export default function ActivateAccountPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Link kích hoạt không hợp lệ hoặc không có token.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.activateAccount(token, password);
      setSuccess(true);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Không thể kích hoạt tài khoản. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          {success ? <ShieldCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
        </div>
        <h1 className="text-xl font-bold text-slate-900">{success ? "Tài khoản đã được kích hoạt" : "Kích hoạt tài khoản HubStay"}</h1>
        {success ? (
          <p role="status" className="mt-2 text-sm leading-6 text-slate-600">Mật khẩu đã được thiết lập. Bạn có thể đăng nhập bằng email và mật khẩu mới trên ứng dụng HubStay.</p>
        ) : (
          <form onSubmit={activate} className="mt-5 space-y-4">
            <p className="text-sm leading-6 text-slate-600">Tạo mật khẩu có ít nhất 8 ký tự. Link chỉ dùng một lần và có hiệu lực trong 48 giờ.</p>
            <label className="block text-sm font-medium text-slate-700">Mật khẩu mới
              <span className="relative mt-1.5 block">
                <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-11 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">Nhập lại mật khẩu
              <span className="relative mt-1.5 block">
                <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showConfirmPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-11 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"} aria-pressed={showConfirmPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </span>
            </label>
            {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p> : null}
            <button type="submit" disabled={isSubmitting || !token} className="w-full rounded-lg bg-[#2149c9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#193da9] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Đang kích hoạt..." : "Lưu mật khẩu & kích hoạt"}
            </button>
          </form>
        )}
        {!token && !success ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error || "Link kích hoạt không hợp lệ hoặc không có token."}</p> : null}
      </section>
    </main>
  );
}
