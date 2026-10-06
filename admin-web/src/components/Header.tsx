"use client";

import { Bell } from "lucide-react";

interface HeaderProps {
  breadcrumbs?: Array<{ label: string; href?: string }>;
  adminName: string;
}

export function Header({
  adminName,
  breadcrumbs = [
    { label: "Trang chủ" },
    { label: "Hệ thống điều hành" },
  ],
}: HeaderProps) {
  const displayName = adminName.trim();
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");

  return (
    <header className="fixed left-[236px] right-0 top-0 z-20 h-[68px] border-b border-slate-200 bg-white">
      <div className="flex h-full items-center justify-between gap-4 px-5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-slate-500">
          {breadcrumbs.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center gap-2">
              <span className={index === breadcrumbs.length - 1 ? "font-semibold text-[#1d4ed8]" : "text-slate-500"}>
                {item.label}
              </span>
              {index < breadcrumbs.length - 1 && <span className="text-slate-300">/</span>}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"
            aria-label="Thông báo"
          >
            <Bell className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-[11px] font-semibold text-white">
              {initials || "QT"}
            </div>
            <div className="hidden sm:block">
              <div className="text-[12px] font-semibold text-slate-800">{displayName}</div>
              <div className="text-[10px] text-slate-500">Quản trị viên</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
