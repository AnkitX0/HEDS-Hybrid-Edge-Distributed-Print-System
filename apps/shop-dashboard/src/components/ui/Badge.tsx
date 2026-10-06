import React from "react";

export type BadgeVariant = "default" | "neutral" | "success" | "warning" | "danger" | "info" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  let styles = "bg-slate-800 text-slate-300 border-slate-700";

  switch (variant) {
    case "default":
    case "neutral":
      styles = "bg-slate-800 text-slate-300 border-slate-700";
      break;
    case "success":
      styles = "bg-emerald-950/60 text-emerald-400 border-emerald-800/80";
      break;
    case "warning":
      styles = "bg-amber-950/60 text-amber-300 border-amber-800/80";
      break;
    case "danger":
      styles = "bg-rose-950/60 text-rose-300 border-rose-800/80";
      break;
    case "info":
      styles = "bg-blue-950/60 text-blue-300 border-blue-800/80";
      break;
    case "purple":
      styles = "bg-purple-950/60 text-purple-300 border-purple-800/80";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${styles} ${className}`}
    >
      {children}
    </span>
  );
}
