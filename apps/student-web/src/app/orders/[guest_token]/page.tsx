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
  Sparkles,
  Layers,
  ArrowRight,
  Copy,
  Check,
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
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery<OrderDetail>({
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

  const copyOrderRef = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.order_number);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 space-y-3">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading your print token...</p>
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
      <div className="p-6 bg-white rounded-xl border border-slate-200 text-center space-y-3 shadow-sm my-6">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
            isNotFound ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {isNotFound
              ? "Order Not Found"
              : isConnError
              ? "Cannot Connect to Print Service"
              : "Order Tracking Unavailable"}
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Derive human-readable token number from order reference (e.g. ORD-92657 -> #57)
  const tokenNumber = order.order_number.replace(/\D/g, "").slice(-2) || "01";

  const isCompleted = order.status === "COMPLETED";
  const isPickupReady = order.status === "PICKUP_READY";
  const isPrinting = order.status === "PRINTING";
  const isQueued =
    order.status === "QUEUED" ||
    order.status === "DISPATCHED" ||
    order.status === "PAID";

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Memorable Ticket / Token Card (Directive 10) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ticket-edge">
        {/* Ticket Header Stub */}
        <div className="bg-slate-900 text-white p-5 text-center space-y-1 relative">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>PRINT TOKEN</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  sseActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span>{sseActive ? "Live SSE" : "Polling"}</span>
            </div>
          </div>

          {/* Token Big Badge */}
          <div className="py-2">
            <span className="text-4xl font-black tracking-tight text-white font-mono">
              #{tokenNumber}
            </span>
          </div>

          {/* Human status summary */}
          <p className="text-xs font-medium text-indigo-300">
            {isCompleted
              ? "Print Collected ✓"
              : isPickupReady
              ? "Ready for Counter Pickup!"
              : isPrinting
              ? "Now Printing on Hardware..."
              : "In Digital Print Queue"}
          </p>
        </div>

        {/* Perforation Dashed Separator */}
        <div className="border-t-2 border-dashed border-slate-200 my-0 relative" />

        {/* Ticket Body Content */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Queue Position
              </span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {isCompleted
                  ? "Done"
                  : isPickupReady
                  ? "At Counter"
                  : isPrinting
                  ? "At Printer"
                  : `Position ${order.queue_position || 1}`}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Est. Wait
              </span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {isCompleted
                  ? "0 min"
                  : isPickupReady
                  ? "Ready Now"
                  : `~${order.estimated_wait_minutes || 2} min`}
              </span>
            </div>
          </div>

          {/* Document Summary Row */}
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">
                  {order.document_name}
                </p>
                <p className="text-[11px] text-slate-400">
                  {order.document_pages} pages &bull; ₹
                  {(order.total_amount_cents / 100).toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={copyOrderRef}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-800 px-2 py-1 bg-white rounded border border-slate-200"
            >
              {copiedToken ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{order.order_number}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Privacy Hold & Secret Pickup OTP Card */}
      {(isPickupReady || isCompleted || order.pickup_otp) && (
        <div
          className={`rounded-2xl p-4 border transition-all ${
            isCompleted
              ? "bg-slate-50 border-slate-200 text-slate-600"
              : "bg-emerald-600 text-white border-emerald-700 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                isCompleted ? "text-slate-400" : "text-emerald-100"
              }`}
            >
              Counter Pickup Verification
            </span>
            <ShieldCheck
              className={`w-4 h-4 ${isCompleted ? "text-slate-400" : "text-emerald-200"}`}
            />
          </div>

          <div className="text-center py-2 space-y-1">
            <span
              className={`text-[11px] block ${
                isCompleted ? "text-slate-500" : "text-emerald-100"
              }`}
            >
              {isCompleted ? "Verified OTP Code" : "Present this 6-digit OTP to the shopkeeper:"}
            </span>
            <div
              className={`text-3xl font-black font-mono tracking-widest py-1.5 px-4 rounded-xl inline-block ${
                isCompleted
                  ? "bg-slate-200 text-slate-700"
                  : "bg-white text-emerald-800 shadow-sm"
              }`}
            >
              {order.pickup_otp || "------"}
            </div>
          </div>

          {!isCompleted && (
            <p className="text-[11px] text-center text-emerald-100 font-medium">
              Keep this OTP private until you are at the counter to collect your pages.
            </p>
          )}
        </div>
      )}

      {/* 3. 4-Stage Human Status Stepper (Directive 11) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          Order Progress
        </span>

        <div className="space-y-3 pt-1">
          {/* Stage 1: Payment */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
              &#10003;
            </div>
            <div className="flex-1 text-xs">
              <span className="font-semibold text-slate-800 block">Payment Settled</span>
              <span className="text-[11px] text-slate-400">
                Authorized via sandbox gateway
              </span>
            </div>
          </div>

          {/* Stage 2: Queued */}
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isPrinting || isPickupReady || isCompleted
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isQueued
                  ? "bg-indigo-100 text-indigo-700 border border-indigo-300 animate-pulse"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isPrinting || isPickupReady || isCompleted ? (
                "✓"
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex-1 text-xs">
              <span className="font-semibold text-slate-800 block">In Cloud Queue</span>
              <span className="text-[11px] text-slate-400">
                {isQueued && !isPrinting
                  ? `Position ${order.queue_position || 1} &bull; Waiting for printer lease`
                  : "Assigned to shop hardware"}
              </span>
            </div>
          </div>

          {/* Stage 3: Printing */}
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isPickupReady || isCompleted
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isPrinting
                  ? "bg-indigo-600 text-white animate-pulse"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isPickupReady || isCompleted ? (
                "✓"
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex-1 text-xs">
              <span className="font-semibold text-slate-800 block">
                {isPrinting ? "Printing in Progress..." : "Hardware Execution"}
              </span>
              <span className="text-[11px] text-slate-400">
                {isPrinting
                  ? "Spooling pages to physical Xerox tray"
                  : isPickupReady || isCompleted
                  ? "All pages physically spooled"
                  : "Pending hardware availability"}
              </span>
            </div>
          </div>

          {/* Stage 4: Pickup Ready */}
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isCompleted
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isPickupReady
                  ? "bg-emerald-500 text-white animate-bounce"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isCompleted ? "✓" : <ShieldCheck className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 text-xs">
              <span className="font-semibold text-slate-800 block">
                {isCompleted ? "Collected at Counter" : "Counter Handover"}
              </span>
              <span className="text-[11px] text-slate-400">
                {isCompleted
                  ? "Order verified and fulfilled"
                  : isPickupReady
                  ? "Present your OTP to the shopkeeper"
                  : "Secured behind privacy hold OTP"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
