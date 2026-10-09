"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Printer,
  FileText,
  AlertTriangle,
  Receipt,
  Download,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { apiClient } from "@/lib/api/client";

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

  // Poll order status every 2 seconds until COMPLETED or CANCELLED
  const { data: order, isLoading, error } = useQuery<OrderDetail>({
    queryKey: ["order", guestToken],
    queryFn: async () => {
      return apiClient.get<OrderDetail>(`/api/v1/orders/${guestToken}`);
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "COMPLETED" || status === "CANCELLED") return false;
      return 2000;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 space-y-3">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono">Loading live print token...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card className="text-center p-6 space-y-3 border-rose-200 bg-rose-50/50">
        <AlertTriangle className="w-8 h-8 mx-auto text-rose-600" />
        <h2 className="font-bold text-sm text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-600">
          We couldn&apos;t find an order matching this token. Please verify your tracking URL.
        </p>
      </Card>
    );
  }

  // Map order status to simple user-friendly states
  const isCompleted = order.status === "COMPLETED";
  const isReady = order.status === "PICKUP_READY";
  const isPrinting = order.status === "PRINTING";
  const isWaiting =
    order.status === "QUEUED" ||
    order.status === "DISPATCHED" ||
    order.status === "PAID" ||
    order.status === "CREATED";
  const isReconciling = order.status === "RECONCILING" || order.status === "PRINT_FAILED";

  const totalAmountFormatted = `₹${(order.total_amount_cents / 100).toFixed(2)}`;

  // Format token display: e.g. "ORD-49210" -> "#49210" or "HDS-1051" -> "#51"
  const tokenNumber = order.order_number.includes("-")
    ? `#${order.order_number.split("-").pop()}`
    : `#${order.order_number}`;

  const receiptPdfUrl = `/api/v1/orders/${guestToken}/receipt.pdf`;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `HEDS Print Token ${tokenNumber}`,
          text: `My print token is ${tokenNumber} for order ${order.order_number}.`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      alert("Tracking link copied to clipboard!");
    }
  };

  const handleDownloadPdf = () => {
    const link = document.createElement("a");
    link.href = receiptPdfUrl;
    link.download = `receipt_${order.order_number}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* SCREEN 4 & 5: PRIMARY PRINT TOKEN CARD */}
      <Card padding="lg" className="text-center space-y-4 shadow-xs border-slate-200">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
            {isCompleted
              ? "COLLECTED"
              : isReady
              ? "READY FOR PICKUP"
              : isPrinting
              ? "NOW PRINTING"
              : "IN QUEUE"}
          </span>
          <span className="text-xs text-slate-500 font-mono block">Your Print Token</span>
          <div className="text-5xl font-mono font-extrabold text-slate-900 tracking-tight my-2">
            {tokenNumber}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Order Ref: {order.order_number}
          </p>
        </div>

        {/* STATUS BANNER */}
        <div className="py-3 px-4 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
          {isCompleted && (
            <div className="space-y-1">
              <Badge variant="success">COMPLETED</Badge>
              <p className="text-xs text-slate-600">Document collected at the counter.</p>
            </div>
          )}

          {isReady && (
            <div className="space-y-1">
              <Badge variant="success">READY FOR PICKUP</Badge>
              <p className="text-xs font-semibold text-emerald-800">
                Your document is printed and ready!
              </p>
              <p className="text-[11px] text-slate-600">
                Show token <span className="font-bold text-slate-900">{tokenNumber}</span> at the counter.
              </p>
            </div>
          )}

          {isPrinting && (
            <div className="space-y-2">
              <Badge variant="info">PRINTING IN PROGRESS</Badge>
              <p className="text-xs text-slate-700">
                Spooling pages to physical printer...
              </p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-3/4 animate-pulse rounded-full"></div>
              </div>
            </div>
          )}

          {isWaiting && (
            <div className="space-y-1">
              <Badge variant="warning">WAITING IN QUEUE</Badge>
              <p className="text-xs text-slate-700">
                Your document has entered the queue.
              </p>
              <div className="flex justify-center items-center gap-4 text-xs font-mono text-slate-600 pt-1">
                <span>Queue Pos: <strong className="text-slate-900">#{order.queue_position || 1}</strong></span>
                <span>Wait: <strong className="text-slate-900">~{order.estimated_wait_minutes || 1} min</strong></span>
              </div>
            </div>
          )}

          {isReconciling && (
            <div className="space-y-1">
              <Badge variant="warning">RECONCILING</Badge>
              <p className="text-xs text-amber-800">
                Printer checking physical status with operator.
              </p>
            </div>
          )}
        </div>

        {/* DOCUMENT DETAILS SUMMARY */}
        <div className="pt-2 text-left border-t border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              Document
            </span>
            <span className="font-medium text-slate-900 truncate max-w-[200px]">
              {order.document_name}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span>Pages & Total</span>
            <span className="font-mono font-medium text-slate-900">
              {order.document_pages} pages &bull; {totalAmountFormatted}
            </span>
          </div>
        </div>

        {/* RECEIPT & ACTION BUTTONS */}
        <div className="pt-2 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReceipt(true)}
              className="flex items-center justify-center gap-1 text-xs"
            >
              <Receipt className="w-3.5 h-3.5" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="flex items-center justify-center gap-1 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center justify-center gap-1 text-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
          </div>
        </div>
      </Card>

      {/* SCREEN 6: RECEIPT MODAL */}
      <Modal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        title="Official Print Receipt"
      >
        <div className="space-y-4 font-mono text-xs">
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <span className="font-bold text-slate-900 text-sm block">HEDS PRINT RECEIPT</span>
            <span className="text-slate-500 text-[10px]">Hybrid Edge Distributed Print System</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Print Token:</span>
              <span className="font-bold text-slate-900 text-sm">{tokenNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Order Ref:</span>
              <span className="text-slate-800">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Document:</span>
              <span className="text-slate-800 truncate max-w-[180px]">{order.document_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pages:</span>
              <span className="text-slate-800">{order.document_pages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Status:</span>
              <span className="text-emerald-700 font-bold">PAID</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span className="text-slate-800">
                {new Date(order.created_at).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-dashed border-slate-300 flex justify-between font-bold text-sm text-slate-900">
            <span>Total Paid</span>
            <span>{totalAmountFormatted}</span>
          </div>

          <div className="pt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="flex-1 flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowReceipt(false)}
              className="px-4"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

