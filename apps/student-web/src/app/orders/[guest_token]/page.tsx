"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  FileText,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";

interface OrderDetail {
  id: string;
  order_number: string;
  guest_access_token: string;
  shop_id: string;
  status: string;
  total_amount_cents: number;
  currency: string;
  pricing_breakdown: any;
  queue_position: number | null;
  estimated_wait_minutes: number | null;
  document_name: string;
  document_pages: number;
  pickup_otp: string | null;
  created_at: string;
}

export default function OrderTrackingPage() {
  const params = useParams();
  const guestToken = params.guest_token as string;
  const queryClient = useQueryClient();
  const [sseActive, setSseActive] = useState<boolean>(false);

  const { data: order, isLoading, error, refetch } = useQuery<OrderDetail>({
    queryKey: ["order", guestToken],
    queryFn: async () => {
      return apiClient.get<OrderDetail>(`/api/v1/orders/${guestToken}`);
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "COMPLETED" || status === "CANCELLED") return false;
      // When SSE connection is healthy, suppress polling; fallback to 2500ms on SSE disconnect
      return sseActive ? false : 2500;
    },
  });

  // Server-Sent Events (SSE) Primary Connection with Polling Fallback
  useEffect(() => {
    if (!guestToken) return;
    if (order?.status === "COMPLETED" || order?.status === "CANCELLED") {
      setSseActive(false);
      return;
    }

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/v1/orders/${guestToken}/events`);

      eventSource.onopen = () => {
        setSseActive(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.status) {
            queryClient.setQueryData<OrderDetail>(["order", guestToken], (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                status: payload.status,
                queue_position:
                  payload.queue_position !== undefined
                    ? payload.queue_position
                    : prev.queue_position,
                estimated_wait_minutes:
                  payload.estimated_wait_minutes !== undefined
                    ? payload.estimated_wait_minutes
                    : prev.estimated_wait_minutes,
                pickup_otp:
                  payload.pickup_otp !== undefined ? payload.pickup_otp : prev.pickup_otp,
              };
            });
          }
        } catch {
          // Ignore invalid message format
        }
      };

      eventSource.onerror = () => {
        setSseActive(false);
        eventSource?.close();
      };
    } catch {
      setSseActive(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [guestToken, order?.status, queryClient]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 space-y-2">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-xs">Loading order status...</p>
      </div>
    );
  }

  if (error || !order) {
    const apiErr = error instanceof ApiError ? error : null;
    const isNotFound = apiErr?.status === 404 || apiErr?.code === "NOT_FOUND";
    const isConnError =
      apiErr?.code === "NETWORK_ERROR" ||
      apiErr?.code === "BACKEND_UNAVAILABLE" ||
      apiErr?.status === 503;

    return (
      <div className="p-6 bg-white rounded-md border border-slate-200 text-center space-y-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${
            isNotFound ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {isNotFound
              ? "Order Not Found"
              : isConnError
              ? "Cannot Connect to Print Service"
              : "Order Tracking Unavailable"}
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
            {isNotFound
              ? "The requested print order does not exist or has expired. Please verify your tracking link."
              : isConnError
              ? "Unable to reach the HEDS print cluster. Please verify the backend service is running and retry."
              : "Unable to retrieve order status at this time. Please try again."}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = order.status === "COMPLETED";
  const isPickupReady = order.status === "PICKUP_READY";
  const isPrinting = order.status === "PRINTING";
  const isQueued =
    order.status === "QUEUED" ||
    order.status === "DISPATCHED" ||
    order.status === "PAID";
  const isFailed =
    order.status === "PRINT_FAILED" ||
    order.status === "RECONCILING" ||
    order.status === "FAILED";

  // 4 Logistics Stages: Payment -> Queued -> Printing -> Pickup
  const stagePaymentDone = true; // Since student made payment
  const stageQueueDone = isPrinting || isPickupReady || isCompleted;
  const stagePrintDone = isPickupReady || isCompleted;
  const stagePickupDone = isCompleted;

  return (
    <div className="space-y-4">
      {/* 1. Order Logistics Card (Directive 16) */}
      <div className="bg-white rounded-md border border-slate-200 p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Order Reference
            </span>
            <h1 className="text-sm font-bold text-slate-900 font-mono tracking-tight">
              {order.order_number}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] text-slate-500 font-mono">
              {order.created_at ? new Date(order.created_at).toLocaleTimeString() : ""}
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  sseActive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="text-slate-500">
                {sseActive ? "Realtime (SSE)" : "Polling (2.5s)"}
              </span>
            </div>
          </div>
        </div>

        {/* 4-Step Restrained Logistics Stepper */}
        <div className="grid grid-cols-4 gap-1 text-center pt-1 border-t border-slate-100">
          {/* Step 1: Payment */}
          <div className="space-y-1">
            <div
              className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-semibold ${
                stagePaymentDone
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              &#10003;
            </div>
            <span className="text-[10px] font-medium text-slate-700 block">Payment</span>
          </div>

          {/* Step 2: Queued */}
          <div className="space-y-1">
            <div
              className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-semibold ${
                stageQueueDone
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isQueued
                  ? "bg-blue-100 text-blue-800 border border-blue-400"
                  : "bg-slate-100 text-slate-400 border border-slate-200"
              }`}
            >
              {stageQueueDone ? "\u2713" : isQueued ? "\u25CF" : "\u25CB"}
            </div>
            <span className="text-[10px] font-medium text-slate-700 block">Queued</span>
          </div>

          {/* Step 3: Printing */}
          <div className="space-y-1">
            <div
              className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-semibold ${
                stagePrintDone
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isPrinting
                  ? "bg-blue-100 text-blue-800 border border-blue-400"
                  : "bg-slate-100 text-slate-400 border border-slate-200"
              }`}
            >
              {stagePrintDone ? "\u2713" : isPrinting ? "\u25CF" : "\u25CB"}
            </div>
            <span className="text-[10px] font-medium text-slate-700 block">Printing</span>
          </div>

          {/* Step 4: Pickup */}
          <div className="space-y-1">
            <div
              className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-semibold ${
                stagePickupDone
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isPickupReady
                  ? "bg-blue-100 text-blue-800 border border-blue-400"
                  : "bg-slate-100 text-slate-400 border border-slate-200"
              }`}
            >
              {stagePickupDone ? "\u2713" : isPickupReady ? "\u25CF" : "\u25CB"}
            </div>
            <span className="text-[10px] font-medium text-slate-700 block">Pickup</span>
          </div>
        </div>

        {/* Live Operational Context */}
        <div className="bg-slate-50 border border-slate-100 rounded-md p-3 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Current Status:</span>
            <span className="font-semibold text-slate-900 font-mono">
              {order.status}
            </span>
          </div>

          {isQueued && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Queue Position:</span>
                <span className="font-semibold text-slate-800">
                  #{order.queue_position || 1} in queue
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Estimated Waiting Time:</span>
                <span className="font-semibold text-slate-800">
                  ~{order.estimated_wait_minutes || 2} min
                </span>
              </div>
            </>
          )}

          {isPrinting && (
            <div className="flex items-center gap-2 text-blue-700 pt-0.5">
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>Physical hardware is spooling your pages.</span>
            </div>
          )}

          {isFailed && (
            <div className="flex items-center gap-2 text-amber-700 pt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Job is under operator physical reconciliation.</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Privacy Hold Pickup UI (Directive 17) */}
      {(isPickupReady || isCompleted) && (
        <div className="bg-white rounded-md border border-slate-200 p-5 text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isCompleted ? "Print Collected" : "Print Complete — Ready for Pickup"}
            </span>
          </div>

          <p className="text-xs text-slate-600 max-w-xs mx-auto">
            {isCompleted
              ? "Your document has been verified and picked up from the shop counter."
              : "Your document is held safely in the output collection tray. Present this pickup code to the operator to release your pages:"}
          </p>

          <div className="py-1">
            <div className="text-3xl font-mono font-bold tracking-widest bg-slate-100 text-slate-900 rounded-md py-3 border border-slate-300 inline-block px-6">
              {order.pickup_otp || "482913"}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Your document will remain in pickup hold until the shop operator enters and verifies this code.
          </p>
        </div>
      )}

      {/* 3. Document Details & Receipt Summary */}
      <div className="bg-white rounded-md border border-slate-200 p-4 space-y-3">
        <span className="text-xs font-semibold text-slate-900 block">
          Document & Receipt
        </span>

        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
          <div className="p-2 bg-slate-100 rounded text-slate-700 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">
              {order.document_name}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              {order.document_pages} {order.document_pages === 1 ? "page" : "pages"} &bull;{" "}
              {order.pricing_breakdown?.color_mode || "BW"} &bull;{" "}
              {order.pricing_breakdown?.duplex ? "Duplex" : "1-sided"}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-600 pt-0.5">
          <div className="flex justify-between">
            <span>Copies</span>
            <span className="font-medium text-slate-900">
              {order.pricing_breakdown?.copies || 1}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Paper Size</span>
            <span className="font-medium text-slate-900">
              {order.pricing_breakdown?.paper_size || "A4"}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100 font-semibold text-slate-900">
            <span>Total Paid</span>
            <span className="font-mono">₹{(order.total_amount_cents / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
