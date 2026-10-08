"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  AlertTriangle,
  Receipt,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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
  created_at: string;
}

export default function OrderTrackingPage() {
  const params = useParams();
  const guestToken = params.guest_token as string;
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: order, isLoading, error } = useQuery<OrderDetail>({
    queryKey: ["order", guestToken],
    queryFn: async () => {
      const res = await fetch(`/api/v1/orders/${guestToken}`);
      if (!res.ok) throw new Error("Order not found");
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "COMPLETED" || status === "CANCELLED") return false;
      return 2000;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 space-y-2">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs">Fetching live order status...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card className="text-center p-6 space-y-2 border-rose-200 bg-rose-50/50 max-w-md mx-auto">
        <AlertTriangle className="w-7 h-7 mx-auto text-rose-600" />
        <h2 className="font-bold text-sm text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-600">Please verify your order link or tracking token.</p>
      </Card>
    );
  }

  const isCompleted = order.status === "COMPLETED";
  const isPickupReady = order.status === "PICKUP_READY";
  const isPrinting = order.status === "PRINTING";
  const isQueued = order.status === "QUEUED" || order.status === "DISPATCHED" || order.status === "PAID" || order.status === "CREATED";
  const isFailed = order.status === "PRINT_FAILED" || order.status === "RECONCILING";

  const totalAmountFormatted = `₹${(order.total_amount_cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Primary Token & Status Card */}
      <Card padding="lg" className="text-center space-y-4 shadow-sm border-slate-200">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
          {isCompleted ? "PRINT COMPLETED" : isPickupReady ? "READY FOR PICKUP" : "PAYMENT SUCCESSFUL"}
        </span>

        <div>
          <span className="text-xs text-slate-500 font-mono block">Your Print Token</span>
          <div className="text-4xl font-mono font-extrabold text-slate-900 tracking-tight my-1">
            {order.order_number}
          </div>
        </div>

        <div className="py-2 border-t border-b border-slate-100 space-y-2">
          {isCompleted && (
            <div className="space-y-1">
              <StatusBadge status="COMPLETED" label="Collected" />
              <p className="text-xs text-slate-600 mt-1">Your document has been collected. Thank you!</p>
            </div>
          )}

          {isPickupReady && (
            <div className="space-y-1">
              <StatusBadge status="READY" label="READY FOR PICKUP" />
              <p className="text-xs font-semibold text-slate-900 mt-1">Your document is ready.</p>
              <p className="text-xs text-slate-600">Show token <strong className="font-mono text-slate-900">{order.order_number}</strong> at the counter.</p>
            </div>
          )}

          {isPrinting && (
            <div className="space-y-2">
              <StatusBadge status="PRINTING" label="PRINTING" />
              <div className="space-y-1 text-xs text-slate-600 font-mono">
                <p>Xerox WorkCentre 7830</p>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-3/4 animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-500">Progress: 34 / {order.document_pages} pages</p>
              </div>
            </div>
          )}

          {isQueued && (
            <div className="space-y-1">
              <StatusBadge status="QUEUED" label="WAITING TO PRINT" />
              <p className="text-xs text-slate-600 mt-1">
                Your document has been added to the print queue.
              </p>
              <div className="flex justify-center gap-3 text-xs font-mono text-slate-500 pt-1">
                <span>Position: #{order.queue_position || 1}</span>
                <span>Wait: ~{order.estimated_wait_minutes || 1} min</span>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="space-y-1">
              <StatusBadge status="FAILED" label="ATTENTION" />
              <p className="text-xs text-rose-700 mt-1">Printer execution interrupted. Shop operator is checking tray.</p>
            </div>
          )}
        </div>

        <div className="pt-1 flex gap-2">
          <Button variant="outline" size="md" className="w-full" onClick={() => setShowReceipt(true)}>
            <Receipt className="w-4 h-4 text-slate-600" />
            View Receipt
          </Button>
        </div>
      </Card>

      {/* Document Specification Card */}
      <Card padding="md" className="space-y-3">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
          Document Details
        </span>

        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-900 truncate">{order.document_name}</p>
            <p className="text-[10px] text-slate-500 font-mono">{order.document_pages} pages</p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-600 font-mono">
          <div className="flex justify-between font-sans">
            <span>Color Mode</span>
            <span className="text-slate-900 font-medium">{order.pricing_breakdown?.color_mode || "BW"}</span>
          </div>
          <div className="flex justify-between font-sans">
            <span>Copies</span>
            <span className="text-slate-900 font-medium">{order.pricing_breakdown?.copies || 1}</span>
          </div>
          <div className="flex justify-between font-sans">
            <span>Sides</span>
            <span className="text-slate-900 font-medium">{order.pricing_breakdown?.duplex ? "Double-sided" : "Single-sided"}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-bold text-slate-900 font-mono">
            <span>Amount Paid</span>
            <span>{totalAmountFormatted}</span>
          </div>
        </div>
      </Card>

      {/* 80mm THERMAL RECEIPT MODAL */}
      <Modal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        title="Print Receipt"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              Print Receipt
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowReceipt(false)}>
              Close
            </Button>
          </>
        }
      >
        <div className="font-mono text-xs text-slate-900 space-y-3 bg-white p-4 border border-slate-200 rounded shadow-xs select-all">
          <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
            <h3 className="font-bold text-sm tracking-widest">HEDS</h3>
            <p className="text-[11px] text-slate-600">Campus Xerox & Print Hub</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase">PRINT RECEIPT</p>
            <p className="text-base font-bold mt-1">Token {order.order_number}</p>
          </div>

          <div className="space-y-1 py-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Document</span>
              <span className="font-semibold truncate max-w-[140px]">{order.document_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pages</span>
              <span>{order.document_pages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Copies</span>
              <span>{order.pricing_breakdown?.copies || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Color</span>
              <span>{order.pricing_breakdown?.color_mode || "BW"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sides</span>
              <span>{order.pricing_breakdown?.duplex ? "Double-sided" : "Single-sided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paper</span>
              <span>A4</span>
            </div>
          </div>

          <div className="space-y-1 py-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span>{order.document_pages} × ₹1.00</span>
              <span>{totalAmountFormatted}</span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-1">
              <span>TOTAL</span>
              <span>{totalAmountFormatted}</span>
            </div>
          </div>

          <div className="space-y-1 py-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment</span>
              <span className="font-bold text-emerald-700">PAID</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Method</span>
              <span>UPI / Razorpay</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Print status</span>
              <span className="font-semibold">{order.status}</span>
            </div>
          </div>

          <div className="text-center pt-1 text-[10px] text-slate-500 space-y-0.5">
            <p>Thank you for using HEDS.</p>
            <p>Keep token {order.order_number} for your records.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
