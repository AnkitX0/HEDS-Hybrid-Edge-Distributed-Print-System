"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Printer,
} from "lucide-react";

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

  const [file, setFile] = useState<File | null>(null);
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [duplex, setDuplex] = useState<boolean>(false);
  const [paperSize, setPaperSize] = useState<string>("A4");
  const [pageRange, setPageRange] = useState<string>("all");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "png", "jpg", "jpeg"].includes(ext || "")) {
        setErrorMessage("Only PDF, PNG, and JPG files are supported.");
        return;
      }
      setErrorMessage(null);
      setFile(selected);
    }
  };

  const calculatePreviewPrice = () => {
    if (!shop || !shop.pricing) return 0;
    const baseRate =
      colorMode === "COLOR"
        ? shop.pricing.color_per_page_cents
        : shop.pricing.bw_per_page_cents;
    // Estimate 2 pages before upload inspection
    const estimatedPages = 2;
    const rawTotal = baseRate * estimatedPages * copies;
    const duplexDiscount = duplex ? shop.pricing.duplex_discount_cents * copies : 0;
    const subtotal = Math.max(shop.pricing.minimum_order_cents, rawTotal - duplexDiscount);
    return subtotal / 100;
  };

  const handleSubmitOrder = async () => {
    if (!file) {
      setErrorMessage("Please select or drop a document to print.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
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
        throw new Error(err.detail || err.error?.message || "Failed to create order");
      }

      const orderData = await res.json();

      // Proceed immediately to Mock Payment
      const payRes = await fetch(`/api/v1/orders/${orderData.guest_access_token}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate_status: "success" }),
      });

      if (!payRes.ok) {
        throw new Error("Payment simulation failed");
      }

      // Redirect to live tracking
      router.push(`/orders/${orderData.guest_access_token}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred");
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Connecting to print shop...</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
        <h2 className="font-bold text-base">Shop Unavailable</h2>
        <p className="text-sm mt-1">This print shop QR code is invalid or deactivated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Shop Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-slate-900 text-base">{shop.name}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Ready to print &bull; Slug: {shop.slug}
            </p>
          </div>
          {shop.is_queue_paused && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
              Queue Paused
            </span>
          )}
        </div>

        {/* Live Wait Stats */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg">
            <Layers className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Queue Depth</span>
              <span className="text-xs font-bold text-slate-800">{shop.queue_length} jobs waiting</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Estimated Wait</span>
              <span className="text-xs font-bold text-slate-800">~{shop.estimated_wait_minutes} mins</span>
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Document Upload Area */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          1. Upload Document
        </label>

        <div className="relative border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-5 text-center transition-all bg-slate-50/50">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id="file-upload"
          />
          {file ? (
            <div className="flex items-center justify-center space-x-3 text-left">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{file.name}</p>
                <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB &bull; Selected</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-slate-700">Tap to upload PDF, PNG or JPG</p>
              <p className="text-[10px] text-slate-400">Max file size 50 MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Print Configuration Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          2. Print Settings
        </label>

        {/* Color Mode Selector */}
        <div>
          <span className="text-xs font-medium text-slate-700 block mb-1.5">Color Mode</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setColorMode("BW")}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                colorMode === "BW"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>Black & White</span>
              <span className="text-[10px] opacity-75 font-normal">(₹2/pg)</span>
            </button>
            <button
              type="button"
              onClick={() => setColorMode("COLOR")}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                colorMode === "COLOR"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>Color</span>
              <span className="text-[10px] opacity-75 font-normal">(₹10/pg)</span>
            </button>
          </div>
        </div>

        {/* Duplex Toggle & Copies */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Copies</label>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setCopies(Math.max(1, copies - 1))}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                -
              </button>
              <span className="flex-1 text-center text-xs font-bold">{copies}</span>
              <button
                type="button"
                onClick={() => setCopies(copies + 1)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Sides</label>
            <button
              type="button"
              onClick={() => setDuplex(!duplex)}
              className={`w-full py-2 px-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                duplex
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              {duplex ? "Duplex (2-sided)" : "Simplex (1-sided)"}
            </button>
          </div>
        </div>

        {/* Paper Size & Page Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Paper Size</label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              className="w-full text-xs font-medium p-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="A4">A4 (Standard)</option>
              <option value="A3">A3 (Large)</option>
              <option value="LETTER">Letter</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Page Range</label>
            <input
              type="text"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="all or 1-5"
              className="w-full text-xs font-medium p-2 rounded-lg border border-slate-200 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Price Breakdown & Checkout Action */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Estimated Total</span>
          <span className="text-lg font-bold text-slate-900">
            ₹{calculatePreviewPrice().toFixed(2)}
          </span>
        </div>
        <p className="text-[10px] text-slate-400">
          Authoritative price will be verified on backend based on exact page count.
        </p>

        <button
          type="button"
          disabled={!file || submitting || shop.is_queue_paused}
          onClick={handleSubmitOrder}
          className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
            !file || submitting || shop.is_queue_paused
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98]"
          }`}
        >
          {submitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing Order & Payment...</span>
            </div>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>Pay & Join Queue</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
