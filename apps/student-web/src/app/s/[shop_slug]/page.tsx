"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Clock,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Trash2,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import {
  BatchDocumentItem,
  BatchPricingBreakdown,
  ShopInfo,
} from "@/components/batch/types";
import { PrintBatchUploader } from "@/components/batch/PrintBatchUploader";
import { FileBatchCard } from "@/components/batch/FileBatchCard";
import { FileConfigModal } from "@/components/batch/FileConfigModal";
import {
  ApplyAllModal,
  BatchSettingsPayload,
} from "@/components/batch/ApplyAllModal";
import { DuplicateSettingsModal } from "@/components/batch/DuplicateSettingsModal";
import { BatchSummaryCard } from "@/components/batch/BatchSummaryCard";

export default function ShopOrderPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = params.shop_slug as string;

  // Batch State
  const [items, setItems] = useState<BatchDocumentItem[]>([]);
  const [activeConfigItem, setActiveConfigItem] = useState<BatchDocumentItem | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isApplyAllOpen, setIsApplyAllOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<BatchDocumentItem | null>(null);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);

  // Quote & Checkout State
  const [pricingBreakdown, setPricingBreakdown] = useState<BatchPricingBreakdown | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Fetch shop metadata
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

  // Clear success toast after 3 seconds
  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(null), 3000);
    return () => clearTimeout(timer);
  }, [successToast]);

  // Recalculate authoritative batch pricing whenever ready items change
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

        // Update each item's calculated price locally
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

  // Upload handler for adding files (appends to batch)
  const handleFilesAdded = async (newFiles: File[]) => {
    if (!newFiles.length) return;
    setErrorMessage(null);

    // Create client items with temporary client IDs
    const newItems: BatchDocumentItem[] = newFiles.map((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isImg = ["jpg", "jpeg", "png", "webp"].includes(ext);

      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        mime_type: file.type,
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

    const updatedBatch = [...items, ...newItems];
    setItems(updatedBatch);

    // Upload files sequentially or in batch to backend
    const formData = new FormData();
    newFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await fetch(`/api/v1/shops/${shopSlug}/documents/upload-multiple`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to process files");
      }

      const resData = await res.json();
      const serverDocs: any[] = resData.documents || [];

      // Reconcile each newly added file
      setItems((prevItems) => {
        const next = prevItems.map((item) => {
          // Check if this item is one of our newly added files
          const matchingUploaded = serverDocs.find(
            (sd) => sd.filename === item.name && item.status === "UPLOADING"
          );

          if (matchingUploaded) {
            if (matchingUploaded.status === "ERROR") {
              return {
                ...item,
                status: "ERROR" as const,
                error: matchingUploaded.error || "Unable to process document",
              };
            }
            return {
              ...item,
              document_id: matchingUploaded.document_id || matchingUploaded.id,
              page_count: matchingUploaded.page_count || 1,
              status: "READY" as const,
              error: undefined,
            };
          }
          return item;
        });

        // Trigger authoritative pricing quote calculation
        refreshQuote(next);
        return next;
      });
    } catch (err: any) {
      // Mark newly added items as ERROR
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (newItems.some((ni) => ni.id === item.id)) {
            return {
              ...item,
              status: "ERROR",
              error: err.message || "Failed to upload document",
            };
          }
          return item;
        })
      );
      setErrorMessage(err.message || "Failed to upload files.");
    }
  };

  // Remove file
  const handleRemoveItem = (itemToRemove: BatchDocumentItem) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== itemToRemove.id);
      refreshQuote(next);
      return next;
    });
  };

  // Reorder files: Move up
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

  // Reorder files: Move down
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

  // Open Configure Modal
  const handleConfigureClick = (item: BatchDocumentItem) => {
    setActiveConfigItem(item);
    setIsConfigModalOpen(true);
  };

  // Save Configured Settings
  const handleSaveConfig = (updated: BatchDocumentItem) => {
    setItems((prev) => {
      const next = prev.map((it) => (it.id === updated.id ? updated : it));
      refreshQuote(next);
      return next;
    });
    setSuccessToast(`Updated settings for "${updated.name}"`);
  };

  // Open Duplicate Modal
  const handleDuplicateClick = (item: BatchDocumentItem) => {
    setDuplicateSource(item);
    setIsDuplicateOpen(true);
  };

  // Execute Duplicate Settings
  const handleExecuteDuplicate = (
    source: BatchDocumentItem,
    targetIds: string[]
  ) => {
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
          // Safely preserve target page range unless it was 'all'
          page_range_mode: "all" as const,
          page_range: "all",
        };
      });
      refreshQuote(next);
      return next;
    });
    setSuccessToast(`Settings copied to ${targetIds.length} file(s)`);
  };

  // Execute Batch-level Apply to All
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
          scaling: settings.scaling !== undefined ? settings.scaling : it.scaling,
        };
      });
      refreshQuote(next);
      return next;
    });
    setSuccessToast(`Applied settings to all ${items.length} files`);
  };

  // Clear all
  const handleClearAll = () => {
    setItems([]);
    setPricingBreakdown(null);
    setErrorMessage(null);
  };

  // Checkout and Order Creation
  const handleCheckout = async () => {
    const readyItems = items.filter((it) => it.status === "READY" && it.document_id);
    if (!readyItems.length || !shop) {
      setErrorMessage("Please ensure at least one document is ready for printing before checkout.");
      return;
    }

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
        throw new Error(errJson.detail || "Failed to create batch order");
      }

      const orderData = await res.json();
      const guestToken = orderData.guest_access_token;

      if (!guestToken) {
        throw new Error("Missing guest order token from server");
      }

      // Execute Mock/Sandbox Payment
      const payRes = await fetch(`/api/v1/orders/${guestToken}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate_status: "success" }),
      });

      if (!payRes.ok) {
        throw new Error("Payment execution failed");
      }

      // Navigate to order tracking page
      router.push(`/orders/${guestToken}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during checkout.");
      setIsSubmitting(false);
    }
  };

  if (isShopLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 space-y-2">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Connecting to shop queue...</p>
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <Card className="text-center p-6 space-y-2 border-rose-200 bg-rose-50/50 max-w-lg mx-auto">
        <AlertCircle className="w-7 h-7 mx-auto text-rose-600" />
        <h2 className="font-bold text-sm text-slate-900">Shop Currently Unavailable</h2>
        <p className="text-xs text-slate-600">The requested print shop link is inactive or invalid.</p>
      </Card>
    );
  }

  const readyCount = items.filter((it) => it.status === "READY").length;
  const isAnyProcessing = items.some(
    (it) => it.status === "UPLOADING" || it.status === "PROCESSING"
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto px-4 py-2">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Storefront Header */}
      <Card padding="md" className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-base md:text-lg text-slate-900">{shop.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-document print batches &bull; Independent print configurations
            </p>
          </div>
          <StatusBadge
            status={shop.is_queue_paused ? "PAUSED" : "ONLINE"}
            label={shop.is_queue_paused ? "Queue Paused" : "Open"}
          />
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>{shop.queue_length} jobs in queue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>~{shop.estimated_wait_minutes} min wait</span>
          </div>
        </div>
      </Card>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Two-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Uploader & File Batch List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Uploader Box */}
          <Card padding="md" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {items.length === 0 ? "Upload Documents" : "Add More Documents"}
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Max 50MB per file
              </span>
            </div>

            <PrintBatchUploader
              onFilesAdded={handleFilesAdded}
              isProcessing={isAnyProcessing}
              disabled={shop.is_queue_paused}
              compact={items.length > 0}
            />
          </Card>

          {/* Batch Management Toolbar */}
          {items.length > 0 && (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  PRINT BATCH &bull; {items.length} {items.length === 1 ? "FILE" : "FILES"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {readyCount > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsApplyAllOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                    <span>Apply to all</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}

          {/* File Cards List */}
          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <FileBatchCard
                  key={item.id}
                  item={item}
                  index={idx}
                  totalCount={items.length}
                  onConfigure={handleConfigureClick}
                  onDuplicate={handleDuplicateClick}
                  onRemove={handleRemoveItem}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Sticky Order Summary & Checkout (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-5 space-y-4">
          <BatchSummaryCard
            items={items}
            pricing={pricingBreakdown}
            isCalculatingPrice={isCalculatingPrice}
            isSubmitting={isSubmitting}
            onCheckout={handleCheckout}
            disabled={shop.is_queue_paused}
          />
        </div>
      </div>

      {/* Modals */}
      <FileConfigModal
        isOpen={isConfigModalOpen}
        item={activeConfigItem}
        shopPricing={shop?.pricing}
        onClose={() => {
          setIsConfigModalOpen(false);
          setActiveConfigItem(null);
        }}
        onSave={handleSaveConfig}
      />

      <ApplyAllModal
        isOpen={isApplyAllOpen}
        fileCount={items.length}
        onClose={() => setIsApplyAllOpen(false)}
        onApply={handleApplyAll}
      />

      <DuplicateSettingsModal
        isOpen={isDuplicateOpen}
        sourceItem={duplicateSource}
        allItems={items}
        onClose={() => {
          setIsDuplicateOpen(false);
          setDuplicateSource(null);
        }}
        onDuplicate={handleExecuteDuplicate}
      />
    </div>
  );
}
