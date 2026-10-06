"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  FileText,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

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

  const { data: order, isLoading, error, refetch } = useQuery<OrderDetail>({
    queryKey: ["order", guestToken],
    queryFn: async () => {
      const res = await fetch(`/api/v1/orders/${guestToken}`);
      if (!res.ok) throw new Error("Order not found");
      return res.json();
    },
    refetchInterval: (query) => {
      // Poll every 2s while in progress, stop when terminal
      const status = query.state.data?.status;
      if (status === "COMPLETED" || status === "CANCELLED") return false;
      return 2000;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Retrieving order status...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
        <h2 className="font-bold text-base">Order Not Found</h2>
        <p className="text-sm mt-1">Please check your order link.</p>
      </div>
    );
  }

  const isCompleted = order.status === "COMPLETED";
  const isPickupReady = order.status === "PICKUP_READY";
  const isPrinting = order.status === "PRINTING";
  const isQueued = order.status === "QUEUED" || order.status === "DISPATCHED" || order.status === "PAID";
  const isFailed = order.status === "PRINT_FAILED" || order.status === "RECONCILING";

  return (
    <div className="space-y-5">
      {/* Order Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
          Order ID
        </span>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{order.order_number}</h1>

        {/* Dynamic Status Badge */}
        <div className="mt-4 flex flex-col items-center justify-center">
          {isCompleted && (
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>
          )}
          {isPickupReady && (
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 animate-bounce">
              <ShieldCheck className="w-7 h-7" />
            </div>
          )}
          {isPrinting && (
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
              <Printer className="w-7 h-7 animate-pulse" />
            </div>
          )}
          {isQueued && (
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <Clock className="w-7 h-7" />
            </div>
          )}
          {isFailed && (
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-7 h-7" />
            </div>
          )}

          <div className="text-base font-bold text-slate-900">
            {isCompleted && "Order Completed"}
            {isPickupReady && "Print Ready for Pickup!"}
            {isPrinting && "Currently Printing..."}
            {isQueued && "In Queue"}
            {isFailed && "Processing Issue — Operator Reconciling"}
          </div>

          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            {isCompleted && "Thank you! Your document was collected."}
            {isPickupReady && "Your document has been printed and is held securely. Present your pickup code below to the shop operator."}
            {isPrinting && "The printer adapter is physically spooling your pages."}
            {isQueued && `Position #${order.queue_position || 1} in queue &bull; ~${order.estimated_wait_minutes || 2} min estimated wait`}
            {isFailed && "The operator is inspecting the physical printer tray."}
          </p>
        </div>
      </div>

      {/* PRIVACY HOLD OTP CARD */}
      {(isPickupReady || isCompleted) && (
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl p-5 shadow-lg shadow-emerald-700/20 text-center space-y-2">
          <div className="flex items-center justify-center space-x-1.5 text-emerald-200">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              Privacy Hold Verification Code
            </span>
          </div>
          <div className="py-2">
            <div className="text-4xl font-mono font-extrabold tracking-widest bg-white/10 rounded-xl py-3 border border-white/20">
              {order.pickup_otp || "482913"}
            </div>
          </div>
          <p className="text-[11px] text-emerald-100/90 max-w-xs mx-auto">
            Show this 6-digit code to the shopkeeper to collect your private documents.
          </p>
        </div>
      )}

      {/* Document & Settings Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Document Details
        </h2>
        <div className="flex items-center space-x-3 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-900 truncate">{order.document_name}</p>
            <p className="text-[11px] text-slate-500">{order.document_pages} pages</p>
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="space-y-1.5 text-xs text-slate-600 pt-1">
          <div className="flex justify-between">
            <span>Color Mode</span>
            <span className="font-semibold text-slate-900">{order.pricing_breakdown?.color_mode || "BW"}</span>
          </div>
          <div className="flex justify-between">
            <span>Copies</span>
            <span className="font-semibold text-slate-900">{order.pricing_breakdown?.copies || 1}</span>
          </div>
          <div className="flex justify-between">
            <span>Duplex (2-sided)</span>
            <span className="font-semibold text-slate-900">{order.pricing_breakdown?.duplex ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-slate-900 text-sm">
            <span>Amount Paid</span>
            <span>₹{(order.total_amount_cents / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
