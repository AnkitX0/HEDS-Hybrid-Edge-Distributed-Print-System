import React from "react";

export type StatusType =
  | "ONLINE"
  | "OFFLINE"
  | "BUSY"
  | "ERROR"
  | "QUEUED"
  | "DISPATCHED"
  | "PRINTING"
  | "COMPLETED"
  | "PICKUP_READY"
  | "FAILED"
  | "RECONCILING"
  | "CANCELLED"
  | "PAID"
  | "PAYMENT_PENDING";

interface StatusIndicatorProps {
  status: StatusType | string;
  label?: string;
  className?: string;
}

export function StatusIndicator({ status, label, className = "" }: StatusIndicatorProps) {
  const normalized = (status || "").toUpperCase();

  let dotColor = "bg-slate-400";
  let textColor = "text-slate-400";
  let pulse = false;

  switch (normalized) {
    case "ONLINE":
    case "COMPLETED":
      dotColor = "bg-emerald-500";
      textColor = "text-emerald-400";
      break;
    case "PRINTING":
    case "DISPATCHED":
    case "BUSY":
      dotColor = "bg-blue-500";
      textColor = "text-blue-400";
      pulse = true;
      break;
    case "QUEUED":
    case "PAYMENT_PENDING":
    case "PAID":
      dotColor = "bg-amber-400";
      textColor = "text-amber-300";
      break;
    case "PICKUP_READY":
      dotColor = "bg-purple-400";
      textColor = "text-purple-300";
      break;
    case "RECONCILING":
      dotColor = "bg-orange-400";
      textColor = "text-orange-300";
      pulse = true;
      break;
    case "FAILED":
    case "ERROR":
      dotColor = "bg-rose-500";
      textColor = "text-rose-400";
      break;
    case "OFFLINE":
    case "CANCELLED":
    default:
      dotColor = "bg-slate-500";
      textColor = "text-slate-400";
      break;
  }

  const displayLabel = label || normalized.replace("_", " ");

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor} ${className}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulse ? "opacity-90 animate-pulse" : ""}`}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  );
}
