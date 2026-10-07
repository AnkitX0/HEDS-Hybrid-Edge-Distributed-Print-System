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
  RotateCw,
  Printer,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";

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

export default function StudentShopPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = params.shop_slug as string;

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(3);
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [duplex, setDuplex] = useState<boolean>(false);
  const [paperSize, setPaperSize] = useState<string>("A4");
  const [pageRangeMode, setPageRangeMode] = useState<"all" | "custom">("all");
  const [customPageRange, setCustomPageRange] = useState<string>("");
  const [orientation, setOrientation] = useState<"PORTRAIT" | "LANDSCAPE">("PORTRAIT");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch shop metadata and queue state
  const {
    data: shop,
    isLoading,
    error,
    refetch,
  } = useQuery<ShopInfo>({
    queryKey: ["shop", shopSlug],
    queryFn: async () => {
      return apiClient.get<ShopInfo>(`/api/v1/shops/${shopSlug}`);
    },
    refetchInterval: 5000,
  });

  const loadSampleDocument = async () => {
    try {
      const res = await fetch("/sample-print.pdf");
      const blob = await res.blob();
      const sampleFile = new File([blob], "sample-assignment.pdf", {
        type: "application/pdf",
      });
      setFile(sampleFile);
      setPageCount(3);
      setErrorMessage(null);
    } catch (e) {
      console.error("Failed to load sample document", e);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["pdf", "png", "jpg", "jpeg"];

    if (!ext || !validExtensions.includes(ext)) {
      setErrorMessage("Only PDF, PNG, and JPG files are supported.");
      return;
    }

    const maxSizeMb = 50;
    if (selectedFile.size > maxSizeMb * 1024 * 1024) {
      setErrorMessage(`File exceeds the maximum ${maxSizeMb} MB limit.`);
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);
    // Default estimated page count until backend server parses authoritative PDF
    setPageCount(3);
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

  // Preview estimate calculation in Rupees
  const calculateEstimatedTotal = () => {
    if (!shop || !shop.pricing) return 0;
    const baseRate =
      colorMode === "COLOR"
        ? shop.pricing.color_per_page_cents
        : shop.pricing.bw_per_page_cents;
    const effectivePages = file ? pageCount : 3;
    const rawTotal = baseRate * effectivePages * copies;
    const duplexDiscount = duplex
      ? (shop.pricing.duplex_discount_cents || 0) * copies
      : 0;
    const subtotal = Math.max(
      shop.pricing.minimum_order_cents || 0,
      rawTotal - duplexDiscount
    );
    return subtotal / 100;
  };

  const handleSubmitOrder = async () => {
    if (!file) {
      setErrorMessage("Please select or upload a document first.");
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
      formData.append(
        "page_range",
        pageRangeMode === "custom" && customPageRange.trim()
          ? customPageRange.trim()
          : "all"
      );

      const orderData = await apiClient.upload<any>(
        `/api/v1/shops/${shopSlug}/orders`,
        formData
      );

      // Complete simulated payment
      await apiClient.post<any>(
        `/api/v1/orders/${orderData.guest_access_token}/payment`,
        { simulate_status: "success" }
      );

      // Route directly to real-time order tracking
      router.push(`/orders/${orderData.guest_access_token}`);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === "NETWORK_ERROR" || err.status === 503) {
          setErrorMessage(
            "Cannot connect to print server. Please retry in a few moments."
          );
        } else {
          setErrorMessage(err.message || "Failed to process order.");
        }
      } else {
        setErrorMessage(err.message || "Failed to submit print order.");
      }
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 space-y-3">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Connecting to Xerox shop...</p>
      </div>
    );
  }

  if (error || !shop) {
    const apiErr = error instanceof ApiError ? error : null;
    const isNotFound = apiErr?.status === 404 || apiErr?.code === "NOT_FOUND";
    const isConnError =
      apiErr?.code === "NETWORK_ERROR" ||
      apiErr?.code === "BACKEND_UNAVAILABLE" ||
      apiErr?.status === 503;

    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200 text-center space-y-4 shadow-sm my-6">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
            isNotFound ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"
          }`}
        >
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {isNotFound
              ? "Shop Not Found"
              : isConnError
              ? "Cannot Connect to Print Cluster"
              : "Shop Unavailable"}
          </h2>
          <p className="text-xs text-slate-600 mt-1.5 max-w-xs mx-auto leading-relaxed">
            {isNotFound
              ? `We could not find a registered print shop matching "${shopSlug}". Please re-scan the QR code at the shop counter.`
              : isConnError
              ? "Unable to reach the HEDS backend service. If running with Docker, please verify the backend container is healthy."
              : "This shop is temporarily unable to accept new print jobs. Please check with the operator."}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const bwRate = ((shop.pricing?.bw_per_page_cents || 200) / 100).toFixed(2);
  const colorRate = ((shop.pricing?.color_per_page_cents || 1000) / 100).toFixed(2);
  const estimatedTotal = calculateEstimatedTotal();

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Shop Identity Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {shop.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Fast Contactless Campus Printing
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              shop.is_queue_paused
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                shop.is_queue_paused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
              }`}
            />
            {shop.is_queue_paused ? "Queue Paused" : "Counter Open"}
          </span>
        </div>

        {/* Live Shop Stats Pill */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center font-mono">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
              B&W
            </span>
            <span className="font-bold text-slate-800 text-xs">₹{bwRate}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
              Color
            </span>
            <span className="font-bold text-indigo-600 text-xs">₹{colorRate}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
              Wait
            </span>
            <span className="font-bold text-slate-800 text-xs">
              ~{shop.estimated_wait_minutes || 2}m
            </span>
          </div>
        </div>
      </div>

      {/* 2. Upload Experience Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            1. Document
          </span>
          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            No Account Needed
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange}
        />

        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center space-y-2 transition-all duration-200 ${
              isDragging
                ? "border-indigo-600 bg-indigo-50/50 scale-[0.99]"
                : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/60"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Tap to upload your file
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                PDF, JPG or PNG (up to 50MB)
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSampleDocument();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Use Sample PDF (3 pages)
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center justify-between gap-3 animate-float">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {file.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {pageCount} {pageCount === 1 ? "page" : "pages"} &bull;{" "}
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 bg-white border border-slate-200 rounded-md hover:bg-red-50 transition-colors"
            >
              Change
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Print Configuration Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-indigo-600" />
          2. Print Settings
        </span>

        {/* Color Mode Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Color Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setColorMode("BW")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                colorMode === "BW"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>Black & White</span>
              <span className="text-[10px] opacity-80">₹{bwRate}</span>
            </button>
            <button
              type="button"
              onClick={() => setColorMode("COLOR")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                colorMode === "COLOR"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>Full Color</span>
              <span className="text-[10px] opacity-80">₹{colorRate}</span>
            </button>
          </div>
        </div>

        {/* Duplex / Sides Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700">Printing Sides</label>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              Eco Savings
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDuplex(false)}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                !duplex
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Single-Sided
            </button>
            <button
              type="button"
              onClick={() => setDuplex(true)}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                duplex
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Both Sides (Duplex)
            </button>
          </div>
        </div>

        {/* Copies Stepper & Paper Size Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Copies Stepper */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Copies</label>
            <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setCopies(Math.max(1, copies - 1))}
                className="w-10 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-sm active:bg-slate-200"
              >
                &minus;
              </button>
              <span className="flex-1 text-center font-bold text-xs text-slate-900">
                {copies}
              </span>
              <button
                type="button"
                onClick={() => setCopies(copies + 1)}
                className="w-10 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-sm active:bg-slate-200"
              >
                +
              </button>
            </div>
          </div>

          {/* Paper Size */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Paper Size</label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="A4">A4 (Standard)</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
          </div>
        </div>

        {/* Page Range Selection */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-medium text-slate-700">Page Selection</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPageRangeMode("all")}
              className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                pageRangeMode === "all"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              All Pages
            </button>
            <button
              type="button"
              onClick={() => setPageRangeMode("custom")}
              className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                pageRangeMode === "custom"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              Custom Range
            </button>
          </div>
          {pageRangeMode === "custom" && (
            <input
              type="text"
              placeholder="e.g. 1-3, 5"
              value={customPageRange}
              onChange={(e) => setCustomPageRange(e.target.value)}
              className="w-full h-9 px-3 mt-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
            />
          )}
        </div>
      </div>

      {/* 4. Live Authoritative Price & Checkout Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">
              Authoritative Total
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black tracking-tight">
                ₹{estimatedTotal.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">INR</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
            className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 font-medium"
          >
            <span>Breakdown</span>
            {showPriceBreakdown ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {showPriceBreakdown && (
          <div className="pt-2 border-t border-slate-800 text-xs space-y-1 font-mono text-slate-300">
            <div className="flex justify-between">
              <span>Pages & Copies:</span>
              <span>
                {pageCount}p &times; {copies} {copies === 1 ? "copy" : "copies"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Mode Rate:</span>
              <span>₹{colorMode === "COLOR" ? colorRate : bwRate} / page</span>
            </div>
            {duplex && (
              <div className="flex justify-between text-emerald-400">
                <span>Duplex Discount:</span>
                <span>Active</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmitOrder}
          disabled={submitting || !file || shop.is_queue_paused}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
            submitting || !file || shop.is_queue_paused
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-indigo-500 hover:bg-indigo-400 text-white active:scale-[0.99]"
          }`}
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Placing in Queue...</span>
            </>
          ) : shop.is_queue_paused ? (
            <span>Queue Temporarily Paused</span>
          ) : !file ? (
            <span>Upload Document to Continue</span>
          ) : (
            <>
              <span>Pay ₹{estimatedTotal.toFixed(2)} & Print</span>
              <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
