"use client";

import React from "react";
import {
  FileText,
  CreditCard,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { BatchDocumentItem, BatchPricingBreakdown } from "./types";

interface BatchSummaryCardProps {
  items: BatchDocumentItem[];
  pricing: BatchPricingBreakdown | null;
  isCalculatingPrice: boolean;
  isSubmitting: boolean;
  onCheckout: () => void;
  disabled?: boolean;
}

export const BatchSummaryCard: React.FC<BatchSummaryCardProps> = ({
  items,
  pricing,
  isCalculatingPrice,
  isSubmitting,
  onCheckout,
  disabled = false,
}) => {
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-sm text-slate-900 tracking-tight">PRINT SUMMARY</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {totalDocuments} {totalDocuments === 1 ? "document" : "documents"} &bull; {totalPages} pages &bull; {totalSheets} printed sheets
          </p>
        </div>
        {isCalculatingPrice && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[11px]">Updating price...</span>
          </div>
        )}
      </div>

      {/* Itemized Breakdown */}
      {readyItems.length > 0 ? (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 text-xs">
          {readyItems.map((item, idx) => {
            const pricingItem = pricing?.items?.find((p) => p.document_id === item.document_id) || pricing?.items?.[idx];
            const itemPriceFormatted = pricingItem
              ? (pricingItem.final_amount_cents / 100).toFixed(2)
              : ((item.calculated_price_cents || 0) / 100).toFixed(2);

            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 font-sans"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 truncate" title={item.name}>
                    {idx + 1}. {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {item.page_count} {item.page_count === 1 ? "page" : "pages"} &times; {item.copies} {item.copies === 1 ? "copy" : "copies"} &bull;{" "}
                    {item.color_mode === "COLOR" ? "Color" : "B&W"} + {item.duplex ? "Duplex" : "Single"}
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
      ) : (
        <div className="p-4 rounded-lg bg-slate-50 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200">
          Add files to generate itemized pricing
        </div>
      )}

      {/* Price Calculations */}
      <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs font-mono">
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

      {/* Warning/Status notices */}
      {processingCount > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
          <span>
            {processingCount} {processingCount === 1 ? "file is" : "files are"} still being processed.
          </span>
        </div>
      )}

      {errorCount > 0 && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            {errorCount} {errorCount === 1 ? "file has errors" : "files have errors"}. Remove invalid files to checkout.
          </span>
        </div>
      )}

      {/* Checkout Button */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onCheckout}
          disabled={!canCheckout || isSubmitting}
          className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Secure Order...</span>
            </>
          ) : (
            <>
              <span>Continue to Payment</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Authoritative server pricing &bull; Razorpay / UPI</span>
        </div>
      </div>
    </div>
  );
};
