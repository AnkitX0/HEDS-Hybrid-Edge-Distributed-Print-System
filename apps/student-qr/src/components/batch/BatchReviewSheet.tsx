"use client";

import React from "react";
import {
  X,
  CreditCard,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { BatchDocumentItem, BatchPricingBreakdown } from "./types";

interface BatchReviewSheetProps {
  isOpen: boolean;
  items: BatchDocumentItem[];
  pricing: BatchPricingBreakdown | null;
  isCalculatingPrice: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onPay: () => void;
  disabled?: boolean;
}

export const BatchReviewSheet: React.FC<BatchReviewSheetProps> = ({
  isOpen,
  items,
  pricing,
  isCalculatingPrice,
  isSubmitting,
  onClose,
  onPay,
  disabled = false,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const readyItems = items.filter((it) => it.status === "READY");
  const processingCount = items.filter(
    (it) => it.status === "UPLOADING" || it.status === "PROCESSING"
  ).length;
  const errorCount = items.filter((it) => it.status === "ERROR").length;

  const totalDocuments = readyItems.length;
  const totalPages = pricing?.total_pages ?? readyItems.reduce((acc, it) => acc + (it.page_count * it.copies), 0);
  const totalSheets = pricing?.total_sheets ?? readyItems.reduce((acc, it) => {
    const pgs = it.page_count;
    const sheetsPerCopy = it.duplex ? Math.ceil(pgs / 2) : pgs;
    return acc + (sheetsPerCopy * it.copies);
  }, 0);

  const subtotalFormatted = pricing
    ? (pricing.raw_total_cents / 100).toFixed(2)
    : "0.00";
  const duplexDiscountFormatted = pricing && pricing.duplex_discount_cents > 0
    ? (pricing.duplex_discount_cents / 100).toFixed(2)
    : "0.00";
  const totalFormatted = pricing
    ? (pricing.final_amount_cents / 100).toFixed(2)
    : "0.00";

  const canCheckout =
    totalDocuments > 0 &&
    processingCount === 0 &&
    errorCount === 0 &&
    !isCalculatingPrice &&
    !disabled;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pt-2.5 pb-3 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-sm font-bold text-slate-900">PRINT SUMMARY</h3>
            <p className="text-[11px] text-slate-500 font-mono">
              {totalDocuments} {totalDocuments === 1 ? "document" : "documents"} &bull; {totalPages} pages &bull; {totalSheets} sheets
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400"
            aria-label="Close review"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Itemized Breakdown */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          <div className="space-y-2">
            {readyItems.map((item, idx) => {
              const pricingItem =
                pricing?.items?.find((p) => p.document_id === item.document_id) ||
                pricing?.items?.[idx];
              const itemPriceFormatted = pricingItem
                ? (pricingItem.final_amount_cents / 100).toFixed(2)
                : ((item.calculated_price_cents || 0) / 100).toFixed(2);

              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate" title={item.name}>
                      {idx + 1}. {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {item.page_count} pgs &times; {item.copies}x &bull; {item.color_mode === "COLOR" ? "Color" : "B&W"} + {item.duplex ? "Duplex" : "Single"}
                    </div>
                    {item.page_range && item.page_range !== "all" && (
                      <div className="text-[10px] text-blue-600 font-mono">
                        Pages: {item.page_range}
                      </div>
                    )}
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-right shrink-0">
                    ₹{itemPriceFormatted}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Summary */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-600">
              <span className="font-sans">Subtotal</span>
              <span>₹{subtotalFormatted}</span>
            </div>
            {pricing && pricing.duplex_discount_cents > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span className="font-sans">Duplex discount</span>
                <span>-₹{duplexDiscountFormatted}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span className="font-sans">Service fee</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span className="font-sans text-xs uppercase tracking-wider text-slate-700">TOTAL</span>
              <span className="text-lg">₹{totalFormatted}</span>
            </div>
          </div>

          {/* Errors or Warnings */}
          {processingCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
              <span>{processingCount} files still being processed.</span>
            </div>
          )}

          {errorCount > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorCount} file(s) failed processing. Remove to proceed.</span>
            </div>
          )}
        </div>

        {/* Footer Checkout Button */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
          <button
            type="button"
            onClick={onPay}
            disabled={!canCheckout || isSubmitting}
            className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Order...</span>
              </>
            ) : (
              <>
                <span>Pay ₹{totalFormatted}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>UPI &bull; Instant Queue Token &bull; Real-time status</span>
          </div>
        </div>
      </div>
    </div>
  );
};
