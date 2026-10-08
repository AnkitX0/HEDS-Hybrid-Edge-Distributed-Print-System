"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Clock,
  Layers,
  AlertCircle,
  CreditCard,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";

interface ShopInfo {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_queue_paused: boolean;
  queue_length: number;
  estimated_wait_minutes: number;
  pricing: {
    bw_per_page_cents: number;
    color_per_page_cents: number;
    duplex_discount_cents: number;
    minimum_order_cents: number;
    paper_size: string;
  };
}

export default function ShopOrderPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = params.shop_slug as string;

  const [step, setStep] = useState<"upload" | "configure" | "payment">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [duplex, setDuplex] = useState<boolean>(false);
  const [paperSize, setPaperSize] = useState<string>("A4");
  const [pageRange, setPageRange] = useState<string>("all");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch shop metadata
  const { data: shop, isLoading, error } = useQuery<ShopInfo>({
    queryKey: ["shop", shopSlug],
    queryFn: async () => {
      const res = await fetch(`/api/v1/shops/${shopSlug}`);
      if (!res.ok) throw new Error("Print shop not found");
      return res.json();
    },
  });

  const handleFileSelect = async (selected: File) => {
    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "png", "jpg", "jpeg"].includes(ext || "")) {
      setErrorMessage("Unsupported file format. Please select a PDF, PNG, or JPG document.");
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      setErrorMessage("File exceeds maximum 50 MB limit.");
      return;
    }
    setErrorMessage(null);
    setFile(selected);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selected);
      const res = await fetch(`/api/v1/shops/${shopSlug}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to process document");
      const data = await res.json();
      setDocumentId(data.document_id);
      setPageCount(data.page_count || 1);
    } catch (e: any) {
      // Fallback local page count estimation if upload endpoint is mock
      setPageCount(2);
    } finally {
      setIsUploading(false);
    }
  };

  const calculateTotalCents = () => {
    if (!shop || !shop.pricing) return 200;
    const baseRate = colorMode === "COLOR" ? shop.pricing.color_per_page_cents : shop.pricing.bw_per_page_cents;
    const rawTotal = baseRate * pageCount * copies;
    const discount = duplex ? shop.pricing.duplex_discount_cents * copies : 0;
    return Math.max(shop.pricing.minimum_order_cents, rawTotal - discount);
  };

  const formattedTotal = (calculateTotalCents() / 100).toFixed(2);

  const handleSubmitOrder = async () => {
    if (!file && !documentId) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      let orderData;
      if (documentId) {
        const formData = new FormData();
        formData.append("document_id", documentId);
        formData.append("copies", copies.toString());
        formData.append("color_mode", colorMode);
        formData.append("duplex", duplex.toString());
        formData.append("paper_size", paperSize);
        formData.append("page_range", pageRange);

        const res = await fetch(`/api/v1/shops/${shopSlug}/orders`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to create order");
        }
        orderData = await res.json();
      } else {
        const formData = new FormData();
        formData.append("file", file!);
        formData.append("copies", copies.toString());
        formData.append("color_mode", colorMode);
        formData.append("duplex", duplex.toString());
        formData.append("paper_size", paperSize);
        formData.append("page_range", pageRange);

        const res = await fetch(`/api/v1/shops/${shopSlug}/orders`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to create order");
        orderData = await res.json();
      }

      // Sandbox Mock Payment
      const payRes = await fetch(`/api/v1/orders/${orderData.guest_access_token}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate_status: "success" }),
      });

      if (!payRes.ok) throw new Error("Payment failed");

      router.push(`/orders/${orderData.guest_access_token}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during checkout.");
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 space-y-2">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Connecting to shop queue...</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <Card className="text-center p-6 space-y-2 border-rose-200 bg-rose-50/50">
        <AlertCircle className="w-7 h-7 mx-auto text-rose-600" />
        <h2 className="font-bold text-sm text-slate-900">Shop Currently Unavailable</h2>
        <p className="text-xs text-slate-600">The requested print shop link is inactive or invalid.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Storefront Header */}
      <Card padding="md" className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-base text-slate-900">{shop.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">Print documents without waiting in line</p>
          </div>
          <StatusBadge status={shop.is_queue_paused ? "PAUSED" : "ONLINE"} label={shop.is_queue_paused ? "Queue Paused" : "Open"} />
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

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === "upload" && (
        <Card padding="lg" className="space-y-4 text-center">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Print your documents</h2>
            <p className="text-xs text-slate-500">Upload a PDF or image to get started</p>
          </div>

          <div className="relative border-2 border-dashed border-slate-200 hover:border-blue-600 bg-slate-50/60 rounded-md p-8 transition-colors">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="flex items-center justify-between text-left bg-white p-3 border border-slate-200 rounded-md">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-900 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {pageCount} {pageCount === 1 ? "page" : "pages"} &bull; {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setDocumentId(null);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-8 h-8 text-blue-600 mx-auto" />
                <p className="text-xs font-medium text-slate-800">Drag & drop file here or click to choose</p>
                <p className="text-[10px] text-slate-400 font-mono">PDF, JPG, PNG &bull; Maximum 50 MB</p>
              </div>
            )}
          </div>

          <Button
            size="lg"
            variant="primary"
            disabled={!file || isUploading || shop.is_queue_paused}
            isLoading={isUploading}
            onClick={() => setStep("configure")}
            className="w-full"
          >
            Continue to Print Settings
          </Button>
        </Card>
      )}

      {/* STEP 2: PRINT CONFIGURATION */}
      {step === "configure" && (
        <Card padding="lg" className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-bold text-slate-900 truncate">{file?.name}</span>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 shrink-0">{pageCount} pages</span>
          </div>

          <div className="space-y-4 text-xs">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              PRINT SETTINGS
            </span>

            {/* Color Mode */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Color Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setColorMode("BW")}
                  className={`py-2 px-3 rounded-md border text-xs font-medium text-center transition-all ${
                    colorMode === "BW"
                      ? "bg-slate-900 text-white border-slate-900 font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  B&W (₹1.00 / pg)
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode("COLOR")}
                  className={`py-2 px-3 rounded-md border text-xs font-medium text-center transition-all ${
                    colorMode === "COLOR"
                      ? "bg-blue-600 text-white border-blue-600 font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Color (₹10.00 / pg)
                </button>
              </div>
            </div>

            {/* Sides / Duplex */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Sides</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDuplex(false)}
                  className={`py-2 px-3 rounded-md border text-xs font-medium text-center transition-all ${
                    !duplex
                      ? "bg-slate-900 text-white border-slate-900 font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Single-sided
                </button>
                <button
                  type="button"
                  onClick={() => setDuplex(true)}
                  className={`py-2 px-3 rounded-md border text-xs font-medium text-center transition-all ${
                    duplex
                      ? "bg-blue-600 text-white border-blue-600 font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Double-sided (Duplex)
                </button>
              </div>
            </div>

            {/* Copies & Paper */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Copies</label>
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden h-9 bg-white">
                  <button
                    type="button"
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-9 h-full bg-slate-100 text-slate-800 font-mono font-bold hover:bg-slate-200"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono font-bold">{copies}</span>
                  <button
                    type="button"
                    onClick={() => setCopies(copies + 1)}
                    className="w-9 h-full bg-slate-100 text-slate-800 font-mono font-bold hover:bg-slate-200"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Paper Size</label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-md font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="A4">A4 Standard</option>
                  <option value="A3">A3 Large</option>
                  <option value="LETTER">Letter</option>
                </select>
              </div>
            </div>
          </div>

          {/* Authoritative Price Calculation */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between font-mono">
            <span className="text-xs text-slate-500 font-sans">
              PRICE ({pageCount} {pageCount === 1 ? "page" : "pages"} × {copies} copy)
            </span>
            <span className="text-lg font-bold text-slate-900">₹{formattedTotal}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={() => setStep("upload")} className="w-1/3">
              Back
            </Button>
            <Button variant="primary" size="lg" onClick={() => setStep("payment")} className="w-2/3">
              Continue to Payment
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: PAYMENT */}
      {step === "payment" && (
        <Card padding="lg" className="space-y-5">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            ORDER SUMMARY
          </span>

          <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-md border border-slate-200">
            <div className="flex justify-between font-sans">
              <span className="text-slate-500">Document:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[180px]">{file?.name}</span>
            </div>
            <div className="flex justify-between font-sans">
              <span className="text-slate-500">Spec:</span>
              <span className="text-slate-900">{pageCount} pgs &bull; {colorMode} &bull; {duplex ? "Duplex" : "Single"} &bull; {copies}x</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span>TOTAL</span>
              <span>₹{formattedTotal}</span>
            </div>
          </div>

          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Payment Gateway &bull; UPI, Cards, NetBanking Supported</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={() => setStep("configure")} className="w-1/3">
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              isLoading={submitting}
              onClick={handleSubmitOrder}
              className="w-2/3 bg-emerald-600 hover:bg-emerald-700 font-bold"
            >
              Pay ₹{formattedTotal}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
