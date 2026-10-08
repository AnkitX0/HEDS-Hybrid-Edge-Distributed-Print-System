import React from "react";
import { cn } from "@/lib/utils";

export type StatusType = "waiting" | "printing" | "ready" | "completed" | "failed" | "offline" | "online" | "idle";

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  const norm = (status || "").toString().toLowerCase();

  let variantStyles = "bg-slate-100 text-slate-700 border-slate-200";
  let dotColor = "bg-slate-400";

  if (["ready", "pickup_ready", "online", "completed", "success"].includes(norm)) {
    variantStyles = "bg-emerald-50 text-emerald-800 border-emerald-200";
    dotColor = "bg-emerald-500";
  } else if (["printing", "in_progress", "active", "spooling"].includes(norm)) {
    variantStyles = "bg-blue-50 text-blue-800 border-blue-200";
    dotColor = "bg-blue-600 animate-pulse";
  } else if (["queued", "waiting", "dispatched", "paid", "created"].includes(norm)) {
    variantStyles = "bg-amber-50 text-amber-800 border-amber-200";
    dotColor = "bg-amber-500";
  } else if (["failed", "print_failed", "offline", "error", "reconciling"].includes(norm)) {
    variantStyles = "bg-rose-50 text-rose-800 border-rose-200";
    dotColor = "bg-rose-600";
  }

  const formatText = (st: string) => {
    if (st.toUpperCase() === "PICKUP_READY") return "READY";
    return st.replace(/_/g, " ").toUpperCase();
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-medium rounded border",
        variantStyles,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
      {label || formatText(status)}
    </span>
  );
};
