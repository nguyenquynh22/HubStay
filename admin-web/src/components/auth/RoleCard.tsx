"use client";

import { Check } from "lucide-react";

interface RoleCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function RoleCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[76px] w-full items-center gap-2.5 rounded-xl border px-3 transition ${
        selected
          ? "border-[#2d5af5] bg-blue-50/60 ring-1 ring-[#2d5af5]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          selected
            ? "bg-[#2d5af5] text-white"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] text-slate-500">
          {description}
        </p>
      </div>

      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected
            ? "border-[#2d5af5] bg-[#2d5af5] text-white"
            : "border-slate-300 bg-white"
        }`}
      >
        {selected && <Check className="h-3 w-3" />}
      </div>
    </button>
  );
}