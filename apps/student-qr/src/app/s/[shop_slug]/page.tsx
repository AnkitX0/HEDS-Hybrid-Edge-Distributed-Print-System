"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Layers,
  AlertCircle,
  CreditCard,
  Trash2,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  BatchDocumentItem,
  BatchPricingBreakdown,
  ShopInfo,
} from "@/components/batch/types";
import { PrintBatchUploader } from "@/components/batch/PrintBatchUploader";
import { FileBatchCard } from "@/components/batch/FileBatchCard";
import { FileConfigSheet } from "@/components/batch/FileConfigSheet";
import { ApplyAllSheet, BatchSettingsPayload } from "@/components/batch/ApplyAllSheet";
import { DuplicateSheet } from "@/components/batch/DuplicateSheet";
import { BatchReviewSheet } from "@/components/batch/BatchReviewSheet";

export default function ShopStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = params.shop_slug as string;

  // Batch State
  const [items, setItems] = useState<BatchDocumentItem[]>([]);
  const [activeConfigItem, setActiveConfigItem] = useState<BatchDocumentItem | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isApplyAllOpen, setIsApplyAllOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<BatchDocumentItem | null>(null);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Quote & Payment State
  const [pricingBreakdown, setPricingBreakdown] = useState<BatchPricingBreakdown | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Shop Info Query
  const {
    data: shop,
    isLoading: isShopLoading,
    error: shopError,
  } = useQuery<ShopInfo>({
    queryKey: ["shop", shopSlug],
    queryFn: async () => {
      const res = await fetch(`/api/v1/shops/${shopSlug}`);
      if (!res.ok) throw new Error("Print shop not found");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Recalculate Authoritative Batch Quote
  const refreshQuote = useCallback(
    async (currentItems: BatchDocumentItem[]) => {
      const readyItems = currentItems.filter(
        (it) => it.status === "READY" && it.document_id
      );

      if (readyItems.length === 0) {
        setPricingBreakdown(null);
        return;
      }

      setIsCalculatingPrice(true);
      try {
        const payload = {
          items: readyItems.map((it) => ({
            document_id: it.document_id,
            copies: it.copies,
            color_mode: it.color_mode,
            duplex: it.duplex,
            paper_size: it.paper_size,
            page_range:
              it.page_range_mode === "custom" && it.page_range
                ? it.page_range
                : "all",
            orientation: it.orientation,
            scaling: it.scaling,
          })),
        };

        const res = await fetch(`/api/v1/shops/${shopSlug}/pricing/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to calculate batch quote");
        }

        const data: BatchPricingBreakdown = await res.json();
        setPricingBreakdown(data);

        setItems((prev) =>
          prev.map((it) => {
            const itemPrice = data.items?.find((p) => p.document_id === it.document_id);
            if (itemPrice) {
              return {
                ...it,
                calculated_price_cents: itemPrice.final_amount_cents,
                sheets_count: itemPrice.sheets_count,
              };
            }
            return it;
          })
        );
      } catch (err: any) {
        console.error("Quote error:", err);
      } finally {
        setIsCalculatingPrice(false);
      }
    },
    [shopSlug]
  );

  // Add Files (Appends to existing batch)
  const handleFilesAdded = async (newFiles: File[]) => {
    if (!newFiles.length) return;
    setErrorMessage(null);

    const clientItems: BatchDocumentItem[] = newFiles.map((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      const isImg = ["jpg", "jpeg", "png", "webp"].includes(ext);

      return {
        id: `m-file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file: f,
        name: f.name,
        size: f.size,
        mime_type: f.type,
        page_count: isImg ? 1 : 0,
        status: "UPLOADING",
        copies: 1,
        color_mode: "BW",
        duplex: false,
        paper_size: "A4",
        page_range_mode: "all",
        page_range: "all",
        orientation: "PORTRAIT",
        scaling: "FIT",
        calculated_price_cents: 0,
      };
    });

    setItems((prev) => [...prev, ...clientItems]);

    const formData = new FormData();
    newFiles.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch(`/api/v1/shops/${shopSlug}/documents/upload-multiple`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to process documents");
      }

      const resData = await res.json();
      const serverDocs: any[] = resData.documents || [];

      setItems((prevItems) => {
        const next = prevItems.map((item) => {
          const matching = serverDocs.find(
            (sd) => sd.filename === item.name && item.status === "UPLOADING"
          );
          if (matching) {
            if (matching.status === "ERROR") {
              return {
                ...item,
                status: "ERROR" as const,
                error: matching.error || "Unable to process document",
              };
            }
            return {
              ...item,
              document_id: matching.id,
              page_count: matching.page_count || 1,
              status: "READY" as const,
              error: undefined,
            };
          }
          return item;
        });

        refreshQuote(next);
        return next;
      });
    } catch (err: any) {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (clientItems.some((ci) => ci.id === item.id)) {
            return {
              ...item,
              status: "ERROR",
              error: err.message || "Failed to process file",
            };
          }
          return item;
        })
      );
      setErrorMessage(err.message || "Failed to process files.");
    }
  };

  // Remove File
  const handleRemove = (itemToRemove: BatchDocumentItem) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== itemToRemove.id);
      refreshQuote(next);
      return next;
    });
  };

  // Reordering
  const handleMoveUp = (idx: number) => {
    if (idx <= 0) return;
    setItems((prev) => {
      const next = [...prev];
      const temp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = temp;
      refreshQuote(next);
      return next;
    });
  };

  const handleMoveDown = (idx: number) => {
    if (idx >= items.length - 1) return;
    setItems((prev) => {
      const next = [...prev];
      const temp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = temp;
      refreshQuote(next);
      return next;
    });
  };

  // Configure
  const handleConfigure = (item: BatchDocumentItem) => {
    setActiveConfigItem(item);
    setIsConfigOpen(true);
  };

  const handleSaveConfig = (updated: BatchDocumentItem) => {
    setItems((prev) => {
      const next = prev.map((it) => (it.id === updated.id ? updated : it));
      refreshQuote(next);
      return next;
    });
    setToastMessage(`Saved settings for ${updated.name}`);
  };

  // Duplicate
  const handleDuplicate = (item: BatchDocumentItem) => {
    setDuplicateSource(item);
    setIsDuplicateOpen(true);
  };

  const handleExecuteDuplicate = (source: BatchDocumentItem, targetIds: string[]) => {
    setItems((prev) => {
      const next = prev.map((it) => {
        if (!targetIds.includes(it.id)) return it;
        return {
          ...it,
          copies: source.copies,
          color_mode: source.color_mode,
          duplex: it.name.match(/\.(jpg|jpeg|png|webp)$/i) ? false : source.duplex,
          paper_size: source.paper_size,
          orientation: source.orientation,
          scaling: source.scaling,
          page_range_mode: "all" as const,
          page_range: "all",
        };
      });
      refreshQuote(next);
      return next;
    });
    setToastMessage(`Settings copied to ${targetIds.length} files`);
  };

  // Apply to All
  const handleApplyAll = (settings: BatchSettingsPayload) => {
    setItems((prev) => {
      const next = prev.map((it) => {
        const isImg = it.name.match(/\.(jpg|jpeg|png|webp)$/i);
        return {
          ...it,
          copies: settings.copies !== undefined ? settings.copies : it.copies,
          color_mode: settings.colorMode !== undefined ? settings.colorMode : it.color_mode,
          duplex:
            settings.duplex !== undefined
              ? isImg
                ? false
                : settings.duplex
              : it.duplex,
          paper_size: settings.paperSize !== undefined ? settings.paperSize : it.paper_size,
          orientation:
            settings.orientation !== undefined ? settings.orientation : it.orientation,
        };
      });
      refreshQuote(next);
      return next;
    });
    setToastMessage(`Applied settings to all ${items.length} files`);
  };

  // Clear
  const handleClearAll = () => {
    setItems([]);
    setPricingBreakdown(null);
    setErrorMessage(null);
  };

  // Checkout and Pay
  const handleCheckoutAndPay = async () => {
    const readyItems = items.filter((it) => it.status === "READY" && it.document_id);
    if (!readyItems.length || !shop) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        items: readyItems.map((it) => ({
          document_id: it.document_id,
          copies: it.copies,
          color_mode: it.color_mode,
          duplex: it.duplex,
          paper_size: it.paper_size,
          page_range:
            it.page_range_mode === "custom" && it.page_range
              ? it.page_range
              : "all",
          orientation: it.orientation,
          scaling: it.scaling,
        })),
      };

      const res = await fetch(`/api/v1/shops/${shopSlug}/orders/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to create order");
      }

      const orderData = await res.json();
      const guestToken = orderData.guest_access_token;
      if (!guestToken) {
        throw new Error("Missing guest order token from server");
      }

      // Simulate payment success
      const payRes = await fetch(`/api/v1/orders/${guestToken}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate_status: "success" }),
      });

      if (!payRes.ok) {
        throw new Error("Payment execution failed");
      }

      // Navigate to order token tracking page
      router.push(`/orders/${guestToken}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during payment.");
      setIsSubmitting(false);
      setIsReviewOpen(false);
    }
  };

  if (isShopLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 space-y-2">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading print shop storefront...</p>
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <Card className="text-center p-6 space-y-2 border-rose-200 bg-rose-50/50 max-w-sm mx-auto mt-8">
        <AlertCircle className="w-7 h-7 mx-auto text-rose-600" />
        <h2 className="font-bold text-sm text-slate-900">Print Shop Unavailable</h2>
        <p className="text-xs text-slate-600">The shop link or QR code is inactive.</p>
      </Card>
    );
  }

  const readyItems = items.filter((it) => it.status === "READY");
  const isAnyProcessing = items.some(
    (it) => it.status === "UPLOADING" || it.status === "PROCESSING"
  );
  const totalAmountFormatted = pricingBreakdown
    ? (pricingBreakdown.final_amount_cents / 100).toFixed(2)
    : "0.00";

  return (
    <div className="pb-24 max-w-md mx-auto px-3.5 pt-2 space-y-4">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-3 left-4 right-4 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Header Card */}
      <Card padding="sm" className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-base text-slate-900">{shop.name}</h1>
            <p className="text-[11px] text-slate-500">Fast mobile print kiosk</p>
          </div>
          <Badge variant={shop.is_queue_paused ? "warning" : "success"}>
            {shop.is_queue_paused ? "Paused" : "Open"}
          </Badge>
        </div>

        <div className="flex items-center gap-4 pt-1.5 border-t border-slate-100 text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>{shop.queue_length} in queue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>~{shop.estimated_wait_minutes} min</span>
          </div>
        </div>
      </Card>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Uploader Box */}
      <Card padding="sm" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
            {items.length === 0 ? "Select Documents" : "Add More Documents"}
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">Max 50MB</span>
        </div>

        <PrintBatchUploader
          onFilesAdded={handleFilesAdded}
          isProcessing={isAnyProcessing}
          disabled={shop.is_queue_paused}
          compact={items.length > 0}
        />
      </Card>

      {/* Batch Header & Actions */}
      {items.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
            PRINT BATCH &bull; {items.length} {items.length === 1 ? "FILE" : "FILES"}
          </span>

          <div className="flex items-center gap-2">
            {readyItems.length > 1 && (
              <button
                type="button"
                onClick={() => setIsApplyAllOpen(true)}
                className="min-h-[44px] px-3 rounded-lg bg-slate-100 active:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                <span>Apply all</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-rose-600 flex items-center justify-center rounded-lg"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* File Batch List */}
      {items.length > 0 && (
        <div className="space-y-2.5">
          {items.map((item, idx) => (
            <FileBatchCard
              key={item.id}
              item={item}
              index={idx}
              totalCount={items.length}
              onConfigure={handleConfigure}
              onDuplicate={handleDuplicate}
              onRemove={handleRemove}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>
      )}

      {/* Sticky Bottom Bar (Section 10 Requirement) */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900">
                {readyItems.length} {readyItems.length === 1 ? "file" : "files"} &bull; ₹{totalAmountFormatted}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {pricingBreakdown?.total_pages ?? readyItems.reduce((acc, it) => acc + (it.page_count * it.copies), 0)} pages total
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              disabled={isAnyProcessing || readyItems.length === 0}
              className="min-h-[48px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Review &amp; Pay</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sheets */}
      <FileConfigSheet
        isOpen={isConfigOpen}
        item={activeConfigItem}
        shopPricing={shop?.pricing}
        onClose={() => {
          setIsConfigOpen(false);
          setActiveConfigItem(null);
        }}
        onSave={handleSaveConfig}
      />

      <ApplyAllSheet
        isOpen={isApplyAllOpen}
        fileCount={items.length}
        onClose={() => setIsApplyAllOpen(false)}
        onApply={handleApplyAll}
      />

      <DuplicateSheet
        isOpen={isDuplicateOpen}
        sourceItem={duplicateSource}
        allItems={items}
        onClose={() => {
          setIsDuplicateOpen(false);
          setDuplicateSource(null);
        }}
        onDuplicate={handleExecuteDuplicate}
      />

      <BatchReviewSheet
        isOpen={isReviewOpen}
        items={items}
        pricing={pricingBreakdown}
        isCalculatingPrice={isCalculatingPrice}
        isSubmitting={isSubmitting}
        onClose={() => setIsReviewOpen(false)}
        onPay={handleCheckoutAndPay}
        disabled={shop.is_queue_paused}
      />
    </div>
  );
}
