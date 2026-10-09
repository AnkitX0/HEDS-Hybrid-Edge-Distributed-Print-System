import React from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  variant?: "neutral" | "active" | "success" | "warning" | "danger";
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  variant = "neutral",
  className,
}) => {
  const valueColors = {
    neutral: "text-slate-900",
    active: "text-blue-600",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
  };

  return (
    <div className={cn("bg-white border border-slate-200 rounded-md p-3.5 sm:p-4 space-y-1 shadow-xs", className)}>
      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 block truncate">
        {title}
      </span>
      <div className={cn("text-xl sm:text-2xl font-bold font-mono tracking-tight", valueColors[variant])}>
        {value}
      </div>
      {subtext && <div className="text-[11px] text-slate-500 truncate">{subtext}</div>}
    </div>
  );
};
