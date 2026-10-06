"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Clock,
  Layers,
  AlertCircle,
  CreditCard,
  Check,
  X,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [duplex, setDuplex] = useState<boolean>(false);
  const [paperSize, setPaperSize] = useState<string>("A4");
  const [pageRange, setPageRange] = useState<string>("all");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch shop metadata and queue state
  const { data: shop, isLoading, error } = useQuery<ShopInfo>({
    queryKey: ["shop", shopSlug],
    queryFn: async () => {
      const res = await fetch(`/api/v1/shops/${shopSlug}`);
      if (!res.ok) throw new Error("Print shop not found or inactive");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["pdf", "png", "jpg", "jpeg"];

    if (!ext || !validExtensions.includes(ext)) {
      setErrorMessage("Only PDF, PNG, and JPG files are supported.");
      return;
    }

    const maxSizeMb = 50;
    if (selectedFile.size > maxSizeMb * 1024 * 1024) {
      setErrorMessage(`Selected file is larger than the ${maxSizeMb} MB limit.`);
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Preview estimate calculation
  const calculateEstimatedTotal = () => {
    if (!shop || !shop.pricing) return 0;
    const baseRate =
      colorMode === "COLOR"
        ? shop.pricing.color_per_page_cents
        : shop.pricing.bw_per_page_cents;
    // Estimate 2 pages as baseline preview before server-side PDF inspection
    const estimatedPages = 2;
    const rawTotal = baseRate * estimatedPages * copies;
    const duplexDiscount = duplex ? shop.pricing.duplex_discount_cents * copies : 0;
    const subtotal = Math.max(shop.pricing.minimum_order_cents, rawTotal - duplexDiscount);
    return subtotal / 100;
  };

  const handleSubmitOrder = async () => {
    if (!file) {
      setErrorMessage("Please select a document to print.");
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

      // Complete sandbox payment
      const payRes = await fetch(`/api/v1/orders/${orderData.guest_access_token}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate_status: "success" }),
      });

      if (!payRes.ok) {
        throw new Error("Sandbox payment execution failed.");
      }

      // Route directly to real-time order tracking
      router.push(`/orders/${orderData.guest_access_token}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit print order.");
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 space-y-2">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-xs">Connecting to shop queue...</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="p-4 bg-white rounded-md border border-red-200 text-center space-y-2">
        <AlertCircle className="w-6 h-6 mx-auto text-red-500" />
        <h2 className="text-sm font-semibold text-slate-900">Shop Unavailable</h2>
        <p className="text-xs text-slate-600">
          This shop URL is invalid or inactive. Please scan the QR counter code again.
        </p>
      </div>
    );
  }

  const bwRateRupees = ((shop.pricing?.bw_per_page_cents || 200) / 100).toFixed(2);
  const colorRateRupees = ((shop.pricing?.color_per_page_cents || 1000) / 100).toFixed(2);
  const duplexDiscountRupees = ((shop.pricing?.duplex_discount_cents || 50) / 100).toFixed(2);

  return (
    <div className="space-y-4">
      {/* 1. Shop Header Card (Directive 11) */}
      <div className="bg-white rounded-md border border-slate-200 p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-sm font-semibold text-slate-900">{shop.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Print documents without waiting in line.
            </p>
          </div>
          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded border ${
              shop.is_queue_paused
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {shop.is_queue_paused ? "Queue Paused" : "Open"}
          </span>
        </div>

        {/* Operational Queue Summary */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-100">
            <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">Current Queue</span>
              <span className="font-semibold text-slate-800">
                {shop.queue_length} {shop.queue_length === 1 ? "job" : "jobs"} processing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">Estimated Wait</span>
              <span className="font-semibold text-slate-800">
                ~{shop.estimated_wait_minutes} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Document Upload Area (Directive 12) */}
      <div className="bg-white rounded-md border border-slate-200 p-4 space-y-2.5">
        <span className="text-xs font-semibold text-slate-900 block">
          Document Upload
        </span>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-md p-5 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50/50"
              : file
              ? "border-slate-300 bg-slate-50/70"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
            id="student-file-input"
          />

          {file ? (
            <div className="flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-slate-200 rounded text-slate-700 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {(file.size / 1024).toFixed(1)} KB &bull; {file.type || "document"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Remove document"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-medium text-slate-700">
                Tap to upload or drag file here
              </p>
              <p className="text-[11px] text-slate-400">
                Supported formats: PDF, PNG, JPG (up to 50 MB)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Print Configuration (Directive 13: Segmented Controls) */}
      <div className="bg-white rounded-md border border-slate-200 p-4 space-y-3.5">
        <span className="text-xs font-semibold text-slate-900 block">
          Print Configuration
        </span>

        {/* Color Mode Segmented Control */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-600 block">Color Mode</label>
          <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setColorMode("BW")}
              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                colorMode === "BW"
                  ? "bg-white text-slate-900 font-semibold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Black & White (₹{bwRateRupees}/pg)
            </button>
            <button
              type="button"
              onClick={() => setColorMode("COLOR")}
              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                colorMode === "COLOR"
                  ? "bg-white text-slate-900 font-semibold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Full Color (₹{colorRateRupees}/pg)
            </button>
          </div>
        </div>

        {/* Sides Segmented Control */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-600 block">Sides</label>
          <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setDuplex(false)}
              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                !duplex
                  ? "bg-white text-slate-900 font-semibold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Single-sided
            </button>
            <button
              type="button"
              onClick={() => setDuplex(true)}
              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                duplex
                  ? "bg-white text-slate-900 font-semibold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Double-sided (-₹{duplexDiscountRupees})
            </button>
          </div>
        </div>

        {/* Copies Stepper & Paper Size */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-[11px] font-medium text-slate-600 block mb-1">Copies</label>
            <div className="flex items-center border border-slate-200 rounded-md bg-white">
              <button
                type="button"
                onClick={() => setCopies(Math.max(1, copies - 1))}
                className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-l"
                aria-label="Decrease copies"
              >
                &minus;
              </button>
              <span className="flex-1 text-center text-xs font-semibold text-slate-900">
                {copies}
              </span>
              <button
                type="button"
                onClick={() => setCopies(copies + 1)}
                className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-r"
                aria-label="Increase copies"
              >
                &#43;
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-600 block mb-1">Paper Size</label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              className="w-full text-xs font-medium py-1.5 px-2 rounded-md border border-slate-200 bg-white text-slate-900"
            >
              <option value="A4">A4 (Standard)</option>
              <option value="A3">A3 (Large)</option>
              <option value="LETTER">Letter</option>
            </select>
          </div>
        </div>

        {/* Page Range Input */}
        <div>
          <label className="text-[11px] font-medium text-slate-600 block mb-1">Page Range</label>
          <input
            type="text"
            value={pageRange}
            onChange={(e) => setPageRange(e.target.value)}
            placeholder="all or 1-5"
            className="w-full text-xs font-medium py-1.5 px-2.5 rounded-md border border-slate-200 bg-white text-slate-900"
          />
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Leave as &quot;all&quot; or specify ranges (e.g. 1-3, 5)
          </span>
        </div>
      </div>

      {/* 4. Authoritative Price Summary & Checkout (Directive 14 & 15) */}
      <div className="bg-white rounded-md border border-slate-200 p-4 space-y-3">
        <span className="text-xs font-semibold text-slate-900 block">
          Price Summary
        </span>

        <div className="space-y-1.5 text-xs text-slate-600 border-b border-slate-100 pb-2.5">
          <div className="flex justify-between">
            <span>Document</span>
            <span className="font-medium text-slate-900 truncate max-w-[180px]">
              {file ? file.name : "No file selected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Color / Sides</span>
            <span className="text-slate-900">
              {colorMode === "BW" ? "Black & White" : "Color"} &bull;{" "}
              {duplex ? "Double-sided" : "Single-sided"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Copies</span>
            <span className="text-slate-900">{copies} copy</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xs font-semibold text-slate-900">Estimated Total</span>
          <span className="text-base font-bold text-slate-900">
            ₹{calculateEstimatedTotal().toFixed(2)}
          </span>
        </div>

        <p className="text-[10px] text-slate-400 leading-tight">
          Exact price is authoritatively calculated on server upload based on verified PDF page count. Minimum order ₹{(shop.pricing.minimum_order_cents / 100).toFixed(2)}.
        </p>

        {/* Sandbox Payment Notice (Directive 15) */}
        <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700 block">Development Environment:</span>
          Payment is routed through the HEDS Sandbox Gateway (mock transaction).
        </div>

        <button
          type="button"
          disabled={!file || submitting || shop.is_queue_paused}
          onClick={handleSubmitOrder}
          className={`w-full py-2.5 rounded-md font-semibold text-xs flex items-center justify-center gap-2 transition-colors ${
            !file || submitting || shop.is_queue_paused
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {submitting ? (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying & Placing Order...</span>
            </div>
          ) : (
            <>
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay ₹{calculateEstimatedTotal().toFixed(2)} & Print</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
