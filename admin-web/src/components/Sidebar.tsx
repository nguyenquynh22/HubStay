'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  CreditCard,
  Crown,
  FileText,
  Flag,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  WalletCards,
  Users,
} from "lucide-react";
import { navigationItems } from "@/lib/navigation";
import { clearAdminSessionVerification } from "@/lib/admin-session";

const iconMap = {
  overview: LayoutDashboard,
  users: Users,
  verification: BadgeCheck,
  posts: FileText,
  reports: Flag,
  revenue: WalletCards,
  schools: GraduationCap,
  transactions: CreditCard,
  subscriptions: Crown,
} as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function signOut() {
    window.localStorage.removeItem("admin_token");
    window.sessionStorage.removeItem("admin_token");
    window.localStorage.removeItem("admin_profile");
    clearAdminSessionVerification();
    router.replace("/login");
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-30 w-[236px] border-r border-slate-200 bg-white pr-[2px]">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-center border-b border-slate-200 px-4 pb-3 pt-4" style={{ height: "68px" }}>
          <div className="flex w-full items-center justify-center bg-white p-1">
            <Image
              src="/screen.png"
              alt="HubStay logo"
              width={180}
              height={48}
              className="h-[46px] w-auto object-contain"
              priority
            />
          </div>
        </div>

        <nav className="shrink-0 px-3 py-2.5">
          <ul className="space-y-1.5">
            {navigationItems.map((item) => {
              if ("type" in item) {
                return (
                  <li key={item.label} className="px-3 pb-1 pt-3 first:pt-0">
                    <div className="border-t border-slate-200 pt-2.5 text-[10px] font-bold tracking-[0.12em] text-slate-400">
                      {item.label}
                    </div>
                  </li>
                );
              }

              const Icon = iconMap[item.icon as keyof typeof iconMap];
              const active = item.href === "/"
                ? pathname === "/" || pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={[
                      "group flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all",
                      active
                        ? "bg-[#3a5bf5] text-white shadow-sm"
                        : "text-[#475569] hover:bg-slate-100 hover:text-slate-900",
                    ].join(" ")}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className={active ? "h-4 w-4 shrink-0 text-white" : "h-4 w-4 shrink-0 text-slate-500"} />
                      <span className={item.label === "Duyệt hồ sơ xác thực" ? "whitespace-nowrap" : ""}>{item.label}</span>
                    </span>

                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto shrink-0 border-t border-slate-200 bg-white px-3 py-2.5">
          <div className="text-[12px] text-slate-600">
            <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-rose-600 hover:bg-rose-50">
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
