import React from "react";

export type BadgeVariant = "default" | "neutral" | "success" | "warning" | "danger" | "info" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  let styles = "bg-slate-100 text-slate-700 border-slate-200";

  switch (variant) {
    case "default":
    case "neutral":
      styles = "bg-slate-100 text-slate-700 border-slate-200";
      break;
    case "success":
      styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "warning":
      styles = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "danger":
      styles = "bg-rose-50 text-rose-700 border-rose-200";
      break;
    case "info":
      styles = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case "purple":
      styles = "bg-indigo-50 text-indigo-700 border-indigo-200";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${styles} ${className}`}
    >
      {children}
    </span>
  );
}
