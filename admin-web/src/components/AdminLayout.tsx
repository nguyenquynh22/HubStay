"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ApiError, adminApi } from "@/services/api";
import {
  clearAdminSessionVerification,
  getVerifiedAdminName,
  markAdminSessionVerified,
} from "@/lib/admin-session";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let cachedAdminName = "";
    const token = window.localStorage.getItem("admin_token")
      ?? window.sessionStorage.getItem("admin_token");
    if (!token) {
      clearAdminSessionVerification();
      router.replace("/login");
      return;
    }

    try {
      const cachedProfile = window.localStorage.getItem("admin_profile");
      if (cachedProfile) {
        const profile: unknown = JSON.parse(cachedProfile);
        if (profile && typeof profile === "object" && "name" in profile && typeof profile.name === "string") {
          cachedAdminName = profile.name.trim();
        }
      }
    } catch {
      window.localStorage.removeItem("admin_profile");
    }

    const verifiedName = getVerifiedAdminName(token);
    if (verifiedName) {
      setAdminName(verifiedName);
      setAuthorized(true);
      setSessionError("");
      return;
    }

    if (cachedAdminName) {
      setAdminName(cachedAdminName);
      setAuthorized(true);
    }

    void adminApi.adminSession()
      .then((response) => {
        if (!response.admin || response.admin.role !== "ADMIN") {
          window.localStorage.removeItem("admin_token");
          window.sessionStorage.removeItem("admin_token");
          window.localStorage.removeItem("admin_profile");
          clearAdminSessionVerification();
          setAuthorized(false);
          router.replace("/login");
          return;
        }
        const name = typeof response.admin.name === "string" && response.admin.name.trim()
          ? response.admin.name.trim()
          : cachedAdminName;
        if (!name) {
          throw new Error("Không lấy được tên tài khoản quản trị.");
        }
        markAdminSessionVerified(token, name);
        if (!cancelled) {
          setAdminName(name);
          setAuthorized(true);
          setSessionError("");
        }
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) {
          window.localStorage.removeItem("admin_token");
          window.sessionStorage.removeItem("admin_token");
          window.localStorage.removeItem("admin_profile");
          clearAdminSessionVerification();
          setAuthorized(false);
          router.replace("/login");
          return;
        }
        setSessionError(reason instanceof Error
          ? reason.message
          : "Không thể xác minh phiên quản trị. Vui lòng thử lại.");
      });
    return () => { cancelled = true; };
  }, [retryCount, router]);

  if (!authorized) {
    if (sessionError) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-sm text-slate-600">
          <p role="alert">{sessionError}</p>
          <button
            type="button"
            onClick={() => {
              setSessionError("");
              setRetryCount((count) => count + 1);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Thử lại
          </button>
        </main>
      );
    }
    return <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">Đang kiểm tra quyền quản trị...</main>;
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <Sidebar />

      <div className="min-h-screen pl-[236px]">
        <Header adminName={adminName} />
        <main className="min-h-screen bg-[#f7f8fc] pt-[68px]">
          <div className="px-6 pb-5 pt-4">
            {sessionError ? <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">{sessionError}</p> : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
