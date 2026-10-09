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
  let textColor = "text-slate-600";
  let pulse = false;

  switch (normalized) {
    case "ONLINE":
    case "COMPLETED":
      dotColor = "bg-emerald-600";
      textColor = "text-emerald-700";
      break;
    case "PRINTING":
    case "DISPATCHED":
    case "BUSY":
      dotColor = "bg-blue-600";
      textColor = "text-blue-700";
      pulse = true;
      break;
    case "QUEUED":
    case "PAYMENT_PENDING":
    case "PAID":
      dotColor = "bg-amber-500";
      textColor = "text-amber-700";
      break;
    case "PICKUP_READY":
      dotColor = "bg-indigo-600";
      textColor = "text-indigo-700";
      break;
    case "RECONCILING":
      dotColor = "bg-orange-500";
      textColor = "text-orange-700";
      pulse = true;
      break;
    case "FAILED":
    case "ERROR":
      dotColor = "bg-rose-600";
      textColor = "text-rose-700";
      break;
    case "OFFLINE":
    case "CANCELLED":
    default:
      dotColor = "bg-slate-400";
      textColor = "text-slate-500";
      break;
  }

  const displayLabel = label || normalized.replace("_", " ");

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor} ${className}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulse ? "animate-pulse" : ""}`}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  );
}
